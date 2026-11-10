# Implementation 契约

输入：planning/README.md路由到当前需求、架构、数据/API和状态；所属组件CONTEXT约束本地边界。
职责：正式前后端、版本化迁移、本机运行工具与交付证据。实际Java包保持eduupm.hsaas；前后端共享wire需同步。
输出：有准确英文注释的源码与运行配置；dist/target/node_modules/tmp及私有配置/keys/备份不提交。
验证：必要frontend build/lint、backend skip-tests package、脚本语法及文档检查。实际应用、数据库、浏览器/业务和恢复由用户手动运行。
运行入口：docs/runbooks/MANUAL_NATIVE.md；业务手测：MANUAL_R01_R03.md；隔离SQL测试：backend/LOCAL_TESTING.md。
边界：不自动merge main/push/部署/执行迁移；本机demo与随机测试库隔离，不访问原hsaas_db。链和通知默认disabled，不自动启动后续模块。
