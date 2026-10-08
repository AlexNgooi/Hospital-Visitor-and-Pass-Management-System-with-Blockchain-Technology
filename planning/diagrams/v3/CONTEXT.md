# Archify v3 契约

单一职责：保存当前设计的可编辑图源和绑定的交付证据。

输入：../../02_TECHNICAL_ARCHITECTURE.md、../../03_REQUIREMENTS_AND_TEST_PLAN.md、../../04_DATA_MODEL_AND_API_PLAN.md、../../09_FOLDER_STRUCTURE.md。

2026-10-08 语义状态：六张图源/HTML 保留完整长期架构，尚未包含动态 QR entry/grant、coordinator/module chat 与当前 disabled 模式。index/manifest/08 显式标注待同步；artifact/视觉验证仅适用于原交付。新需求按 02/03/04/12，不拿旧图的默认 mock/消息任务作为当前启用策略。本轮仅更新导航提示，不改六个图源或图 artifact/视觉收据。

处理：编辑对应 .archify.json -> validate showcase -> deliver -> visual-check -> 图片检查。HTML 只从当前 JSON 交付，不手改 renderer 生成内容；deliver 后修改源必须重走验证。workflow 使用 schema_version=2。

输出：01-06 的 JSON/HTML、delivery receipts、browser receipts/PNG、review-receipt.json、index.html。JSON 是图事实的编辑面；08_MERMAID_DIAGRAMS.md 是语义镜像，由 ../../sync_mermaid.py 生成。

人工检查：节点/关系真实、明暗无重叠、四种 viewport 无 overflow；自动browser收据和人工检查结论分开。图完成不代表线上业务实现。
