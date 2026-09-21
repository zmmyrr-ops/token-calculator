# AI 眼里的你：Claude Code 入口

- ✅ 网页并列展示 Codex、Claude Code、豆包 / DeepSeek；切换本机平台重新确认授权。
- ✅ 创建任务保存 source=claude_code，旧任务按 Codex 兼容；状态和指令显示对应平台。
- ✅ 执行包包含独立 Claude Code CLI JSONL 适配器；manifest 和 ZIP 同步重建。
- ✅ 后台画像平台筛选加入 Claude Code。
- ✅ 单元验证：时间范围、当前会话、执行标记、子代理、工具输出、去重、只读，以及后台筛选。
- ✅ 类型检查和 lint。
- 待完成：真实 Claude Code 客户端端到端试用、部署上线。

## 用户操作

1. 打开网页版 /ai-eyes，选择“使用 Claude Code”。
2. 选择最近 7 或 30 天，阅读并勾选授权，生成专属指令。
3. 在本机 Claude Code CLI 新会话中粘贴指令，按客户端提示批准必要的文件和网络访问。
4. 执行成功后回原页面或使用私密领取链接查看结果。

需要 Python 3.10+ 与本机保留的 CLI 历史。默认读取 ~/.claude/projects/*/*.jsonl；设置 CLAUDE_CONFIG_DIR 时使用该目录，不跨平台补读。最多 10 会话、每会话 15 条和 2000 字符、合计 20000 字符。清洗样本仅进入当前模型上下文，网站只接收类型与脱敏概括。历史清理或结构不兼容时如实失败，不生成虚构结果。

官方目录说明：https://code.claude.com/docs/en/sessions

不保证 Claude 桌面端、云端或未知版本日志兼容；不安装持久 hook/skill，不修改用户历史。
