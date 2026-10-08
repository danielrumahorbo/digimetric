import {configured,authorized,session,equal,writeGuard,cookie,reply} from '../server/auth.js';
export default async function handler(req,res){
 if(req.method==='GET')return reply(res,200,{configured:configured(),authenticated:authorized(req)});
 if(req.method!=='POST')return reply(res,405,{error:'Metode tidak tersedia.'});
 if(!writeGuard(req))return reply(res,403,{error:'Permintaan tidak diizinkan.'});
 if(req.body?.logout){res.setHeader('Set-Cookie',cookie(''));return reply(res,200,{authenticated:false});}
 if(!configured())return reply(res,503,{error:'Penyimpanan dan akses admin belum dikonfigurasi.'});
 if(!equal(req.body?.password||'',process.env.DIGIMETRIC_ADMIN_PASSWORD)){
  await new Promise(resolve=>setTimeout(resolve,800));return reply(res,401,{error:'Kata sandi admin salah.'});
 }
 res.setHeader('Set-Cookie',cookie(session()));return reply(res,200,{authenticated:true});
}
