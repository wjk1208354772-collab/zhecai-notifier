# 浙采雷达免费云端通知

独立于 Sites 网页的采购监测程序。复用三家官方来源和九类业务筛选，包含农村生活污水运维、泵站养护。不会改动已发布网页。

## 启用

1. 在自己的 GitHub 账号新建公开仓库 `zhecai-notifier`，勾选 Add README。将本目录全部文件（含 `.github/workflows/monitor.yml`）放入仓库默认分支。
2. 仓库 Settings → Secrets and variables → Actions → Secrets → New repository secret：Name 填 `WXPUSHER_SPT`，Secret 填自己获得的完整 SPT。不要写入代码、Issues 或聊天。
3. Actions → Zhecai procurement monitor → Run workflow → mode 选 `test`。确认手机实际收到测试消息。平台受理不代表微信送达，App 登录也不等于绑定微信 ClawBot；应在接收端核实。
4. 再手动运行 `scan`，确认三个来源在云端能访问，检查运行记录和第一条基线通知。
5. 上述验证完成后，在 Settings → Secrets and variables → Actions → Variables 创建 `MONITOR_ENABLED`，值为 `true`。此后约每30分钟检查，电脑无需开机。改成 `false` 可停止定时扫描。

## 费用和运行限制

- 仅使用公开仓库的标准 Ubuntu runner。按 GitHub 当前规则，执行分钟免费；不使用收费大规格 runner、付费服务器，也不上传 Actions artifacts。WxPusher 当前基础推送免费。服务政策以后可能变更。
- 调度在每小时17、47分（UTC，对北京时间分钟相同），可能延迟或跳过，不能保证实时。公开仓库长期无活动时 GitHub 可能停用定时任务；请留意 Actions 状态。
- 每次最多运行25分钟。官方来源可能出现验证、限流、地域限制或接口变化。云端首次扫描通过前，不应认为监测已经可用。
- 免费接收通道是否是微信聊天，以实际绑定和测试为准。

## 通知行为

- 首次完整扫描各来源建立基线，不补发全部历史公告；之后通知新发现公告、原公告正文/金额/截止时间等内容变化。
- 每次汇总到少量消息，包含项目名称、类别、采购人、地区、预算、官方原文链接。
- 只对明确提取截止时间、关联公告已核查且没有后续变更迹象的公告发一次3天内提醒。政府采购采集器目前没有明确的关联完整性标记，因此暂不对该来源发送截止提醒，以免误报。
- 不完整来源保留历史状态，一天最多发送一次来源异常提醒，并将工作流标记为失败。没有变化时不发项目消息。
- 标题/业务词筛选可能遗漏项目；检测到的正文变化仍需阅读官方原文确认。

## 状态和安全

`monitor-state.json` 会公开保存公告指纹、公开项目摘要、待发消息及检查时间，不保存推送密钥和收件人资料。正文全文不进入状态文件。

发送前先提交 `dispatching` 状态，再调用接口，受理后保存 `accepted`。这样遇到网络超时或中断不会盲目重发，但结果不确定的消息需要人工核对。请不要删除状态文件或在不核对收信的情况下重置它，否则可能重复或漏发提醒。外部接口无法提供严格的“恰好一次送达”保证。

## 验证

`npm test` 使用模拟数据与模拟推送接口，不实际发消息。真实来源可达性和真实收信必须在云端完成步骤3、4后确认。

官方参考：
- https://wxpusher.zjiecode.com/docs/spt.html
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
