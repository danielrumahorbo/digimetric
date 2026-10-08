"""Merge the reviewed Q2 2025 Drive reports without rewriting earlier periods."""
import json,csv
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'data/dashboard_data.json'
d=json.loads(path.read_text(encoding='utf8'))
raw=json.loads((root/'data/reviewed_q2_2025.json').read_text(encoding='utf8'))
catalog=json.loads((root/'data/drive_register_20261008.json').read_text(encoding='utf8'))
p='Q2-2025'
source_map={r['bank']:r for r in catalog}
period_sources=d.setdefault('sourcesByPeriod',{})
period_sources['Q2-2026']=d['sources']
period_sources[p]={}
mapped={'Total_Assets':'assets','Loans':'loans','Net_Income':'income'}
ratios=['ROA','NIM','CIR','BOPO','NPL_gross','CAR','LDR']
for b,r in raw.items():
 r['DPK']=r['giro']+r['tabungan']+r['deposito']
 r['CASA']=(r['giro']+r['tabungan'])/r['DPK']*100
 values={m:r[k] for m,k in mapped.items()}
 values.update({m:r[m] for m in ratios+['DPK','CASA'] if m in r})
 values['Net_Income_YoY']=(r['income']-r['priorIncome'])/abs(r['priorIncome'])*100
 for m,v in values.items():d['values'][b].setdefault(m,{})[p]=round(v,9)
 f=source_map[b]
 notes=r['notes']+['LCR dan NSFR tidak tersedia dalam laporan yang ditinjau.']
 period_sources[p][b]={'name':f['name'],'url':f['url'],'period':p,'date':'2025-06-30','originalUnit':'Rp ribu' if b=='RAYA' else 'Rp juta','incomeBasis':'Kumulatif Januari–Juni 2025','comparativeIncome':r['priorIncome'],'notes':notes,'pages':r['pages']}
for m in ['Total_Assets','Loans','DPK','Net_Income']:
 total=sum(d['values'][b][m][p] for b in raw)
 for b in raw:
  d['values'][b].setdefault(m+'_Share',{})[p]=round(d['values'][b][m][p]/total*100,9)
  # Q2 2026 balance-sheet YoY becomes available once the matching H1 is imported.
  if m!='Net_Income':
   d['values'][b].setdefault(m+'_YoY',{})['Q2-2026']=round((d['values'][b][m]['Q2-2026']/d['values'][b][m][p]-1)*100,9)
if p not in d['periods']:d['periods'].insert(d['periods'].index('FY2025'),p)
d['periodType'][p]='Q2 (interim)'
d['periodType']['Q2-2026']='Q2 (interim)'
d['meta']['updatedAt']='2026-10-08'
d['meta']['historicalData']='FY2021–Q1 2026 selain Q2 2025 diwarisi dari dataset repo awal dan belum diverifikasi ulang. Q2 2025 dan Q2 2026 ditranskripsi dari laporan Drive.'
d['meta']['periodNotes']={p:'Laba adalah publikasi asli H1 2025. Laba Aladin Rp83,123 miliar berbeda dari pembanding Rp80,036 miliar dalam laporan Q2 2026; penyebab selisih belum dijelaskan.', 'Q2-2026':'YoY laba memakai kolom H1 2025 pada laporan Q2 2026 untuk basis yang sama. YoY aset, kredit dan DPK memakai laporan Q2 2025; perubahan neraca pada KPI tetap QoQ.'}
d['meta']['methodology']=[('Pertumbuhan laba Q2 membandingkan laba kumulatif Januari–Juni dengan kolom pembanding tahun sebelumnya dalam laporan periode yang sama: (laba kini − laba pembanding) / |laba pembanding| × 100.' if t.startswith('Pertumbuhan laba Q2') else t) for t in d['meta']['methodology']]
d['meta']['methodology'].append('Q2 2025 memakai publikasi asli. Laba pembanding dalam laporan Q2 2026 disimpan terpisah; selisih Aladin dicatat dan tidak ditimpa.') if 'Q2 2025 memakai publikasi asli. Laba pembanding dalam laporan Q2 2026 disimpan terpisah; selisih Aladin dicatat dan tidak ditimpa.' not in d['meta']['methodology'] else None
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for per in [p,'Q2-2026']:
 with (root/('data/'+per.lower().replace('-','_')+'_audit.csv')).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f);w.writerow(['Bank','Metrik','Periode','Nilai','Satuan','Basis','Sumber','Catatan'])
  for b in d['banks']:
   s=period_sources[per][b]
   for m in d['metrics']:
    v=d['values'][b].get(m,{}).get(per)
    if v is not None:w.writerow([b,m,per,v,d['metrics'][m]['unit'],'Kumulatif Jan–Jun' if m=='Net_Income' else 'YoY H1' if m.endswith('_YoY') else 'Posisi/rasio publikasi',s['url'],'; '.join(s['notes'])])
print('Imported Q2 2025:',sum(p in vals for b in raw for vals in d['values'][b].values()),'observations; Q2 2026 balance YoY added: 36')
