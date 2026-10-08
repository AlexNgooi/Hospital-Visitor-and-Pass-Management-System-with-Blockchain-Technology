"""Bounded planning QA: links, IDs, frozen artifacts, ICM entry and evidence."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[1]
PLANNING=ROOT/'planning'
issues=[]
paths=[ROOT/'AGENTS.md',ROOT/'CONTEXT.md',PLANNING/'README.md',PLANNING/'CONTEXT.md',PLANNING/'PROJECT_MAP.md']
paths += list(PLANNING.glob('[01][0-9]_*.md'))
paths += list((PLANNING/'_templates').glob('*.md'))
paths += [ROOT/'Implementation/CONTEXT.md',ROOT/'Implementation/docs/CONTEXT.md',PLANNING/'diagrams/v3/CONTEXT.md']
links=0
for p in paths:
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
        if target.startswith(('http:','https:','#')): continue
        target=unquote(target.split('#',1)[0])
        if not target: continue
        links+=1
        if not (p.parent/target).exists(): issues.append(f'Broken link: {p.name}: {target}')
requirements=(PLANNING/'03_REQUIREMENTS_AND_TEST_PLAN.md').read_text(encoding='utf-8')
ids=re.findall(r'^\| ([RSCPNABD]\d{2}) \|',requirements,re.M)
if len(ids)!=len(set(ids)): issues.append('Duplicate functional requirement IDs')
if len((ROOT/'AGENTS.md').read_text(encoding='utf-8').splitlines())>=60: issues.append('Root catalog too large')
manifest=json.loads((PLANNING/'diagrams/v3/delivery-manifest.json').read_text(encoding='utf-8'))
for d in manifest['diagrams']:
    directory=PLANNING/'diagrams/v3'; name=d['name']
    for extension,key in [('.archify.json','specification_sha256'),('.html','artifact_sha256')]:
        actual=hashlib.sha256((directory/(name+extension)).read_bytes()).hexdigest()
        if actual!=d[key]: issues.append(f'Artifact changed: {name}{extension}')
    if d['validation']['checksPassed']!=9 or d['validation']['errors'] or d['validation']['warnings']: issues.append(f'Validation failed: {name}')
    receipt=json.loads((directory/(name+'.visual-check.json')).read_text(encoding='utf-8'))
    if receipt['status']!='pass': issues.append(f'Browser evidence failed: {name}')
    if receipt['artifact']['sha256']!=d['artifact_sha256']: issues.append(f'Stale browser evidence: {name}')
    review=json.loads((directory/'review-receipt.json').read_text(encoding='utf-8'))
    r=next(x for x in review['diagrams'] if x['name']==name)
    if r['artifact_sha256']!=d['artifact_sha256']: issues.append(f'Stale visual review: {name}')
    if r['visual_review']!='passed': issues.append(f'Visual review not passed: {name}')
result={'status':'pass' if not issues else 'fail','local_links_checked':links,'functional_requirements':len(ids),'artifact_verified_diagrams':len(manifest['diagrams']),'diagram_semantics':'PENDING_SYNC: dynamic QR, coordinator/module chats, disabled integration modes (2026-10-08)','root_catalog_lines':len((ROOT/'AGENTS.md').read_text(encoding='utf-8').splitlines()),'business_tests':'NOT_RUN (planning update; initialized skeleton only)','issues':issues}
(PLANNING/'diagrams/v3/planning-qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))
raise SystemExit(1 if issues else 0)
