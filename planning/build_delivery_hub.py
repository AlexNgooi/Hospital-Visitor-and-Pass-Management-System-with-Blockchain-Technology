"""Generate navigation only, preserving the six trusted Archify artifacts."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT/'diagrams/v3'
diagrams=[]
for p in sorted(OUT.glob('*.archify.json')):
    spec=json.loads(p.read_text(encoding='utf-8'))
    name=p.name.replace('.archify.json','')
    delivery=json.loads((OUT/(name+'.delivery.json')).read_text(encoding='utf-8'))
    browser=json.loads((OUT/(name+'.visual-check.json')).read_text(encoding='utf-8'))
    diagrams.append({'name':name,'title':spec['meta']['title'],'type':spec['diagram_type'],
        'specification_sha256':delivery['specification']['sha256'],
        'artifact_sha256':delivery['artifact']['sha256'],
        'specification_bytes':delivery['specification']['bytes'],
        'artifact_bytes':delivery['artifact']['bytes'],
        'validation':delivery['validation'],
        'browser_evidence':'passed' if browser['status']=='pass' else browser['status']})
(OUT/'delivery-manifest.json').write_text(json.dumps({'revision':'current','date':'2026-10-05','diagrams':diagrams},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
links=[]
descriptions=['组件与部署目标，数据库与集成边界','上下文入口与模块导航，完整层级在下方','四类登记、审核、NFC发卡与单条消息','实体归还、内部逾期告警、遗失恢复','扫描任务、设备证据、原子业务提交','Sui证明与WhatsApp分别处理，未知结果先核查']
for i,d in enumerate(diagrams):
    links.append(f'<a class="tile" href="{d["name"]}.html"><span class="number">0{i+1} / {d["type"]}</span><h2>{html.escape(d["title"].split(" · ",1)[-1])}</h2><p>{descriptions[i]}</p><span class="open">打开交互图 ↗</span></a>')
tree=(ROOT/'09_FOLDER_STRUCTURE.md').read_text(encoding='utf-8').split('```text\n',1)[1].split('```',1)[0]
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HSAAS 当前架构与流程图</title>
<style>
:root{font-family:Segoe UI,Microsoft YaHei,sans-serif;color:#172638;background:#f4f7fb}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:48px 28px}header{border-left:5px solid #CA0026;padding-left:22px;margin-bottom:28px}h1{font-size:32px;margin:10px 0}h2{font-size:20px;margin:12px 0}p{color:#526277;line-height:1.7;margin:0 0 16px}.tag{font-size:13px;letter-spacing:.08em;color:#9d1430}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.tile{display:block;color:inherit;text-decoration:none;background:#fff;border:1px solid #dae2eb;border-radius:16px;padding:24px;min-height:208px;box-shadow:0 4px 18px #12233a06}.tile:hover{border-color:#CA0026;box-shadow:0 5px 20px #CA002610}.tile:focus-visible{outline:3px solid #CA0026;outline-offset:4px}.number{font-size:12px;color:#738299}.open{font-size:14px;color:#b01b38}.note{margin:26px 0;background:#eaf1f7;border-radius:12px;padding:20px}details{background:#fff;border:1px solid #dae2eb;border-radius:12px;padding:20px;margin-top:18px}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.6;color:#26384d}footer{margin-top:24px;font-size:13px;color:#68768b}footer a{color:#8b1934}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){main{padding:28px 18px}.grid{grid-template-columns:1fr}h1{font-size:26px}}
</style><main><header><span class="tag">HSAAS / FYP · 2026-10-05 · current</span><h1>架构、目录与业务流程</h1><p>基于现有 proposal、实施指南与 UI v4 的当前设计。六张 Archify 图支持明暗主题、缩放、关系追踪和导出。</p></header><section class="grid" aria-label="六张设计图">'''+''.join(links)+'''</section><div class="note"><strong>当前为实施设计。</strong><p>正式应用尚未创建。批准登记与发卡分开；NFC证据由设备任务绑定；每次借用只有一条组合WhatsApp任务；消息与链上故障独立处理。</p><small>每图已通过 9/9 showcase 校验，四种桌面视口的浏览器检查已通过。完整哈希和检查状态见交付收据。</small></div><details><summary>展开完整目标目录树</summary><pre>'''+html.escape(tree)+'''</pre></details><footer><a href="delivery-manifest.json">交付与哈希收据</a> · <a href="review-receipt.json">人工截图检查记录</a> · 需求与API文档入口：planning/README.md。硬件、医院接口、真实消息通道与保留策略仍有待确认事项。</footer></main></html>'''
(OUT/'index.html').write_text(page,encoding='utf-8')
print('Generated navigation hub and artifact-bound manifest')
