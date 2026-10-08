import {createHmac, timingSafeEqual} from 'node:crypto';
export const configured=()=>Boolean(process.env.DIGIMETRIC_ADMIN_PASSWORD?.length>=16 && (process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID));
const signature=value=>createHmac('sha256',process.env.DIGIMETRIC_ADMIN_PASSWORD||'disabled').update(value).digest('hex');
export function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
export function session(now=Date.now()){const expiry=String(now+3600000);return `${expiry}.${signature(expiry)}`;}
export function authorized(req,now=Date.now()){
 if(!configured())return false;
 const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('digimetric_admin='))?.slice(17)||'';
 const [expiry,sig]=token.split('.');return /^\d+$/.test(expiry)&&Number(expiry)>now&&Number(expiry)<=now+3600000&&equal(sig||'',signature(expiry));
}
export function writeGuard(req){
 const origin=req.headers.origin;const host=req.headers['x-forwarded-host']||req.headers.host;
 try{return typeof origin==='string'&&new URL(origin).host===host&&req.headers['content-type']?.startsWith('application/json');}catch{return false;}
}
export function cookie(value){return `digimetric_admin=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${value?3600:0}`;}
export function reply(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data);}
