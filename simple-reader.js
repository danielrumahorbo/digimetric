import {SCHEMA,validatePayload,payloadFromDataset,observationKey} from './import-core.js';
const normalize=v=>String(v??'').trim().toLowerCase();
const period=v=>String(v??'').trim().toUpperCase().replace(/^FY\s+/,'FY').replace(/^(Q[1-4])\s+/,'$1-');
const makeCode=v=>'X_'+String(v).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'_').replace(/_+$/,'').slice(0,60);
const names={ALADIN:'Aladin Syariah',ALLO:'Allo Bank',AMAR:'Amar Bank',BLU:'blu by BCA Digital',HIBANK:'hibank',JAGO:'Bank Jago',KROM:'Krom Bank',NEOBANK:'Neo Commerce',RAYA:'Bank Raya',SAQU:'Bank Saqu',SEABANK:'SeaBank',SUPERBANK:'Superbank'};
export function simplePayload(workbook,dataset,cellValue){
 if(!dataset)throw new Error('Dataset belum dimuat. Muat ulang halaman.');
 const s=workbook.getWorksheet('Isi Data');
 ['Bank','Indikator','Satuan'].forEach((h,i)=>{if(cellValue(s.getRow(7).getCell(i+1))!==h)throw new Error(`Isi Data: header kolom ${i+1} harus ${h}.`);});
 const columns=[],seenPeriods=new Set();
 for(let c=4;c<=s.columnCount;c++){
  const raw=cellValue(s.getRow(7).getCell(c));if(raw===null||raw==='')continue;
  const p=period(raw);if(!/^(FY\d{4}|Q[1-4]-\d{4})$/.test(p))throw new Error(`Isi Data kolom ${c}: gunakan FY2025 atau Q3 2026 pada judul periode.`);
  if(seenPeriods.has(p))throw new Error(`Periode ${p} muncul dua kali.`);seenPeriods.add(p);columns.push([c,p]);
 }
 if(!columns.length)throw new Error('Tambahkan minimal satu kolom periode pada baris 7.');
 const old=payloadFromDataset(dataset),issuers=new Map(old.issuers.map(r=>[r.Kode_Emiten,r])),metrics=new Map(old.metrics.map(r=>[r.Kode_Metrik,r]));
 const byBank=new Map(),byMetric=new Map();
 for(const r of issuers.values()){
  if(r.Nama_Emiten===r.Kode_Emiten&&names[r.Kode_Emiten])r.Nama_Emiten=names[r.Kode_Emiten];
  for(const v of [r.Kode_Emiten,r.Nama_Emiten,r.Nama_Legal,names[r.Kode_Emiten]].filter(Boolean))byBank.set(normalize(v),r.Kode_Emiten);
 }
 for(const r of metrics.values())for(const v of [r.Kode_Metrik,r.Nama_Metrik])byMetric.set(normalize(v),r.Kode_Metrik);
 const observations=new Map(old.records.map(r=>[observationKey(r),r])),sources=new Map(),guide=workbook.getWorksheet('Panduan');
 if(guide&&cellValue(guide.getCell('A30'))==='Bank')for(let i=31;i<=guide.rowCount;i++){
  const [bank,p,url,note]=[1,2,3,4].map(c=>cellValue(guide.getRow(i).getCell(c)));
  if(!bank||!p)continue;const k=normalize(bank)+'|'+period(p);
  if(sources.has(k))throw new Error(`Panduan baris ${i}: sumber bank dan periode duplikat.`);
  sources.set(k,{url:url??'',note:note??''});
 }
 const records=[],usedIssuers=new Set(),usedMetrics=new Set();
 for(let i=8;i<=s.rowCount;i++){
  const row=s.getRow(i),bank=cellValue(row.getCell(1)),label=cellValue(row.getCell(2)),unit=cellValue(row.getCell(3));
  const cells=columns.map(([c,p])=>[p,cellValue(row.getCell(c))]);
  if(cells.every(([,v])=>v===null||v===''))continue;
  if(!bank||!label||!unit)throw new Error(`Isi Data baris ${i}: Bank, Indikator dan Satuan wajib diisi.`);
  let b=byBank.get(normalize(bank)),m=byMetric.get(normalize(label));
  if(!b){b=makeCode(bank);if(issuers.has(b))throw new Error(`Nama bank ${bank} menghasilkan kode yang sudah digunakan.`);issuers.set(b,{Kode_Emiten:b,Nama_Emiten:String(bank).trim(),Nama_Legal:String(bank).trim(),Sektor:'Bank Digital',Ticker:'',Cakupan_Utama:'Bank'});byBank.set(normalize(bank),b);}
  if(!m){m=makeCode(label);if(metrics.has(m))throw new Error(`Nama indikator ${label} menghasilkan kode yang sudah digunakan.`);metrics.set(m,{Kode_Metrik:m,Nama_Metrik:String(label).trim(),Kelompok:'Indikator tambahan',Satuan:String(unit).trim(),Jenis:unit==='%'?'ratio':'stock',Arah_Baik:'neutral'});byMetric.set(normalize(label),m);}
  const issuer=issuers.get(b),metric=metrics.get(m);
  if(String(unit).trim()!==metric.Satuan)throw new Error(`Isi Data baris ${i}: satuan ${label} harus ${metric.Satuan}.`);
  for(const [p,v] of cells){
   if(v===null||v==='')continue;
   const clear=typeof v==='string'&&v.trim().toUpperCase()==='HAPUS';
   if(!clear&&(typeof v!=='number'||!Number.isFinite(v)))throw new Error(`Isi Data baris ${i}, ${p}: isi angka Excel. Kosong mempertahankan data lama; HAPUS untuk mengosongkan.`);
   const previous=observations.get([b,m,p,issuer.Cakupan_Utama].join('|'));
   const year=p.match(/\d{4}/)[0],date=`${year}-${p.startsWith('FY')||p.startsWith('Q4')?'12-31':p.startsWith('Q1')?'03-31':p.startsWith('Q2')?'06-30':'09-30'}`;
   const src=sources.get(normalize(bank)+'|'+p);const sourceChanged=src&&src.url&&src.url!==previous?.URL_Sumber&&v!==previous?.Nilai&&metric.Jenis!=='derived';
   records.push({...previous,Kode_Emiten:b,Kode_Metrik:m,Periode:p,Tanggal_Posisi:previous?.Tanggal_Posisi||date,Cakupan:issuer.Cakupan_Utama,Nilai:clear?null:v,Satuan:metric.Satuan,Status:clear?'MISSING':'AVAILABLE',Basis:previous?.Basis||(metric.Jenis==='flow'?`YTD${p.startsWith('FY')?12:Number(p[1])*3}`:'POSISI/RASIO'),Judul_Laporan:sourceChanged||!previous?`Laporan ${bank} ${p}`:previous.Judul_Laporan,URL_Sumber:sourceChanged?src.url:previous?.URL_Sumber||src?.url||'',Catatan:sourceChanged?src.note:previous?.Catatan||src?.note||'Diunggah melalui template sederhana DigiMetric.',Nilai_Pembanding:previous?.Nilai_Pembanding??null});
   usedIssuers.add(b);usedMetrics.add(m);
  }
 }
 return validatePayload({schema:SCHEMA,issuers:[...usedIssuers].map(k=>issuers.get(k)),metrics:[...usedMetrics].map(k=>metrics.get(k)),records});
}
