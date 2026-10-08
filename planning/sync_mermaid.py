"""Generate a semantic mirror. Edit Archify JSON, never this mirror's facts."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sections = ['# HSAAS 长期图源语义镜像\n\n> 2026-10-08：旧六图尚未同步动态 QR entry/grant、coordinator/独立 module chat 与当前 disabled 策略。本文仅忠实镜像旧图源，不是新范围规范；当前需求/架构/API/协作以 [03](03_REQUIREMENTS_AND_TEST_PLAN.md)、[02](02_TECHNICAL_ARCHITECTURE.md)、[04](04_DATA_MODEL_AND_API_PLAN.md)、[12](12_THREE_MONTH_CHAT_PLAN.md) 为准。\n\n生成来源：diagrams/v3/*.archify.json。图源是编辑面，本文用于文本比较；样式与布局以 Archify HTML 为准。生成命令：`python planning/sync_mermaid.py`。\n\n目录图是导航/集成关系，不是磁盘父子树；完整层级见 [09](09_FOLDER_STRUCTURE.md)。所有业务流程为目标设计，不是已实现证据。\n']
def quoted(s):
    return s.replace('"', '&quot;').replace('\n', ' ')
for p in sorted((ROOT/'diagrams/v3').glob('*.archify.json')):
    d=json.loads(p.read_text(encoding='utf-8'))
    name=p.name.replace('.archify.json','')
    sections.append(f'## {d["meta"]["title"]}\n\n[打开 Archify](diagrams/v3/{name}.html)\n\n```mermaid')
    if d['diagram_type']=='sequence':
        sections.append('sequenceDiagram')
        for n in d['participants']:
            sections.append(f'    participant {n["id"]} as {n["label"]}')
        for e in d['messages']:
            arrow='-->>' if e.get('variant') in ['return','dashed'] else '->>'
            sections.append(f'    {e["from"]}{arrow}{e["to"]}: {e["label"]}')
    else:
        sections.append('flowchart LR')
        nodes=d.get('components',d.get('nodes',[]))
        for n in nodes:
            sections.append(f'    {n["id"]}["{quoted(n["label"])}<br/>{quoted(n.get("sublabel",""))}"]')
        for e in d.get('connections',d.get('edges',[])):
            sections.append(f'    {e["from"]} -->|"{quoted(e["label"])}"| {e["to"]}')
    sections.append('```\n')
(ROOT/'08_MERMAID_DIAGRAMS.md').write_text('\n'.join(sections)+'\n',encoding='utf-8')
print('Synced 08_MERMAID_DIAGRAMS.md from 6 Archify specifications')
