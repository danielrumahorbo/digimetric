import {payloadFromWorkbook} from './excel-reader.js';
import {buildSimpleWorkbook} from './simple-template.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(body){const res=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Pembaruan gagal.');return data;}
async function excel(){if(window.ExcelJS)return window.ExcelJS;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/vendor/exceljs.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Pembaca Excel gagal dimuat. Coba lagi.'));document.head.append(s);});return window.ExcelJS;}
export async function mountAdmin(main,dataset,onSaved){
 main.innerHTML=`<div class="page-heading"><div><div class="eyebrow">PEMBARUAN DATA</div><h1>Unggah Excel</h1><p>Pilih file. Setelah lolos pemeriksaan, data otomatis tersimpan dan dashboard diperbarui untuk semua pengunjung.</p></div></div><section class="panel"><div class="panel-body upload-workspace"><ol class="upload-steps"><li><strong>1. Isi Excel</strong><span>Edit angka pada sheet Isi Data. Tambahkan kolom untuk periode baru.</span></li><li><strong>2. Pilih file</strong><span>Website memeriksa format dan setiap angka sebelum menyimpan.</span></li><li><strong>3. Lihat dashboard</strong><span>Data tetap tersedia saat website dibuka kembali.</span></li></ol><p><a class="button" href="assets/templates/DigiMetric_Template_Sederhana.xlsx" download>Unduh Excel sederhana</a></p><label class="field upload-field"><span>Pilih file Excel (.xlsx, maksimal 10 MB)</span><input id="database-file" type="file" accept=".xlsx"></label><p id="upload-message" role="status" aria-live="polite">Belum ada file dipilih.</p><div id="import-result"></div><p class="chart-footnote">Unggah bersifat publik, tanpa login. Setiap unggahan memperbarui database bersama. Angka yang kosong pada template sederhana mempertahankan data lama. Template Detail Upload versi lama tetap diterima.</p></div></section>`;
 const input=main.querySelector('#database-file'),message=main.querySelector('#upload-message'),result=main.querySelector('#import-result');
 main.querySelector('a[download]').onclick=async e=>{
  e.preventDefault();message.textContent='Menyiapkan Excel dari database terbaru…';
  try{
   const E=await excel(),response=await fetch('/api/dataset',{cache:'no-store'});
   if(!response.ok)throw new Error('Database terbaru belum bisa dimuat. Coba lagi.');
   const latest=await response.json();dataset=latest;
   const wb=buildSimpleWorkbook(E,latest),bytes=await wb.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
   const a=document.createElement('a');a.href=url;a.download='DigiMetric_Template_Sederhana.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   message.textContent='Excel terbaru berhasil disiapkan. Isi angka, lalu pilih file untuk mengunggah.';
  }catch(error){message.textContent=error.message;message.className='negative';}
 };
 input.onchange=async e=>{
  const file=e.target.files[0];if(!file)return;input.disabled=true;result.innerHTML='';message.className='';message.textContent='Membaca dan memeriksa Excel…';
  try{
   if(!file.name.toLowerCase().endsWith('.xlsx')||file.size>10*1024*1024)throw new Error('Pilih file .xlsx berukuran maksimal 10 MB.');
   const E=await excel(),wb=new E.Workbook();await wb.xlsx.load(await file.arrayBuffer());const payload=payloadFromWorkbook(wb,dataset);
   if(new Blob([JSON.stringify(payload)]).size>4000000)throw new Error('File berisi terlalu banyak data. Unggah sebagian baris terlebih dahulu.');
   const preview=await api({payload,revision:dataset.meta.revision,commit:false});
   message.textContent='Format valid. Menyimpan pembaruan untuk semua pengunjung…';
   const saved=await api({payload,revision:preview.revision,commit:true}),r=saved.report;
   message.textContent='Data berhasil tersimpan.';
   result.innerHTML=`<div class="note"><strong>${esc(file.name)}</strong><p>${r.added} data baru · ${r.changed} diperbarui · ${r.cleared} dikosongkan.</p></div>`;
   await onSaved({file:file.name,report:r});
  }catch(error){message.textContent=error.message;message.className='negative';input.disabled=false;input.value='';}
 };
}
