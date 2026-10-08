"""Complete missing FY2025 Jago financials from audited official statements."""
import json,csv,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'data/dashboard_data.json'
d=json.loads(path.read_text(encoding='utf8'))
p='FY2025';b='JAGO'
url='https://assets.jago.com/web-assets/public/LKFS_PT%20Bank%20Jago%20Tbk_31%20Dec%2025_combined.pdf'
raw={'assets':36507.347,'loans':24346.604,'giro':4875.714,'tabungan':7971.747,'deposito':12749.872,'mudharabah':301.158,'income':276.234,'priorAssets':28542.712,'priorLoans':17701.486,'priorDPK':18598.409,'priorIncome':128.518,'unit':'Rp miliar','pages':{'assets':11,'loans':11,'deposits':12,'income':14},'url':url}
(root/'data/reviewed_jago_fy2025.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
deposits=sum(raw[k] for k in ['giro','tabungan','deposito','mudharabah'])
values={'Total_Assets':raw['assets'],'Loans':raw['loans'],'DPK':deposits,'Net_Income':raw['income'],'CASA':(raw['giro']+raw['tabungan'])/deposits*100}
for m,k in [('Total_Assets','priorAssets'),('Loans','priorLoans'),('DPK','priorDPK'),('Net_Income','priorIncome')]:values[m+'_YoY']=(values[m]/raw[k]-1)*100
for m,v in values.items():d['values'][b].setdefault(m,{})[p]=round(v,9)
# Restoring Jago changes sector denominators. Update all FY2025 shares together.
for m in ['Total_Assets','Loans','DPK','Net_Income']:
    total=sum(d['values'][bank][m][p] for bank in d['banks'])
    for bank in d['banks']:d['values'][bank].setdefault(m+'_Share',{})[p]=round(d['values'][bank][m][p]/total*100,9)
s={'name':'JAGO FY2025 — Laporan keuangan auditan','url':url,'period':p,'date':'2025-12-31','originalUnit':'Rp juta','incomeBasis':'Januari–Desember 2025','comparativeIncome':raw['priorIncome'],'verifiedMetrics':list(values)+[m+'_Share' for m in ['Total_Assets','Loans','DPK','Net_Income']],'pages':raw['pages'],'notes':['Angka utama FY2025 dilengkapi dari laporan keuangan auditan resmi Bank Jago, halaman PDF 11, 12 dan 14.','Kredit mencakup kredit dan pembiayaan syariah bruto. DPK mencakup giro, tabungan, deposito berjangka dan deposito mudharabah nasabah.','YoY menggunakan angka FY2024 dalam laporan auditan yang sama. Rasio publikasi FY2025 selain CASA diwarisi dari dataset awal dan belum diverifikasi ulang.']}
d['sourcesByPeriod'].setdefault(p,{})[b]=s
d['meta']['periodNotes'][p]='Angka utama Bank Jago dilengkapi dari laporan auditan FY2025. Pangsa FY2025 dihitung ulang dengan cakupan 12 bank. Data bank lain dan rasio historis tetap berasal dari dataset awal.'
d['meta']['historicalData']='FY2021–Q1 2026 selain Q2 2025 dan angka utama Jago FY2025 diwarisi dari dataset repo awal dan belum diverifikasi ulang. Q2 2025 dan Q2 2026 ditranskripsi dari laporan Drive; angka utama Jago FY2025 dari laporan auditan resmi bank.'
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
with (root/'data/fy2025_audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['Bank','Metrik','Periode','Nilai','Satuan','Sumber'])
    for m in values:w.writerow([b,m,p,d['values'][b][m][p],d['metrics'][m]['unit'],url])
    for m in ['Total_Assets','Loans','DPK','Net_Income']:w.writerow([b,m+'_Share',p,d['values'][b][m+'_Share'][p],'%',url])
assert math.isclose(deposits,25898.491,abs_tol=1e-8)
print('Completed Jago FY2025:',values)
