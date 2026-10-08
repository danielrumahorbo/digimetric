import {authorized,writeGuard,reply} from '../server/auth.js';
import {apply} from '../server/store.js';
export default async function handler(req,res){
 if(req.method!=='POST')return reply(res,405,{error:'Metode tidak tersedia.'});
 if(!writeGuard(req)||!authorized(req))return reply(res,401,{error:'Masuk sebagai admin terlebih dahulu.'});
 if(!req.body||typeof req.body.commit!=='boolean')return reply(res,400,{error:'Permintaan unggah tidak valid.'});
 try{return reply(res,200,await apply(req.body));}
 catch(error){const conflict=['BlobPreconditionFailedError','BlobPathnameMismatchError'].includes(error.name);return reply(res,error.status|| (conflict?409:400),{error:conflict?'Database berubah. Periksa ulang unggahan.':String(error.message).slice(0,12000)});}
}
