# 后续 Sui Testnet：本机工具与远程网络

核对日期：2026-11-10。结论：本项目无需容器。应用、数据库和后续worker在本机运行，通过已有远程Testnet接口交互；不自己运行full node或validator，也不把Testnet改成localnet。

## 官方依据

- [Install Sui](https://docs.sui.io/getting-started/onboarding/sui-install)：安装本机CLI，可构建/发布Move包和管理地址；文档有Windows安装入口。
- [Networks](https://docs.sui.io/develop/sui-architecture/networks)：Testnet官方RPC为 `https://fullnode.testnet.sui.io:443`；使用faucet测试币，数据持久性不保证。
- [Sui Client CLI](https://docs.sui.io/references/cli/client)：CLI配置网络并执行发布、查询、交易等操作。

上述客户端+远程网络路径没有自建节点前提，因此可以移除本项目的全部容器运行/测试依赖。自建节点的运维教程不属于本项目方案。

## 后续实施顺序（尚未启动）

1. 在获得该模块开发许可后，选定并锁定与Testnet兼容的Sui工具链及官方SDK版本；核对当时的官方接口和安装方式。
2. 使用独立测试钱包、Testnet地址和faucet测试SUI；私钥只在本机受控密钥存储/环境，不进入前端、代码或证据。
3. 本机构建/检查Move包，用户明确授权后发布到Testnet；记录network/package/object/capability及版本。未发布不能显示链可用。
4. 本机worker轮询MySQL durable outbox，在锁外签名/提交/查询远程Testnet；eventId幂等、短lease和未知提交对账，不阻断柜台业务。
5. 做低gas、超时/限流、崩溃恢复、重复eventId与真实proof核对，再决定启用。旧本地事件不自动回填队列。

链仅承载非敏感canonical commitment/关联信息，不上传IC、MRN、患者、电话、地址或登记原文。Testnet活动公开，可能清空；业务原始记录/证据仍以受控MySQL和匹配密钥备份为准。

当前 `BLOCKCHAIN_MODE=disabled`，未实施worker、未发布Move包、未创建钱包或测试交易。本次查证和文档清理不改变此状态。
