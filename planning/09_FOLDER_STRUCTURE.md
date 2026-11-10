# 当前目录与职责

| 路径 | 职责 |
|---|---|
| AGENTS.md / CONTEXT.md | 小型导航、授权和工作区契约 |
| planning/ | 当前规范与状态；README/PROJECT_MAP为入口，_templates为稳定模板 |
| Implementation/frontend/src/app/ | 登录/角色、共享shell、导航、counter上下文 |
| Implementation/frontend/src/features/ | registration-qr、registration、counter/review/lifecycle、administration |
| Implementation/backend/src/main/java/eduupm/hsaas/ | auth/config/common、registrationentry、registration/review、assignment、inventory、administration/reporting |
| Implementation/backend/src/main/resources/db/migration/ | 已版本化V1–V9，只追加forward migration |
| Implementation/scripts/ | 本机启动/备份/停止、合成seed和子进程环境隔离 |
| Implementation/infra/ | 本机配置模板；私有实际配置被忽略 |
| Implementation/backend/src/test/ | 纯单元与显式启用的独立本机MySQL测试，testing/为隔离helper |
| Implementation/frontend/tests/ | 组件/API/proxy等测试；历史容器E2E启动器已退役，业务浏览器手测使用实际应用 |
| Implementation/docs/runbooks/ | 当前native运行与R01–R03业务手测指南 |
| Implementation/docs/evidence/ | 历史交付/检查收据；原PASS仅属于当时版本 |
| Implementation/sui-worker/ / move/ | 后续链集成保留位置，不代表当前实现 |
| Implementation/tmp/ | 忽略的运行日志、control、keys和私有备份 |
| output/ | 既有导出原型/材料，非当前代码或运行指南 |

修改影响见 [PROJECT_MAP](PROJECT_MAP.md)。已移除的旧planning图、Figma导入资产和生成脚本由Git历史保留，不另建archive副本。
