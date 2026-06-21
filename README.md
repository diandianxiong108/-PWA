# 任务管家 V2（个人版）

独立于原版的 V2：小程序式主页、逐日历史/未来计划、周任务批次、财务联动、手写 OCR，以及华为 HarmonyOS 4.3 兼容的 Android 通知与重要闹钟。

## 云端构建 APK

GitHub Actions 在云端安装 Android SDK 并生成签名 APK，不占用本机 Android Studio 空间。

1. 打开 Actions → Build Huawei APK。
2. 等待构建成功。
3. 在构建详情底部下载 `task-manager-v2-huawei`。

签名密钥仅保存在 GitHub Actions Secrets；仓库不包含任务数据、线上密钥或数据备份。

## AI 助手记忆系统

`ai-memory.js` 使用三个独立的 localStorage 命名空间，不修改任务或账单模型：

- `tm_ai_user_profile_v1`：固化规划原则、任务量、家务量、建议时间与学习出的偏好。
- `tm_ai_weekly_summary_v1`：最多保留 16 周压缩摘要及短期对话摘要。
- `tm_ai_feedback_log_v1`：最多保留 400 条“采纳/跳过”反馈，用于生成偏好或避开规则。

每次发送 AI 对话前，系统自动组装“长期底色 + 最近两周摘要 + 学习规则 + 反馈统计”的增强上下文，只发送压缩结果。点击“新对话”仅清空短期聊天；长期记忆不会删除。

AI 对话顶部提供“本周摘要”和“我的记忆”按钮。记忆页面可以查看并修改固化习惯；AI建议仅能使用普通通知，不能自动升级为重要闹钟。
