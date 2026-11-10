---
type: folder-contract
updated: 2026-11-10
---
# planning 契约

输入：用户已确认需求、实际源码、版本化迁移、Implementation/docs/evidence/ 的历史证据，以及 SUI_TESTNET.md 所列官方资料。
职责：保存当前有效的需求、架构、数据/API、开发优先级、环境和修改影响；一个事实只在其归属文件维护。README.md 路由，10_BASELINE_REVIEW.md 保存当前交付/未决状态。
输出：当前 Markdown 规范、_templates/ 稳定模板，以及只读文档检查脚本 verify_planning.py。
人工检查：业务政策与真实接口是否获批；未执行明确 NOT_RUN；不将历史 PASS 或构建结果当成当前业务验收。
边界：已替代的模块协调日志/旧图/生成器不继续维护；Git 保存历史。本机启动不操作旧 hsaas_db 或认领其他环境；后续 Sui Testnet 的部署和真实外部调用需要用户明确启动该工作。
