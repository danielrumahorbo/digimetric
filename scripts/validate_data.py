import json, math, csv
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'data/dashboard_data.json').read_text(encoding='utf-8'))
bs=list(d['banks']); p=d['meta']['latestPeriod']
assert len(bs)==12 and p=='Q2-2026'
assert set(d['sources'])==set(bs)
for b in bs:
    v=d['values'][b]
    for m in ['Total_Assets','Loans','DPK','Net_Income','NPL_gross','CAR','CASA']:
        assert isinstance(v[m][p],(int,float)) and math.isfinite(v[m][p]),(b,m)
    assert v['Total_Assets'][p]>0 and v['DPK'][p]>0 and v['Loans'][p]>=0
    assert 0<=v['CASA'][p]<=100
    assert d['sources'][b]['url'].startswith('https://drive.google.com/file/d/')
for m in ['Total_Assets','Loans','DPK','Net_Income']:
    total=sum(d['values'][b][m][p] for b in bs)
    assert abs(sum(d['values'][b][m+'_Share'][p] for b in bs)-100)<0.00001
    for b in bs: assert abs(d['values'][b][m+'_Share'][p]-d['values'][b][m][p]/total*100)<0.000001
for m in ['ROA','NIM','BOPO','CIR','LDR']:
    assert p not in d['values']['RAYA'].get(m,{}),m
raw=json.loads((root/'data/reviewed_q2_2026.json').read_text(encoding='utf-8'))
for b,r in raw.items():
    assert abs(sum(r[k] for k in ['giro','tabungan','deposito'])-d['values'][b]['DPK'][p])<0.000001
    assert abs((r['giro']+r['tabungan'])/r['DPK']*100-d['values'][b]['CASA'][p])<0.000001
audit=list(csv.DictReader((root/'data/q2_2026_audit.csv').open(encoding='utf-8-sig')))
assert len(audit)==sum(p in values for b in bs for values in d['values'][b].values())
print(f'PASS: {len(bs)} banks, {len(audit)} audited Q2 observations, shares sum to 100%, missing ratios preserved.')

# Validate the newly imported period against reviewed source transcription.
q='Q2-2025'
reviewed=json.loads((root/'data/reviewed_q2_2025.json').read_text(encoding='utf-8'))
assert len(d['periods'])==9 and set(d['sourcesByPeriod'][q])==set(bs)
for b,r in reviewed.items():
    v=d['values'][b]
    for metric,key in {'Total_Assets':'assets','Loans':'loans','Net_Income':'income'}.items():
        assert math.isclose(v[metric][q],r[key],abs_tol=1e-8),(b,metric)
    deposits=sum(r[k] for k in ['giro','tabungan','deposito'])
    assert math.isclose(v['DPK'][q],deposits,abs_tol=1e-8)
    assert math.isclose(v['CASA'][q],(r['giro']+r['tabungan'])/deposits*100,abs_tol=1e-8)
    assert math.isclose(v['Net_Income_YoY'][q],(r['income']-r['priorIncome'])/abs(r['priorIncome'])*100,abs_tol=1e-8)
    for metric in ['Total_Assets','Loans','DPK']:
        assert math.isclose(v[metric+'_YoY'][p],(v[metric][p]/v[metric][q]-1)*100,abs_tol=1e-8)
    for metric in ['ROA','NIM','CIR','BOPO','NPL_gross','CAR','LDR','LCR','NSFR']:
        if metric in r:
            assert v[metric][q]==r[metric],(b,metric)
        else:
            assert q not in v.get(metric,{}),(b,metric)
for metric in ['Total_Assets','Loans','DPK','Net_Income']:
    assert math.isclose(sum(d['values'][b][metric+'_Share'][q] for b in bs),100,abs_tol=1e-7)
new_audit=list(csv.DictReader((root/'data/q2_2025_audit.csv').open(encoding='utf-8-sig')))
assert len(new_audit)==194==sum(q in values for b in bs for values in d['values'][b].values())
assert len({(r['Bank'],r['Metrik'],r['Periode']) for r in new_audit})==194
for row in new_audit:
    assert float(row['Nilai'])==d['values'][row['Bank']][row['Metrik']][q]
    assert row['Sumber']==d['sourcesByPeriod'][q][row['Bank']]['url']
assert d['values']['ALADIN']['Net_Income'][q]==83.123
assert d['sourcesByPeriod'][p]['ALADIN']['comparativeIncome']==80.036
print('PASS: 194 Q2 2025 observations, 36 balance YoY values, source links and separate Aladin income bases.')
