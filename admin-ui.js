import {payloadFromWorkbook} from './excel-reader.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pending=null;
async function api(path,body){
 const response=await fetch(path,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Permintaan gagal.');return data;
}
async function excel(){
 if(window.ExcelJS)return window.ExcelJS;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/vendor/exceljs.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Pembaca Excel gagal dimuat.'));document.head.append(s);});
 return window.ExcelJS;
}
export async function mountAdmin(main,dataset,onSaved){
 pending=null;
 main.innerHTML='<div class="page-heading"><div><div class="eyebrow">ADMIN WORKSPACE</div><h1>Unggah database Excel</h1><p>Perbarui data untuk seluruh pengunjung DigiMetric.</p></div></div><section class="panel"><div class="panel-body" id="admin-content">Memeriksa akses admin…</div></section>';
 const area=main.querySelector('#admin-content');
 const message=(text,error=false)=>{const el=area.querySelector('#admin-message');el.textContent=text;el.className=error?'negative':'muted';};
 try{
  const access=await api('/api/admin');
  if(!access.configured){area.innerHTML='<p>Penyimpanan bersama dan akses admin belum dikonfigurasi. Hubungi pengelola website.</p>';return;}
  if(!access.authenticated){
   area.innerHTML='<form id="admin-login"><label class="field"><span>Kata sandi admin</span><input type="password" name="password" autocomplete="current-password" required></label><p><button class="button primary">Masuk admin</button></p></form><p id="admin-message" role="status"></p>';
   area.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=area.querySelector('button');button.disabled=true;try{await api('/api/admin',{password:new FormData(e.target).get('password')});await mountAdmin(main,dataset,onSaved);}catch(error){message(error.message,true);button.disabled=false;}};
   return;
  }
  area.innerHTML='<p>Gunakan sheet <strong>Detail Upload</strong> pada template DIGIMETRIC_V1. Nominal dalam Rp miliar; persen mengikuti angka sumber. Sheet lain tetap tersedia untuk analisis Excel.</p><p><a class="button" href="assets/templates/DigiMetric_Template_v1.xlsx" download>Unduh template Excel</a></p><label class="field"><span>File database (.xlsx, maksimal 10 MB)</span><input id="database-file" type="file" accept=".xlsx"></label><p id="admin-message" role="status" aria-live="polite"></p><div id="import-preview"></div><p><button id="apply-import" class="button primary" disabled>Terapkan ke semua pengunjung</button> <button id="admin-logout" class="button">Keluar admin</button></p>';
  const apply=area.querySelector('#apply-import');
  area.querySelector('#database-file').onchange=async e=>{
   pending=null;apply.disabled=true;area.querySelector('#import-preview').innerHTML='';
   const file=e.target.files[0];if(!file)return;
   try{
    if(!file.name.toLowerCase().endsWith('.xlsx')||file.size>10*1024*1024)throw new Error('Pilih file .xlsx berukuran maksimal 10 MB.');
    message('Membaca dan memvalidasi seluruh baris…');
    const E=await excel(),workbook=new E.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
    const payload=payloadFromWorkbook(workbook);const revision=dataset.meta.revision;
    if(new Blob([JSON.stringify(payload)]).size>4000000)throw new Error('Data melebihi batas satu unggahan. Bagi baris Detail Upload menjadi beberapa file.');
    const result=await api('/api/import',{payload,revision,commit:false});
    pending={payload,revision:result.revision};const r=result.report;
    area.querySelector('#import-preview').innerHTML=`<div class="note"><strong>${esc(file.name)}</strong><p>${payload.records.length} baris valid · ${r.added} tambahan · ${r.changed} pembaruan · ${r.unchanged} tetap · ${r.cleared} nilai dikosongkan</p><p>${r.newIssuers} emiten baru · ${r.newMetrics} metrik baru · Periode baru: ${esc(r.newPeriods.join(', ')||'—')}</p><p>Baris yang tidak ada dalam file tetap dipertahankan. Status MISSING mengosongkan nilai pada kunci yang sama. Metrik turunan mengikuti angka di Excel.</p></div><div class="table-wrap"><table><thead><tr><th>Data berubah (maks. 100)</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>${r.changes.map(c=>`<tr><td>${esc(c.key)}</td><td>${esc(c.before??'Kosong')}</td><td>${esc(c.after??'Kosong')}</td></tr>`).join('')}</tbody></table></div>`;
    message('Validasi berhasil. Periksa ringkasan, lalu terapkan perubahan.');apply.disabled=false;
   }catch(error){message(error.message,true);}
  };
  apply.onclick=async()=>{
   if(!pending)return;apply.disabled=true;message('Menyimpan database bersama…');
   try{await api('/api/import',{...pending,commit:true});pending=null;message('Database berhasil diperbarui untuk seluruh pengunjung.');await onSaved();}
   catch(error){pending=null;message(error.message+' Pilih file kembali untuk memvalidasi ulang.',true);}
  };
  area.querySelector('#admin-logout').onclick=async()=>{await api('/api/admin',{logout:true});await mountAdmin(main,dataset,onSaved);};
 }catch(error){area.textContent=error.message;}
}
