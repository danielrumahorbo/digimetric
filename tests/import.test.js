import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Module} from 'node:module';
import {payloadFromDataset,validatePayload,mergePayload} from '../import-core.js';
import {payloadFromWorkbook} from '../excel-reader.js';
import {apply} from '../server/store.js';
import {session,authorized,writeGuard} from '../server/auth.js';
const base=JSON.parse(await fs.readFile(new URL('../data/dashboard_data.json',import.meta.url)));
const bundle=await fs.readFile(new URL('../assets/vendor/exceljs.min.js',import.meta.url),'utf8');
const vendor=new Module('exceljs-test');vendor._compile(bundle,'exceljs-test.cjs');
const wb=new vendor.exports.Workbook();
await wb.xlsx.load(await fs.readFile(new URL('../assets/templates/DigiMetric_Template_v1.xlsx',import.meta.url)));
const excel=payloadFromWorkbook(wb);
test('delivered Excel parses and preserves all source numbers exactly',()=>{
 assert.equal(excel.records.length,2376);
 const d=mergePayload(base,excel).dataset;
 for(const [b,ms] of Object.entries(base.values))for(const [m,ps] of Object.entries(ms))for(const [p,v] of Object.entries(ps))assert.equal(d.values[b][m]?.[p]??null,v);
 assert.equal(d.values.JAGO.Total_Assets.FY2025,36507.347);
});
test('new issuer, metric, period and scope retain history',()=>{
 const p=structuredClone(excel);p.issuers.push({...p.issuers[0],Kode_Emiten:'NEWBANK',Nama_Emiten:'Bank Baru'});
 p.metrics.push({...p.metrics[0],Kode_Metrik:'Operating_Income',Nama_Metrik:'Pendapatan',Jenis:'flow'});
 p.records=[{...p.records[0],Kode_Emiten:'NEWBANK',Kode_Metrik:'Operating_Income',Periode:'Q3-2026',Tanggal_Posisi:'2026-09-30',Nilai:123.4567890123}];
 const {dataset:d,report}=mergePayload(base,p);
 assert.equal(d.meta.latestPeriod,'Q3-2026');assert.equal(d.values.NEWBANK.Operating_Income['Q3-2026'],123.4567890123);
 assert.deepEqual(d.values.JAGO.Total_Assets,base.values.JAGO.Total_Assets);assert.equal(report.newIssuers,1);
 p.records[0].Cakupan='Konsolidasi';const other=mergePayload(base,p).dataset;
 assert.equal(other.values.NEWBANK.Operating_Income,undefined);assert.equal(other.observations.at(-1).Nilai,123.4567890123);
});
test('duplicates, invalid values, mismatched units and unsafe sources rejected',()=>{
 for(const mutate of [p=>p.records.push({...p.records[0]}),p=>p.records[0].Nilai='123',p=>p.records[0].Satuan='Rp juta',p=>p.records[0].URL_Sumber='javascript:alert(1)',p=>p.issuers[0].Kode_Emiten='__proto__']){
  const p=structuredClone(excel);mutate(p);assert.throws(()=>validatePayload(p));
 }
});
test('MISSING clears an explicit key, omitted rows survive',()=>{
 const p=structuredClone(excel);p.records=[{...p.records.find(r=>r.Kode_Emiten==='JAGO'&&r.Kode_Metrik==='Total_Assets'&&r.Periode==='FY2025'),Nilai:null,Status:'MISSING'}];
 const d=mergePayload(base,p).dataset;assert.equal(d.values.JAGO.Total_Assets.FY2025,undefined);assert.equal(d.values.JAGO.Total_Assets.FY2024,base.values.JAGO.Total_Assets.FY2024);
});
test('formulas rejected in uploaded financial cells',()=>{
 const c=wb.getWorksheet('Detail Upload').getCell('F8'),old=c.value;c.value={formula:'1+1',result:2};assert.throws(()=>payloadFromWorkbook(wb),/formula/);c.value=old;
});
test('preview never writes; stale revisions cannot commit; backups precede conditional writes',async()=>{
 const d=structuredClone(base);d.meta.revision='initial';const writes=[];
 const deps={read:async()=>({dataset:d,etag:'etag1'}),write:async(...args)=>{writes.push(args);}};
 await apply({payload:excel,revision:'initial',commit:false},deps);assert.equal(writes.length,0);
 await assert.rejects(apply({payload:excel,revision:'stale',commit:true},deps),e=>e.status===409);assert.equal(writes.length,0);
 await apply({payload:excel,revision:'initial',commit:true},deps);assert.equal(writes.length,2);assert.match(writes[0][0],/backups/);assert.equal(writes[1][2].ifMatch,'etag1');
});
test('admin session is signed, expires and requires same-origin JSON',()=>{
 process.env.DIGIMETRIC_ADMIN_PASSWORD='unit-test-only-secret-123';process.env.BLOB_STORE_ID='test-only';
 const token=session(10000);assert.equal(authorized({headers:{cookie:'digimetric_admin='+token}},11000),true);
 assert.equal(authorized({headers:{cookie:'digimetric_admin='+token+'x'}},11000),false);
 assert.equal(authorized({headers:{cookie:'digimetric_admin='+token}},4000000),false);
 assert.equal(writeGuard({headers:{origin:'https://digimetric.vercel.app',host:'digimetric.vercel.app','content-type':'application/json'}}),true);
 assert.equal(writeGuard({headers:{origin:'https://attacker.test',host:'digimetric.vercel.app','content-type':'application/json'}}),false);
 delete process.env.DIGIMETRIC_ADMIN_PASSWORD;delete process.env.BLOB_STORE_ID;
});
