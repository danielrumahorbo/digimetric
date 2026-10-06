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
