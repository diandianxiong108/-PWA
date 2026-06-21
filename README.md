# 任务管家 V2（个人版）

独立于原版的 V2：小程序式主页、逐日历史/未来计划、周任务批次、财务联动、手写 OCR，以及华为 HarmonyOS 4.3 兼容的 Android 通知与重要闹钟。

## 云端构建 APK

GitHub Actions 在云端安装 Android SDK 并生成签名 APK，不占用本机 Android Studio 空间。

1. 打开 Actions → Build Huawei APK。
2. 等待构建成功。
3. 在构建详情底部下载 `task-manager-v2-huawei`。

签名密钥仅保存在 GitHub Actions Secrets；仓库不包含任务数据、线上密钥或数据备份。
