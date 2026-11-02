import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { RequestListener } from 'node:http'
let db: DatabaseSync | undefined
function database(){
 if(!db){mkdirSync('data',{recursive:true});db=new DatabaseSync('data/general-office.sqlite');db.exec("CREATE TABLE IF NOT EXISTS work (id TEXT PRIMARY KEY, data TEXT NOT NULL)");for(const row of db.prepare('SELECT id,data FROM work').all()){const task=JSON.parse(String(row.data));if(task.status==='running'){task.status='interrupted';db.prepare('UPDATE work SET data=? WHERE id=?').run(JSON.stringify(task),String(row.id))}}}
 return db
}
export const generalHandler: RequestListener = async(req,res)=>{
 const origin=req.headers.origin
 if(origin&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)){res.writeHead(403).end();return}
 res.setHeader('Cache-Control','no-store')
 if(req.url!=='/api/work'){res.writeHead(404).end();return}
 if(req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(database().prepare('SELECT data FROM work ORDER BY rowid DESC LIMIT 100').all().map(r=>JSON.parse(String(r.data)))));return}
 if(req.method!=='POST'){res.writeHead(405).end();return}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000)
 res.on('close',()=>controller.abort())
 let task: {id:string;request:string;config:Record<string,string>;status:string;result:string;messages:{role:string;content:string}[];updatedAt:string}|undefined
 const save=()=>{if(task){task.updatedAt=new Date().toISOString();database().prepare('INSERT INTO work VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(task.id,JSON.stringify(task))}}
 const emit=(value:unknown)=>{if(!res.destroyed)res.write(JSON.stringify(value)+'\n')}
 try{
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw Error('Solicitud demasiado larga')}
 const body=JSON.parse(raw)
 if(typeof body.request!=='string'||!body.request.trim()||body.request.length>12000)throw Error('Describe la tarea (máximo 12000 caracteres).')
 const config=body.config
 if(!config||!['characters','sector','objective'].every(k=>typeof config[k]==='string'&&config[k].trim()&&config[k].length<=1000))throw Error('Completa la configuración de la oficina.')
 task={id:randomUUID(),request:body.request,config,status:'running',result:'',messages:[],updatedAt:''};save()
 res.writeHead(200,{'Content-Type':'application/x-ndjson'})
 emit({type:'task',task})
 const roles=['Coordinación','Análisis','Ejecución','Revisión']
 for(let step=0;step<roles.length;step++){
 emit({type:'stage',step})
 const response=await fetch(`${process.env.OLLAMA_URL||'http://127.0.0.1:11434'}/api/chat`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OLLAMA_MODEL||'qwen2.5-coder:7b',stream:false,messages:[{role:'system',content:`Eres parte de una oficina general. Responde en español. Configuración: ${JSON.stringify(config)}. Tu función: ${roles[step]}. Comprende la solicitud, organiza, ejecuta y verifica según tu función. No impongas tarifas, impuestos, temarios ni reglas de MiDev. Pregunta solo por información indispensable. No inventes datos ni afirmes acciones externas que no ejecutaste. En revisión entrega el resultado completo y útil, incorporando las correcciones. Puedes redactar, analizar y programar; no tienes herramientas externas.`},{role:'user',content:task.request},...task.messages]})})
 if(!response.ok)throw Error('Ollama no pudo responder. Comprueba el modelo y la conexión.')
 const data=await response.json() as {message?:{content?:string}}
 const content=data.message?.content?.trim();if(!content)throw Error('El modelo devolvió una respuesta vacía.')
 task.messages.push({role:'assistant',content:`${roles[step]}: ${content}`});task.result=content;save();emit({type:'message',agent:roles[step],content})
 }
 task.status='ready';save();emit({type:'done',task})
 }catch(e){const message=controller.signal.aborted?'Solicitud interrumpida o tiempo agotado. Puedes retomarla.':e instanceof Error?e.message:'Error de conexión';if(task){task.status=controller.signal.aborted?'interrupted':'error';save()}emit({type:'error',message})}finally{clearTimeout(timer);res.end()}
}
