import {SCHEMA,DATA_HEADERS,validatePayload} from './import-core.js';
export const DETAIL_HEADERS=[...DATA_HEADERS,'Nama_Emiten','Nama_Legal','Sektor','Ticker','Cakupan_Utama','Nama_Metrik','Kelompok','Jenis','Arah_Baik'];
function cellValue(cell){const v=cell?.value??null;if(v&&typeof v==='object'){
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if('formula' in v||'sharedFormula' in v)throw new Error(`Sel ${cell.address}: kolom input tidak menerima formula. Tempel nilainya saja.`);
 if(v.richText)return v.richText.map(x=>x.text).join('');if(v.hyperlink)return v.text||v.hyperlink;
 throw new Error(`Sel ${cell.address}: jenis data tidak didukung.`);
}return v;}
export function payloadFromWorkbook(workbook){
 const s=workbook.getWorksheet('Detail Upload');if(!s)throw new Error('Sheet Detail Upload tidak ditemukan. Gunakan template baku.');
 if(cellValue(s.getCell('B1'))!==SCHEMA)throw new Error('SchemaVersion harus DIGIMETRIC_V1.');
 DETAIL_HEADERS.forEach((h,i)=>{if(cellValue(s.getRow(7).getCell(i+1))!==h)throw new Error(`Header kolom ${i+1} harus ${h}.`);});
 const issuers=new Map(),metrics=new Map(),records=[];
 for(let i=8;i<=s.rowCount;i++){
  const row=s.getRow(i);const values=DETAIL_HEADERS.map((_,j)=>cellValue(row.getCell(j+1)));
  if(values.every(v=>v===null||v===''))continue;
  const r=Object.fromEntries(DETAIL_HEADERS.map((h,j)=>[h,values[j]??(['Nilai','Nilai_Pembanding'].includes(h)?null:'')]));
  const issuer={Kode_Emiten:r.Kode_Emiten,Nama_Emiten:r.Nama_Emiten,Nama_Legal:r.Nama_Legal,Sektor:r.Sektor,Ticker:r.Ticker,Cakupan_Utama:r.Cakupan_Utama};
  const metric={Kode_Metrik:r.Kode_Metrik,Nama_Metrik:r.Nama_Metrik,Kelompok:r.Kelompok,Satuan:r.Satuan,Jenis:r.Jenis,Arah_Baik:r.Arah_Baik};
  for(const [map,key,value,label] of [[issuers,r.Kode_Emiten,issuer,'emiten'],[metrics,r.Kode_Metrik,metric,'metrik']]){
   if(map.has(key)&&JSON.stringify(map.get(key))!==JSON.stringify(value))throw new Error(`Detail Upload baris ${i}: metadata ${label} ${key} berbeda antarbaris.`);map.set(key,value);
  }
  records.push(Object.fromEntries(DATA_HEADERS.map(h=>[h,r[h]])));
 }
 return validatePayload({schema:SCHEMA,issuers:[...issuers.values()],metrics:[...metrics.values()],records});
}
