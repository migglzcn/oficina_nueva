import { generalHandler } from './general.ts'
// El flujo comercial anterior queda archivado y fuera de las rutas activas.
export const assistantHandler: import('node:http').RequestListener = async(req,res)=>{
 if(req.url?.startsWith('/api/work')){await generalHandler(req,res);return}
 res.writeHead(404).end()
}
