import {current} from '../server/store.js';
import {reply} from '../server/auth.js';
export default async function handler(req,res){
 if(req.method!=='GET')return reply(res,405,{error:'Metode tidak tersedia.'});
 try{return reply(res,200,(await current()).dataset);}catch(error){console.error('Dataset read failed:',error.name);return reply(res,503,{error:'Database sementara tidak dapat dibaca. Silakan coba lagi.'});}
}
