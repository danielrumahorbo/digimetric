export const SCHEMA='DIGIMETRIC_V1';
export const ISSUER_HEADERS=['Kode_Emiten','Nama_Emiten','Nama_Legal','Sektor','Ticker','Cakupan_Utama'];
export const METRIC_HEADERS=['Kode_Metrik','Nama_Metrik','Kelompok','Satuan','Jenis','Arah_Baik'];
export const DATA_HEADERS=['Kode_Emiten','Kode_Metrik','Periode','Tanggal_Posisi','Cakupan','Nilai','Satuan','Status','Basis','Judul_Laporan','URL_Sumber','Catatan','Nilai_Pembanding'];
const unsafe=new Set(['__proto__','prototype','constructor']);
const id=v=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(v)&&!unsafe.has(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const periodKey=p=>Number(p.match(/\d{4}/)?.[0])*10+(p.startsWith('FY')?5:Number(p[1]));
export const observationKey=r=>[r.Kode_Emiten,r.Kode_Metrik,r.Periode,r.Cakupan].join('|');
const clone=v=>JSON.parse(JSON.stringify(v));
function text(v,max=1000){return typeof v==='string'&&v.trim().length>0&&v.length<=max;}
function iso(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
function safeUrl(v){if(!v)return true;try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
export function payloadFromDataset(d){
 const issuers=Object.keys(d.banks).map(b=>({Kode_Emiten:b,Nama_Emiten:d.issuerMeta?.[b]?.name||b,Nama_Legal:d.banks[b],Sektor:d.issuerMeta?.[b]?.sector||'Bank Digital',Ticker:d.issuerMeta?.[b]?.ticker||'',Cakupan_Utama:d.issuerMeta?.[b]?.scope||'Bank'}));
 const metrics=Object.entries(d.metrics).map(([m,x])=>({Kode_Metrik:m,Nama_Metrik:x.label,Kelompok:x.module,Satuan:x.unit,Jenis:x.kind||(['Total_Assets','DPK','Loans'].includes(m)?'stock':m==='Net_Income'?'flow':m.includes('_Share')||m.includes('_YoY')?'derived':'ratio'),Arah_Baik:x.direction||(['CIR','BOPO','NPL_gross'].includes(m)?'lower':'higher')}));
 if(d.observations)return {schema:SCHEMA,issuers,metrics,records:clone(d.observations)};
 const records=[];
 for(const b of Object.keys(d.banks))for(const p of d.periods)for(const m of Object.keys(d.metrics)){
  const src=d.sourcesByPeriod?.[p]?.[b],verified=src&&(!src.verifiedMetrics||src.verifiedMetrics.includes(m));
  const v=d.values[b]?.[m]?.[p]??null;const year=+p.match(/\d{4}/)[0];
  records.push({Kode_Emiten:b,Kode_Metrik:m,Periode:p,Tanggal_Posisi:`${year}-${p.startsWith('FY')?'12-31':p.startsWith('Q1')?'03-31':p.startsWith('Q2')?'06-30':p.startsWith('Q3')?'09-30':'12-31'}`,Cakupan:'Bank',Nilai:v,Satuan:d.metrics[m].unit,Status:v===null?'MISSING':'AVAILABLE',Basis:m==='Net_Income'?(p.startsWith('FY')?'YTD12':p.startsWith('Q1')?'YTD3':p.startsWith('Q2')?'YTD6':'YTD9'):'POSISI/RASIO',Judul_Laporan:verified?src.name:'Dataset awal DigiMetric',URL_Sumber:verified?src.url:'https://digimetric.vercel.app/data/dashboard_data.json',Catatan:verified?src.notes.join(' '):'Data historis belum diverifikasi ulang.',Nilai_Pembanding:m==='Net_Income'&&src?.comparativeIncome!==undefined?src.comparativeIncome:null});
 }
 return {schema:SCHEMA,issuers,metrics,records};
}
export function validatePayload(payload){
 const errors=[];const err=(where,msg)=>{if(errors.length<100)errors.push(`${where}: ${msg}`);};
 if(!payload||payload.schema!==SCHEMA)throw new Error('Versi template tidak sesuai. Gunakan DIGIMETRIC_V1.');
 for(const k of ['issuers','metrics','records'])if(!Array.isArray(payload[k])||payload[k].length>100000)throw new Error(`Tabel ${k} tidak valid atau terlalu besar.`);
 if(!payload.issuers.length||!payload.metrics.length||!payload.records.length)throw new Error('Tabel emiten, metrik dan data harus berisi baris.');
 const issuers=new Map(),metrics=new Map(),keys=new Set();
 payload.issuers.forEach((r,i)=>{const at=`Emiten baris ${i+8}`;if(!id(r.Kode_Emiten))err(at,'kode emiten tidak valid');if(issuers.has(r.Kode_Emiten))err(at,'kode emiten duplikat');issuers.set(r.Kode_Emiten,r);for(const k of ['Nama_Emiten','Nama_Legal','Sektor','Cakupan_Utama'])if(!text(r[k],200))err(at,`${k} wajib diisi (maks. 200 karakter)`);if(typeof r.Ticker!=='string'||r.Ticker.length>30)err(at,'Ticker tidak valid');});
 payload.metrics.forEach((r,i)=>{const at=`Metrik baris ${i+8}`;if(!id(r.Kode_Metrik))err(at,'kode metrik tidak valid');if(metrics.has(r.Kode_Metrik))err(at,'kode metrik duplikat');metrics.set(r.Kode_Metrik,r);for(const k of ['Nama_Metrik','Kelompok','Satuan'])if(!text(r[k],150))err(at,`${k} wajib diisi`);if(!['stock','flow','ratio','derived'].includes(r.Jenis))err(at,'Jenis harus stock, flow, ratio atau derived');if(!['higher','lower','neutral'].includes(r.Arah_Baik))err(at,'Arah_Baik harus higher, lower atau neutral');});
 payload.records.forEach((r,i)=>{
  const at=`Data baris ${i+8}`;const issuer=issuers.get(r.Kode_Emiten),metric=metrics.get(r.Kode_Metrik);
  if(!issuer)err(at,'kode emiten tidak ada di katalog');if(!metric)err(at,'kode metrik tidak ada di katalog');
  if(typeof r.Periode!=='string'||!(/^(FY\d{4}|Q[1-4]-\d{4})$/).test(r.Periode))err(at,'Periode harus FY2025 atau Q1-2026 s.d. Q4-2026');
  if(typeof r.Tanggal_Posisi!=='string'||!iso(r.Tanggal_Posisi))err(at,'Tanggal_Posisi harus tanggal valid YYYY-MM-DD');
  if(typeof r.Periode==='string'&&typeof r.Tanggal_Posisi==='string'&&r.Tanggal_Posisi.slice(0,4)!==r.Periode.match(/\d{4}/)?.[0])err(at,'tahun periode dan tanggal tidak cocok');
  if(!text(r.Cakupan,100)||r.Cakupan.includes('|'))err(at,'Cakupan tidak valid');
  if(!['AVAILABLE','MISSING'].includes(r.Status))err(at,'Status harus AVAILABLE atau MISSING');
  if(r.Status==='AVAILABLE'&&!finite(r.Nilai))err(at,'Nilai harus angka Excel, bukan teks atau formula');
  if(r.Status==='MISSING'&&r.Nilai!==null)err(at,'Nilai MISSING harus kosong');
  if(metric&&r.Satuan!==metric.Satuan)err(at,`satuan harus ${metric.Satuan}; konversi sebelum unggah`);
  for(const k of ['Basis','Judul_Laporan'])if(!text(r[k],500))err(at,`${k} wajib diisi`);
  if(!safeUrl(r.URL_Sumber))err(at,'URL sumber tidak valid');
  if(typeof r.Catatan!=='string'||r.Catatan.length>5000)err(at,'Catatan terlalu panjang');
  if(r.Nilai_Pembanding!==null&&!finite(r.Nilai_Pembanding))err(at,'Nilai_Pembanding harus angka atau kosong');
  const key=observationKey(r);if(keys.has(key))err(at,'duplikat emiten × metrik × periode × cakupan');keys.add(key);
 });
 if(errors.length)throw new Error(errors.join('\n'));
 return payload;
}
export function mergePayload(base,payload,{revision,now=new Date().toISOString()}={}){
 validatePayload(payload);const d=clone(base),before=payloadFromDataset(base);const report={added:0,changed:0,unchanged:0,cleared:0,newIssuers:0,newMetrics:0,newPeriods:[],changes:[]};
 const old=new Map(before.records.map(r=>[observationKey(r),r]));
 const issuerMap=new Map(before.issuers.map(r=>[r.Kode_Emiten,r]));
 const metricMap=new Map(before.metrics.map(r=>[r.Kode_Metrik,r]));
 for(const r of payload.issuers){if(!issuerMap.has(r.Kode_Emiten))report.newIssuers++;issuerMap.set(r.Kode_Emiten,clone(r));}
 for(const r of payload.metrics){const existing=metricMap.get(r.Kode_Metrik);if(existing&&existing.Satuan!==r.Satuan)throw new Error(`Satuan metrik ${r.Kode_Metrik} tidak boleh berubah karena memengaruhi histori.`);if(!existing)report.newMetrics++;metricMap.set(r.Kode_Metrik,clone(r));}
 for(const r of payload.records){const k=observationKey(r),prev=old.get(k);const action=!prev?'added':JSON.stringify(prev)===JSON.stringify(r)?'unchanged':r.Status==='MISSING'&&prev.Status==='AVAILABLE'?'cleared':'changed';report[action]++;if(action!=='unchanged'&&report.changes.length<100)report.changes.push({key:k,action,before:prev?.Nilai??null,after:r.Nilai});old.set(k,clone(r));}
 d.banks={};d.issuerMeta={};d.values={};d.metrics={};d.sourcesByPeriod={};
 for(const [b,r] of issuerMap){d.banks[b]=r.Nama_Legal;d.issuerMeta[b]={name:r.Nama_Emiten,sector:r.Sektor,ticker:r.Ticker,scope:r.Cakupan_Utama};d.values[b]={};}
 for(const [m,r] of metricMap)d.metrics[m]={...base.metrics[m],label:r.Nama_Metrik,module:r.Kelompok,unit:r.Satuan,kind:r.Jenis,direction:r.Arah_Baik};
 d.observations=[...old.values()];const periods=new Set(base.periods);
 for(const r of d.observations){periods.add(r.Periode);if(r.Cakupan!==d.issuerMeta[r.Kode_Emiten].scope)continue;const b=r.Kode_Emiten,m=r.Kode_Metrik,p=r.Periode;
  if(r.Status==='AVAILABLE'){(d.values[b][m]??={})[p]=r.Nilai;}
  // Only primary-scope sources enter the dashboard register.
  if(r.URL_Sumber&&r.URL_Sumber!=='https://digimetric.vercel.app/data/dashboard_data.json'){
   const previous=base.sourcesByPeriod?.[p]?.[b];const s=(d.sourcesByPeriod[p]??={})[b]??={...previous,name:r.Judul_Laporan,url:r.URL_Sumber,period:p,date:r.Tanggal_Posisi,originalUnit:previous?.originalUnit||r.Satuan,incomeBasis:r.Basis,notes:[],verifiedMetrics:[]};
   if(!s.verifiedMetrics.includes(m))s.verifiedMetrics.push(m);if(r.Catatan&&!s.notes.includes(r.Catatan))s.notes.push(r.Catatan);if(m==='Net_Income'){s.comparativeIncome=r.Nilai_Pembanding;s.incomeBasis=r.Basis;}
  }
 }
 d.periods=[...periods].sort((a,b)=>periodKey(a)-periodKey(b));report.newPeriods=d.periods.filter(p=>!base.periods.includes(p));d.meta.latestPeriod=d.periods.at(-1);d.meta.updatedAt=now.slice(0,10);d.meta.revision=revision||now;d.meta.schema=SCHEMA;d.sources=d.sourcesByPeriod[d.meta.latestPeriod]||{};
 d.meta.importSummary={at:now,added:report.added,changed:report.changed,cleared:report.cleared};
 // Imported derived metrics remain explicit observations. Do not silently substitute definitions.
 return {dataset:d,report};
}
