const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(v);
const money=v=>`Rp ${num(v)} miliar`;
const table=(heads,rows)=>`<details class="chart-data"><summary>Tabel data</summary><div class="table-wrap" tabindex="0"><table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
const figure=(title,body)=>`<figure class="visual-chart"><figcaption class="sr-only">${esc(title)}</figcaption>${body}</figure>`;
export function divergingBars(rows,{title='Perbandingan nilai',unit='Rp miliar'}={}){
 rows=rows.filter(r=>Number.isFinite(r.value));if(!rows.length)return'<p class="empty">Data belum tersedia.</p>';
 const lo=Math.min(0,...rows.map(r=>r.value)),hi=Math.max(0,...rows.map(r=>r.value));
 const w=680,h=rows.length*42+48,l=160,right=128,span=hi-lo||1,x=v=>l+(v-lo)/span*(w-l-right),zero=x(0);
 let shapes='';for(let i=0;i<=4;i++){const v=lo+span*i/4;shapes+=`<line class="chart-gridline" x1="${x(v)}" x2="${x(v)}" y1="10" y2="${h-30}"/><text x="${x(v)}" y="${h-9}" text-anchor="middle">${num(v)}</text>`;}
 shapes+=`<line class="zero-line" x1="${zero}" x2="${zero}" y1="10" y2="${h-30}"/>`;
 for(const [i,r] of rows.entries()){
  const y=14+i*42,end=x(r.value);shapes+=`<text class="chart-label" x="${l-12}" y="${y+19}" text-anchor="end">${esc(r.name)}</text><rect x="${Math.min(zero,end)}" y="${y}" width="${Math.max(Math.abs(end-zero),r.value===0?0:1)}" height="27" rx="3" fill="${r.value<0?'#a93847':r.color||'#315cba'}"><title>${esc(r.name)}: ${num(r.value)} ${esc(unit)}</title></rect><text class="chart-value" x="${w-right+12}" y="${y+19}">${num(r.value)}</text>`;
 }
 return figure(title,`<p class="chart-unit">${esc(unit)}</p><div class="chart-scroll" tabindex="0" aria-label="Grafik dapat digeser ke samping"><svg class="chart-svg bar-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${shapes}</svg></div>`+table(['Bank / periode',`Nilai (${unit})`],rows.map(r=>[r.name,num(r.value)])));
}
export function assetDonut(rows){
 rows=rows.filter(r=>Number.isFinite(r.value)&&r.value>0).sort((a,b)=>b.value-a.value);const total=rows.reduce((s,r)=>s+r.value,0);if(!total)return'<p class="empty">Data aset belum tersedia.</p>';
 const shown=rows.slice(0,4);if(rows.length>4)shown.push({name:'Bank lainnya',value:rows.slice(4).reduce((s,r)=>s+r.value,0),color:'#67788d'});
 const circumference=2*Math.PI*72;let offset=0;
 const rings=shown.map(r=>{const length=r.value/total*circumference,out=`<circle cx="105" cy="105" r="72" fill="none" stroke="${r.color||'#315cba'}" stroke-width="25" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}" transform="rotate(-90 105 105)"><title>${esc(r.name)}: ${num(r.value/total*100)}%</title></circle>`;offset+=length;return out;}).join('');
 return figure('Pangsa aset bank',`<div class="donut-layout"><svg viewBox="0 0 210 210" class="donut-chart" role="img" aria-label="Pangsa aset pada bank yang memiliki data"><title>Pangsa aset. Rincian setiap bank tersedia dalam tabel.</title>${rings}<text x="105" y="99" text-anchor="middle" class="donut-total">100%</text><text x="105" y="122" text-anchor="middle">${rows.length} bank</text></svg><ul class="donut-key">${shown.map(r=>`<li><span class="color-key" style="background:${r.color||'#315cba'}"></span><span>${esc(r.name)}</span><strong>${num(r.value/total*100)}%</strong></li>`).join('')}</ul></div>`+table(['Bank','Aset (Rp miliar)','Pangsa (%)'],rows.map(r=>[r.name,num(r.value),num(r.value/total*100)])));
}
export function relationshipChart(rows){
 rows=rows.filter(r=>Number.isFinite(r.assets)&&Number.isFinite(r.roa));if(!rows.length)return'<p class="empty">Aset dan ROA belum tersedia pada periode ini.</p>';
 const w=680,h=345,l=62,r=40,t=30,b=56,max=Math.max(...rows.map(r=>r.assets))*1.18||1,low=Math.min(0,...rows.map(r=>r.roa)),high=Math.max(0,...rows.map(r=>r.roa))+1,x=v=>l+v/max*(w-l-r),y=v=>t+(high-v)/(high-low)*(h-t-b);
 let shapes='';for(let i=0;i<=4;i++){const vx=max*i/4,vy=low+(high-low)*i/4;shapes+=`<line class="chart-gridline" x1="${l}" x2="${w-r}" y1="${y(vy)}" y2="${y(vy)}"/><text x="${l-9}" y="${y(vy)+4}" text-anchor="end">${num(vy)}%</text><text x="${x(vx)}" y="${h-b+20}" text-anchor="middle">${num(vx/1000)}</text>`;}
 shapes+=`<line class="zero-line" x1="${l}" x2="${w-r}" y1="${y(0)}" y2="${y(0)}"/><text x="${w/2}" y="${h-9}" text-anchor="middle">Total aset (Rp triliun)</text>`;
 rows.forEach(row=>{shapes+=`<circle cx="${x(row.assets)}" cy="${y(row.roa)}" r="7" fill="${row.color||'#315cba'}" stroke="#fff" stroke-width="1.5"><title>${esc(row.name)}: aset ${money(row.assets)}, ROA ${num(row.roa)}%</title></circle><text class="chart-label" x="${x(row.assets)+10}" y="${y(row.roa)-8}">${esc(row.code)}</text>`;});
 return figure('Total aset dan ROA',`<p class="chart-unit">Sumbu horizontal: total aset · Sumbu vertikal: ROA (%)</p><div class="chart-scroll" tabindex="0" aria-label="Grafik dapat digeser ke samping"><svg viewBox="0 0 ${w} ${h}" class="chart-svg scatter-chart" role="img" aria-label="Hubungan total aset dan ROA"><title>Total aset dan ROA</title>${shapes}</svg></div>`+table(['Kode','Bank','Aset (Rp miliar)','ROA (%)'],rows.map(r=>[r.code,r.name,num(r.assets),num(r.roa)])));
}
export function incomeColumns(rows){
 rows=rows.filter(r=>Number.isFinite(r.value));if(!rows.length)return'<p class="empty">Laba tahunan belum tersedia.</p>';
 const w=680,h=300,l=65,r=30,t=34,b=40,lo=Math.min(0,...rows.map(r=>r.value)),hi=Math.max(0,...rows.map(r=>r.value)),span=hi-lo||1,y=v=>t+(hi-v)/span*(h-t-b),step=(w-l-r)/rows.length;
 let shapes='';for(let i=0;i<=4;i++){const v=lo+span*i/4;shapes+=`<line class="chart-gridline" x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l-10}" y="${y(v)+4}" text-anchor="end">${num(v)}</text>`;}
 shapes+=`<line class="zero-line" x1="${l}" x2="${w-r}" y1="${y(0)}" y2="${y(0)}"/>`;
 rows.forEach((row,i)=>{const x=l+step*i+step*.2;shapes+=`<rect x="${x}" y="${Math.min(y(0),y(row.value))}" width="${step*.6}" height="${Math.abs(y(0)-y(row.value))}" fill="${row.value<0?'#a93847':'#315cba'}" rx="3"><title>${esc(row.name)}: ${money(row.value)}</title></rect><text x="${x+step*.3}" y="${row.value<0?y(row.value)+17:y(row.value)-10}" text-anchor="middle" class="chart-value">${num(row.value)}</text><text x="${x+step*.3}" y="${h-12}" text-anchor="middle">${esc(row.name)}</text>`;});
 return figure('Laba bersih tahunan',`<p class="chart-unit">Rp miliar · Januari–Desember</p><div class="chart-scroll" tabindex="0" aria-label="Grafik dapat digeser ke samping"><svg class="chart-svg column-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Laba bersih tahunan"><title>Laba bersih tahunan</title>${shapes}</svg></div>`+table(['Tahun','Laba bersih (Rp miliar)'],rows.map(r=>[r.name,num(r.value)])));
}
