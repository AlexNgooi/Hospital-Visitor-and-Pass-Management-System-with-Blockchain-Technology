"""Validate editable specs; optionally redeliver and collect browser evidence."""
import argparse,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--deliver',action='store_true'); args=p.parse_args()
root=Path(__file__).resolve().parents[1]; folder=root/'planning/diagrams/v3'
cli=Path.home()/'.agents/skills/archify/bin/archify.mjs'
for spec in sorted(folder.glob('*.archify.json')):
 kind=json.loads(spec.read_text(encoding='utf-8'))['diagram_type']; name=spec.name.replace('.archify.json','')
 actions=['validate','deliver','visual-check'] if args.deliver else ['validate']
 for action in actions:
  command=['node',str(cli),action]
  if action=='visual-check': command += [str(folder/(name+'.html')),'--json']
  else:
   command += [kind,str(spec)]
   if action=='deliver': command += [str(folder/(name+'.html'))]
   command += ['--quality','showcase','--json']
  result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',cwd=root)
  data=json.loads(result.stdout)
  print(json.dumps({'diagram':name,'action':action,'exit':result.returncode,'ok':data.get('ok'),'composition':data.get('composition',{}).get('summary')},ensure_ascii=True))
  if action=='deliver': (folder/(name+'.delivery.json')).write_text(result.stdout,encoding='utf-8')
  if result.returncode: print(result.stdout); raise SystemExit(result.returncode)
if args.deliver: print('Regenerate hub/mirror and review current screenshots; do not reuse stale review receipts.')
