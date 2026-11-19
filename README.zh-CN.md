# Video Vocab

[简体中文](README.zh-CN.md) · [English](README.md)

**边看 YouTube，边收藏和复习实用英文表达。**

Video Vocab 是一个 Chrome 扩展，基于 Zara Zhang 的 YouTube Digest 独立改作。它保留了原版的字幕、双语翻译、AI 概览、选中文本讲解和时间戳笔记，并加上按章节学习的 **Vocabulary** 和可以离线使用的**词汇本**。 [原项目](https://github.com/zarazhangrui/youtube-digest) · [MIT 许可证](LICENSE)

适合已有一些英语基础、想从真实视频里积累自然表达的人。只需安装一次扩展，词汇本是扩展生成的 HTML 文件。

[安装](#1-安装到-chrome) · [配置两把 API 密钥](#2-获取并配置-api-密钥) · [看视频学词](#3-看视频学词) · [使用词汇本](#4-建立自己的词汇本) · [许可与署名](#许可与署名)

## 1. 安装到 Chrome

需要桌面版 Chrome 116 或更新版本。下载和安装扩展无需 Node.js，API 用量由各自的服务商结算。

1. 在当前仓库打开 **Releases**，下载最新版的 `video-vocab-v*.zip` 安装包。也可以从 **Code → Download ZIP** 下载当前仓库源码。
2. 解压到一个长期保留的文件夹，例如 macOS 或 Linux 的 `~/Documents/video-vocab`，或 Windows 的 `%USERPROFILE%\Documents\video-vocab`。
3. 在 Chrome 地址栏打开 `chrome://extensions`，启用右上角的「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择你刚才确定的那个准确项目文件夹，其中必须包含 `manifest.json`。
5. 在 Chrome 工具栏的「扩展程序」菜单里找到 **Video Vocab**，点击图钉即可固定。 [Chrome 官方安装说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

**更新版本**时，把新版本文件解压到现有安装目录，在 `chrome://extensions` 的 Video Vocab 卡片上点击「重新加载」，然后从工具栏重新打开。请保留安装目录的位置。如果移动或删除源代码文件夹，Chrome 中加载的扩展会失效，需要从新的位置重新加载。

## 2. 获取并配置 API 密钥

| 密钥 | 用途 |
| --- | --- |
| **Supadata API key** | 读取 YouTube 原生字幕和时间戳 |
| **DeepSeek API key** | 生成概览、翻译、讲解和词汇提取，并可润色笔记 |

### 获取 Supadata API Key

1. 注册或登录 Supadata。首次使用时按页面提示完成新手引导。 [Supadata 注册](https://dash.supadata.ai/auth/sign-up)
2. 打开控制台，找到自己的 API Key 并复制。 [Supadata 控制台](https://dash.supadata.ai/) · [官方接口文档](https://docs.supadata.ai/get-transcript)

### 获取 DeepSeek API Key

1. 登录 DeepSeek **开放平台**，打开 API Keys 页面。 [DeepSeek API Keys](https://platform.deepseek.com/api_keys)
2. 选择创建新密钥，名称可以填 `Video Vocab`。创建后复制密钥。
3. 在开放平台确认账号有可用额度。如果页面提示余额不足，在开放平台处理后再重试。 [DeepSeek API 入门](https://api-docs.deepseek.com/) · [模型与价格](https://api-docs.deepseek.com/quick_start/pricing/)

### 把密钥填进扩展

1. 打开一个有英文字幕的普通 YouTube 视频，然后从 Chrome 工具栏打开 **Video Vocab**。
2. 点击侧边栏右上角的齿轮 **Settings**。也可以在 `chrome://extensions` 的 Video Vocab 卡片里打开扩展选项。
3. 把两把密钥分别粘贴进 **Supadata API key** 和 **DeepSeek API key**，点击 **Save settings**，然后重新打开侧边栏。
4. 先确认 **Transcript** 能加载字幕，再打开 **Overview** 或 **Vocabulary** 验证 AI 功能。

发布版本只支持 DeepSeek Flash，默认模型标识为 `deepseek-flash`，接口地址和模型已经配置好。密钥只填在扩展设置里，请勿写进源代码、截图或发给 Agent。查询失败、重试、翻译和提取等操作可能产生用量，以服务商账户显示为准。 [Supadata 价格](https://supadata.ai/pricing) · [DeepSeek 价格](https://api-docs.deepseek.com/quick_start/pricing/)

## 3. 看视频学词

1. 在 **Transcript** 里搜索字幕，按需切换 **Original / 中文 / 双语**。点击时间戳可回到视频对应位置。选中英文原文后，点 **Explain** 查看讲解，或点 **Save** 收藏。
2. 在 **Overview** 里浏览 AI 生成的章节和重点引用。点击带时间戳的章节可跳到对应片段。
3. 在 **Vocabulary → Learn** 学习当前章节。卡片按视频出现顺序排列，优先提取可复用的搭配、地道表达和有学习价值的词义。先看 10 条，点 **View more** 显示下一批已提取的内容。用章节标题或左右箭头切换，视频也会跳到对应位置。
4. 点击 **Save** 收藏，或点 **Play source** 回到原视频位置。**Saved** 只列出当前视频已收藏的内容。首次安装时收藏为空。

## 4. 建立自己的词汇本

### 第一次导出

在侧边栏 **Vocabulary → ⋯** 选择 **Export all saved vocabulary (HTML)**。它会整理你在扩展里从所有视频收藏的词和短语。用浏览器打开下载的 HTML，把它作为日常使用的**主词汇本**。

### 以后怎样添加新词

1. 看完其他视频、收藏了新表达后，再从扩展导出一次 HTML。
2. 回到已有的主词汇本，打开右上角的管理图标，选择 **导入词汇**，再选择刚下载的文件。
3. 新收藏会合并进来，已有笔记、复习记录和删除记录会保留。可点 **查看新增** 检查导入结果。

扩展导出的 HTML 包含扩展内的收藏。你在主词汇本里写的笔记、完成的复习或删除的记录保存在主词汇本这边。词汇本会在当前浏览器自动保存修改，**磁盘上的 HTML 不会自动更新**。换电脑、移动文件或清理浏览器数据前，请使用 **管理 → 导出与备份 → 备份完整词汇本 HTML**，再打开新备份继续使用。

| 文件 | 什么时候用 |
| --- | --- |
| 扩展导出的收藏 HTML | 第一次建立词汇本，或把新收藏合并进已有词汇本 |
| 词汇本导出的完整 HTML | 备份或迁移收藏、笔记、复习进度和删除记录 |
| JSON | 数据备份。可从管理菜单导入兼容的 HTML 或 JSON |
| CSV | 用 Excel 等表格软件查看和整理。词汇本的导入入口接受 HTML 或 JSON |

### 浏览、整理与复习

- **全部收藏**支持按视频或学习状态筛选，默认显示最近收藏的表达。点击来源可以回到原视频时间点。误删的词可在 **管理 → 回收站** 恢复。
- **智能复习**优先安排已到期的表达，复习完可开始学一组新词。先回忆，再点 **查看释义**，按实际记忆选择 **认识 / 模糊 / 忘记**。词汇本用本地 FSRS-6 根据反馈和实际间隔安排后续复习。收藏列表的排序只影响浏览。
- **学习记录**在右上角的图标内显示累计学词、学习天数、复习词次和日历。

## 让你的编程 Agent 帮你安装

把此仓库链接和下面的提示一起发给你的编程 Agent。

> 请把 Video Vocab 下载或克隆到我选择的长期保留文件夹，告诉我准确的完整路径。如果我第一次安装时需要位置建议，可以推荐 `~/Documents/video-vocab` 或 `%USERPROFILE%\Documents\video-vocab`，不要假设我一定使用这些路径。请指导我用 Chrome 的「加载已解压的扩展程序」选中包含 manifest.json 的文件夹，并告诉我从哪里获取 Supadata 和 DeepSeek API Key、在哪里自行填写。最后用有英文字幕的 YouTube 视频验证 Transcript、Vocabulary 和 HTML 导出。密钥由我自己在扩展设置里输入。

## 常见问题

- **YouTube 视频页面没有显示 Video Vocab 按钮**。请打开普通的 `youtube.com/watch` 页面，优先从 Chrome 工具栏打开扩展。如果仍无法连接，到扩展管理页重新加载，再刷新视频页面。
- **找不到字幕**。换一个有可用原生字幕的公开视频，并检查 Supadata 密钥、额度及限速。扩展使用 Supadata 的 `mode=native`，字幕来源以服务商返回为准。Shorts、直播和受限视频可能无法使用。
- **AI 请求失败**。检查 DeepSeek 密钥是否填在正确的栏位。遇到 `401` 或 `403`，检查密钥和账户权限。遇到 `429`，查看服务商返回的限制信息再重试。余额不足时前往开放平台确认用量。
- **新词没有出现在已有词汇本**。确认在主词汇本中导入了新导出的 HTML，再检查 **查看新增** 或按最近收藏排序。

## 隐私

扩展直接向 Supadata 发送视频地址获取字幕，并按所使用的 AI 功能向 DeepSeek 发送所需字幕和视频上下文。API 密钥和扩展收藏保存在当前 Chrome 配置中。HTML 词汇本的学习与复习在本地运行。请把含有个人收藏、释义或复习记录的导出文件保存在本地。 [隐私与数据流向](PRIVACY.md) · [安全问题报告方式](SECURITY.md)

## 用编程 Agent 改造成自己的版本

Video Vocab 使用原生 HTML、CSS 与 JavaScript。可在自己的副本里增加更多翻译语言、自定义总结模板或适合自己的复习方式。对于 Video Vocab 的问题，请参考本仓库的文档和安全说明，原项目不接受上游 Issue 或 Pull Request。

如果想换 AI 服务或模型，请先在编程 Agent 中打开 Chrome 通过“加载已解压的扩展程序”使用的那个准确的 Video Vocab 项目文件夹，再从 **Settings → Copy customization prompt** 复制提示并填写服务和模型名。配置完成后自行在扩展里填写密钥。

构建发布包需要 Node.js 22、Bash 和 ZIP 工具。运行 `npm run check` 和 `npm run package`，安装包输出到 `dist/`。公开发布前，用干净的 Chrome 配置和自己的 API 账号测试一次安装、字幕、词汇收藏、导出和词汇本导入。

## 许可与署名

- **原项目**为 Zara Zhang 的 YouTube Digest，版权为 **Copyright (c) 2026 Zara Zhang**。源码和安装包均保留原版权声明与完整 MIT 许可证。 [原项目](https://github.com/zarazhangrui/youtube-digest) · [LICENSE](LICENSE)
- **Video Vocab** 是独立改作，以 MIT 许可证发布，新增了章节词汇、跨视频收藏导出和离线词汇本。再分发软件副本或实质部分时，请保留适用的版权及许可声明。
- **第三方组件**为 Open Spaced Repetition 的 ts-fsrs 5.2.3，采用 MIT 许可证。完整版权和许可声明保存在 `notebook.html` 中，也随独立词汇本 HTML 分发。 [ts-fsrs 项目](https://github.com/open-spaced-repetition/ts-fsrs)
- 软件许可适用于项目代码和文档。分享视频、字幕、画面或个人收藏时，应遵循相关内容本身的使用权限。
