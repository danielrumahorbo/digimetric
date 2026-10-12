import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Module} from 'node:module';
import {payloadFromWorkbook} from '../excel-reader.js';
import {mergePayload,payloadFromDataset} from '../import-core.js';
import importHandler from '../api/import.js';
import {divergingBars,assetDonut,relationshipChart,incomeColumns} from '../charts.js';
import {buildSimpleWorkbook} from '../simple-template.js';
const base=JSON.parse(await fs.readFile(new URL('../data/dashboard_data.json',import.meta.url)));
const vendor=new Module('exceljs-simple');vendor._compile(await fs.readFile(new URL('../assets/vendor/exceljs.min.js',import.meta.url),'utf8'),'exceljs-simple.cjs');
const load=async()=>{const wb=new vendor.exports.Workbook();await wb.xlsx.load(await fs.readFile(new URL('../assets/templates/DigiMetric_Template_Sederhana.xlsx',import.meta.url)));return wb;};
test('website downloads current dataset rather than a stale static snapshot',async()=>{
 const d=structuredClone(base);d.values.JAGO.Net_Income.FY2024=128.518;d.values.JAGO.Total_Assets['Q3-2026']=98765.432109;d.periods.push('Q3-2026');
 const generated=buildSimpleWorkbook(vendor.exports,d),bytes=await generated.xlsx.writeBuffer(),wb=new vendor.exports.Workbook();await wb.xlsx.load(bytes);
 const p=payloadFromWorkbook(wb,d),after=mergePayload(d,p).dataset;assert.equal(after.values.JAGO.Total_Assets['Q3-2026'],98765.432109);assert.equal(after.values.JAGO.Net_Income.FY2024,128.518);assert.equal(p.issuers.length,12);
});
test('simple workbook preserves precision and all periods and distinguishes blank, zero and HAPUS',async()=>{
 const wb=await load(),p=payloadFromWorkbook(wb,base),d=mergePayload(base,p).dataset;
 assert.equal(p.records.length,1745);assert.equal(d.values.JAGO.Total_Assets.FY2025,36507.347);assert.equal(d.values.JAGO.Net_Income.FY2024,128.518);
 const old=payloadFromDataset(base);for(const r of old.records){if(r.Periode==='FY2024'&&(r.Kode_Metrik==='Net_Income_Share'||r.Kode_Emiten==='JAGO'&&['Net_Income','Net_Income_YoY'].includes(r.Kode_Metrik)))continue;assert.equal(d.values[r.Kode_Emiten][r.Kode_Metrik]?.[r.Periode]??null,r.Nilai);}
 const sheet=wb.getWorksheet('Isi Data'),cell=sheet.getCell('D8');cell.value=null;assert.equal(mergePayload(base,payloadFromWorkbook(wb,base)).dataset.values.ALADIN.Total_Assets.FY2021,base.values.ALADIN.Total_Assets.FY2021);
 cell.value=0;assert.equal(mergePayload(base,payloadFromWorkbook(wb,base)).dataset.values.ALADIN.Total_Assets.FY2021,0);
 cell.value='HAPUS';assert.equal(mergePayload(base,payloadFromWorkbook(wb,base)).dataset.values.ALADIN.Total_Assets.FY2021,undefined);
});
test('new simple period, bank, indicator and precise values import; invalid input and duplicate periods rejected',async()=>{
 const wb=await load(),s=wb.getWorksheet('Isi Data');s.getCell('M7').value='Q3 2026';s.getCell('M8').value=123.456789012345;
 const d=mergePayload(base,payloadFromWorkbook(wb,base)).dataset;assert.equal(d.values.ALADIN.Total_Assets['Q3-2026'],123.456789012345);assert.equal(d.meta.latestPeriod,'Q3-2026');
 s.getRow(272).values=['Bank Tambahan','Pendapatan baru','Rp miliar',15.123456789];const newer=mergePayload(base,payloadFromWorkbook(wb,base)).dataset;assert.equal(newer.values.X_Bank_Tambahan.X_Pendapatan_baru.FY2021,15.123456789);
 s.getCell('M7').value='FY2021';assert.throws(()=>payloadFromWorkbook(wb,base),/dua kali/);s.getCell('M7').value='Q3 2026';
 s.getCell('D8').value={formula:'1+1',result:2};assert.throws(()=>payloadFromWorkbook(wb,base),/formula/);s.getCell('D8').value='1.234,56';assert.throws(()=>payloadFromWorkbook(wb,base),/angka Excel/);
});
test('unchanged values retain metric-specific sources rather than assigning every ratio a bank-wide report',async()=>{
 const p=payloadFromWorkbook(await load(),base),before=payloadFromDataset(base).records.find(r=>r.Kode_Emiten==='JAGO'&&r.Kode_Metrik==='ROA'&&r.Periode==='FY2025');
 const after=p.records.find(r=>r.Kode_Emiten==='JAGO'&&r.Kode_Metrik==='ROA'&&r.Periode==='FY2025');assert.equal(after.URL_Sumber,before.URL_Sumber);
});
test('public endpoint needs no session but rejects foreign-origin writes before touching storage',async()=>{
 const reply={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await importHandler({method:'POST',headers:{origin:'https://attacker.test',host:'digimetric.vercel.app','content-type':'application/json'},body:{}},reply);assert.equal(reply.code,403);
 process.env.BLOB_STORE_ID='test-only';await importHandler({method:'POST',headers:{origin:'https://digimetric.vercel.app',host:'digimetric.vercel.app','content-type':'application/json'},body:{}},reply);assert.equal(reply.code,400);assert.match(reply.body.error,/Permintaan/);delete process.env.BLOB_STORE_ID;
});
test('chart zero baselines, negative values, complete share denominator and escaped labels',()=>{
 const bars=divergingBars([{name:'<Bank>',value:-10},{name:'Bank positif',value:30}]);assert.match(bars,/zero-line/);assert.match(bars,/-10/);assert.match(bars,/&lt;Bank&gt;/);assert.doesNotMatch(bars,/<Bank>/);
 assert.match(assetDonut([{name:'A',value:60},{name:'B',value:40}]),/60%/);assert.doesNotMatch(incomeColumns([{name:'2025',value:0}]),/NaN|Infinity/);assert.match(relationshipChart([{name:'Bank',code:'A',assets:1234,roa:-2}]),/ROA/);
});
