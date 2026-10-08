import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {get,put} from '@vercel/blob';
import {mergePayload} from '../import-core.js';
const path='digimetric/database-v1.json';
export const hasStore=()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID);
export async function current(){
 if(hasStore()){
  const result=await get(path,{access:'private',useCache:false});
  if(result){if(result.statusCode!==200)throw new Error('Database tidak dapat dibaca.');return {dataset:JSON.parse(await new Response(result.stream).text()),etag:result.blob.etag};}
 }
 const dataset=JSON.parse(await readFile(new URL('../data/dashboard_data.json',import.meta.url),'utf8'));
 dataset.meta.revision=createHash('sha256').update(JSON.stringify(dataset)).digest('hex');
 return {dataset,etag:null};
}
export async function apply(input,{read=current,write=put}={}){
 const {dataset,etag}=await read();
 if(input.revision!==dataset.meta.revision){const e=new Error('Database telah diperbarui admin lain. Periksa ulang file sebelum menerapkan.');e.status=409;throw e;}
 const result=mergePayload(dataset,input.payload,{revision:randomUUID()});
 if(!input.commit)return {report:result.report,revision:dataset.meta.revision};
 const options={access:'private',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60};
 await write(`digimetric/backups/${Date.now()}-${randomUUID()}.json`,JSON.stringify(dataset),{...options,allowOverwrite:false});
 await write(path,JSON.stringify(result.dataset),{...options,allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{})});
 return {report:result.report,revision:result.dataset.meta.revision};
}
