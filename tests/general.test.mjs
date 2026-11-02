import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generalHandler } from '../server/general.ts'

test('general office validates configuration and stores a reviewed result without commercial rules',async()=>{
 const cwd=process.cwd(),originalFetch=globalThis.fetch
 process.chdir(mkdtempSync(join(tmpdir(),'general-office-test-')))
 const server=createServer(generalHandler)
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const url=`http://127.0.0.1:${server.address().port}/api/work`
 const prompts=[]
 globalThis.fetch=async(input,options)=>{
  if(String(input).includes('/api/chat')){prompts.push(JSON.parse(options.body));return new Response(JSON.stringify({message:{content:'Resultado revisado de la tarea'}}))}
  return originalFetch(input,options)
 }
 try{
  const bad=await originalFetch(url,{method:'POST',body:JSON.stringify({request:'Una tarea',config:{}})})
  assert.match(await bad.text(),/Completa la configuración/)
  const response=await originalFetch(url,{method:'POST',body:JSON.stringify({request:'Redacta una bienvenida',config:{characters:'Personas',sector:'Diseño',objective:'Crear textos'}})})
  const events=(await response.text()).trim().split('\n').map(JSON.parse)
  assert.equal(events.at(-1).type,'done')
  assert.equal(prompts.length,4)
  assert.match(prompts[0].messages[0].content,/No impongas tarifas/)
  const tasks=await (await originalFetch(url)).json()
  assert.equal(tasks[0].status,'ready')
  assert.equal(tasks[0].messages.length,4)
  assert.equal(tasks[0].result,'Resultado revisado de la tarea')
 }finally{globalThis.fetch=originalFetch;await new Promise(resolve=>server.close(resolve));process.chdir(cwd)}
})
