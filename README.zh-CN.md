# Video Vocab

**简体中文** · [English](README.md)

**把多语言 YouTube 字幕翻成中文，边看边对照原文，也能按章节收藏地道英文表达，在离线词汇本里做 FSRS 间隔复习。**

[产品亮点](#产品亮点) · [手动安装](#1-手动安装到-chrome) · [获取并配置-api-密钥](#2-获取并配置-api-密钥) · [第一次使用](#3-看视频学词) · [词汇本](#4-建立自己的词汇本) · [支持范围](#当前支持范围) · [常见问题](#常见问题)

Video Vocab 是一个桌面 Chrome 扩展，基于 Zara Zhang 的 YouTube Digest 独立改作。你可以用它读懂多语言访谈、演讲和课程，也可以积累熟词新义、地道俚语和常用英文短语。 [原项目](https://github.com/zarazhangrui/youtube-digest) · [MIT 许可证](LICENSE)

## 产品亮点

- **按章节学词，跟着视频走。** 在侧边栏浏览当前章节提取出的实用搭配、短语和生词。切换章节或点时间戳可以跳回视频。
- **收藏以后仍知道怎么用。** 每条表达尽量保留在视频中的原句、释义和时间点。你也可以自己从字幕里选中一句话或一段表达收藏。
- **把各个视频的收藏放进一本词汇本。** 导出 HTML，直接在浏览器里浏览，或用 FSRS 做间隔复习。复习中也能点原视频出处回听。
- **切换多语言原文与中文对照。** 搜索字幕，按需查看原文、简体中文或双语。侧边栏还提供 AI 概览、重点引用、选中文本讲解和时间戳笔记。

## 1. 手动安装到 Chrome

开始前准备桌面版 Google Chrome 116 或更新版本。安装和使用不需要 Node.js 或终端。使用字幕与 AI 功能需要自己的 Supadata 和 DeepSeek API 密钥，获取方法见下一节。安装后可在 Chrome 地址栏打开 `chrome://extensions` 管理扩展。

### 下载和解压

1. 打开本仓库的 **Releases**，进入最新已发布版本。在 **Assets** 里下载文件名为 `video-vocab-v*.zip` 的安装包。也可以通过仓库首页的 **Code → Download ZIP** 下载源码。 [Video Vocab Releases](https://github.com/dra-dra1216/video-vocab/releases)
2. 将 ZIP 解压到长期保留的位置，例如 macOS 或 Linux 的 `~/Documents/video-vocab`，或 Windows 的 `%USERPROFILE%\Documents\video-vocab`。安装后 Chrome 仍要从该目录读取文件。
3. 打开解压后的文件夹，找到 `manifest.json`。如果外层只有一个文件夹，就继续打开内层，直到看到 `manifest.json`、`sidepanel.html` 和 `options.html`。

### 加载到 Chrome

1. 在 Chrome 地址栏访问 `chrome://extensions`。也可从工具栏的拼图图标进入 **管理扩展程序**。
2. 打开右上角的 **开发者模式**。点击 **加载已解压的扩展程序**，选择刚才找到的、含 `manifest.json` 的文件夹。 [Chrome 官方安装说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
3. 扩展管理页出现 **Video Vocab** 卡片即表示已加载。打开工具栏的拼图菜单，找到 **Video Vocab**，点图钉固定。
4. 打开一个有可用字幕的公开视频，点击工具栏上的 **Video Vocab**，确认可以打开侧边栏。首次打开会提示配置密钥。

更新时将新版文件解压至原来的安装目录，在 Video Vocab 扩展卡片上点 **重新加载**，再重新打开侧边栏。若当前视频页仍使用旧版连接，可刷新该标签页。

## 2. 获取并配置 API 密钥

| 密钥 | 负责的功能 | 在哪里拿 |
| --- | --- | --- |
| **Supadata API key** | 获取 YouTube 原生字幕和时间戳 | [Supadata 控制台](https://dash.supadata.ai/) |
| **DeepSeek API key** | 概览、将多语言字幕翻为简体中文、选中文本讲解、章节词汇提取、释义和笔记润色 | [DeepSeek 开放平台 API Keys](https://platform.deepseek.com/api_keys) |

### 获取 Supadata API Key

1. 还没有账号时，打开 Supadata 的注册页，按页面提示验证邮箱并完成引导。已有账号可直接登录控制台。 [Supadata 注册](https://dash.supadata.ai/auth/sign-up)
2. 在控制台找到 **API key**。按引导生成或显示账号的密钥，然后点击复制。
3. 在控制台确认有可用的字幕请求额度。第一次测试请选择有可用字幕的公开视频。扩展请求 `mode=native`，字幕可用性取决于 Supadata 返回的现有字幕轨道。 [Supadata 控制台](https://dash.supadata.ai/) · [原生字幕 API](https://docs.supadata.ai/get-transcript)

### 获取 DeepSeek API Key

1. 登录 **DeepSeek 开放平台**，进入 **API Keys**。两家服务的账号和额度各自独立。 [DeepSeek API Keys](https://platform.deepseek.com/api_keys)
2. 点击 **Create new API key**（创建 API 密钥），名称可填 `Video Vocab`，方便以后辨认。确认后复制完整密钥。
3. 在开放平台检查 API 账户余额及用量。如果服务返回余额不足，请在开放平台处理后再重试。 [DeepSeek API 入门](https://api-docs.deepseek.com/) · [DeepSeek 模型与价格](https://api-docs.deepseek.com/quick_start/pricing/)

### 把两把密钥填进扩展

1. 从 YouTube 视频页打开侧边栏，点击右上角的齿轮 **Settings**。也可以在 Chrome 的 Video Vocab 扩展卡片中打开 **扩展程序选项**。
2. 设置页右上角可选 **English** 或 **中文**。在 **Supadata API key** 栏粘贴 Supadata 密钥，在 **DeepSeek API key** 栏粘贴 DeepSeek 密钥。
3. 点击 **Save settings / 保存设置**。关闭并重新打开 Video Vocab 侧边栏，使当前页面使用新设置。
4. 用有可用字幕的公开视频验证。打开 **Transcript**，确认带时间戳的原文能加载，再切到 **双语**，确认能看到简体中文译文。

发布版本只支持 DeepSeek Flash，接口地址 `https://api.deepseek.com` 和模型 `deepseek-flash` 已预设。密钥请直接填在扩展里，切勿放进聊天、截图或源代码。 [DeepSeek 模型说明](https://api-docs.deepseek.com/quick_start/pricing/)

**API 用量和费用**分别计入你的 Supadata 与 DeepSeek 账号。Supadata 主要计字幕查询，DeepSeek 主要计 AI 处理的 token。查询失败或重试也可能计入用量。以各服务商的控制台和价格页为准。 [Supadata 价格](https://supadata.ai/pricing) · [DeepSeek 价格](https://api-docs.deepseek.com/quick_start/pricing/)

## 3. 看视频学词

第一次可以选一个有可用字幕的短视频，试试原文和中文对照。想体验章节词汇提取时，选一个有英文字幕的视频。

1. 在 **Transcript** 里搜索字幕，按需切换 **Original / 中文 / 双语**。点击时间戳可回到视频对应位置。选中字幕原文后，点 **Explain** 查看讲解，或点 **Save** 收藏。
2. 在 **Overview** 里浏览 AI 生成的章节和重点引用。点击带时间戳的章节可跳到对应片段。
3. 在 **Vocabulary → Learn** 学习当前章节的英文表达。卡片按视频出现顺序排列，优先提取可复用的搭配、地道表达和有学习价值的词义。先看 10 条，点 **View more** 显示下一批已提取的内容。用章节标题或左右箭头切换，视频也会跳到对应位置。
4. 卡片上点 **Save** 收藏，点 **Play source** 回到原视频位置。**Hide meanings** 可以先隐藏释义，自测时再点 **Show meaning**。**Saved** 只列出当前视频已收藏的内容。首次安装时收藏为空。

较长章节可以分批处理。如果出现 **Pause**，可先暂停，稍后点 **Continue extraction** 继续。章节切换后看到 **Extract chapter** 时，可手动提取。

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

> 请把 Video Vocab 下载或克隆到我选择的长期保留文件夹，告诉我准确的完整路径。如果我第一次安装时需要位置建议，可以推荐 `~/Documents/video-vocab` 或 `%USERPROFILE%\Documents\video-vocab`，不要假设我一定使用这些路径。请指导我用 Chrome 的「加载已解压的扩展程序」选中包含 manifest.json 的文件夹，并告诉我从哪里获取 Supadata 和 DeepSeek API Key、在哪里自行填写。最后用有可用字幕的 YouTube 视频验证 Transcript 和双语翻译，再用有英文字幕的视频验证 Vocabulary 和 HTML 导出。密钥由我自己在扩展设置里输入。

## 当前支持范围

| 项目 | 支持情况 |
| --- | --- |
| 浏览器 | 桌面 Google Chrome 116 或更新版本，通过开发者模式加载已解压扩展。Firefox、Safari 和手机浏览器不在本版支持范围内。 |
| 视频 | 普通 `www.youtube.com/watch` 观看页。公开且有可用原生字幕的视频适合入门测试。Shorts、直播、嵌入视频或受限视频可能无法使用。 |
| 字幕 | Supadata 获取现有字幕，优先英文。没有英文轨道时，可使用服务返回的其他语言字幕。没有可用字幕时，Video Vocab 不做音频转写。 |
| 中文字幕与双语对照 | 可将获取到的多语言字幕翻为简体中文，在 **Transcript** 中查看原文、简体中文或双语对照。 |
| 词汇与界面 | **Vocabulary** 按章节提取英文表达。教程与设置页提供简体中文和英文，离线词汇本界面为简体中文。 |
| 服务和离线功能 | 获取字幕与使用 AI 功能需要联网和对应密钥。导出的 HTML 可以离线浏览、整理和复习。点视频来源时需要联网。 |

## 常见问题

- **Chrome 提示缺少或无法读取 manifest**。确认已解压，并选择直接包含 `manifest.json` 的文件夹。
- **YouTube 视频页面没有显示 Video Vocab 按钮**。请打开普通的 `youtube.com/watch` 页面，优先从 Chrome 工具栏打开扩展。如果仍无法连接，到扩展管理页重新加载，再刷新视频页面。
- **找不到字幕**。换一个有可用原生字幕的公开视频，并检查 Supadata 密钥、额度及限速。扩展使用 Supadata 的 `mode=native`，字幕来源以服务商返回为准。Shorts、直播和受限视频可能无法使用。
- **AI 请求失败**。检查 DeepSeek 密钥是否填在正确的栏位。遇到 `401` 或 `403`，检查密钥和账户权限。遇到 `429`，查看服务商返回的限制信息再重试。余额不足时前往开放平台确认用量。
- **收藏页和导出数量不一样**。侧边栏的 **Saved** 只显示当前视频，**Export all saved vocabulary (HTML)** 导出所有视频的收藏。
- **新词没有出现在已有词汇本**。确认在主词汇本中导入了新导出的 HTML，再检查 **查看新增** 或按最近收藏排序。

## 隐私

扩展直接向 Supadata 发送视频地址获取字幕，并按所使用的 AI 功能向 DeepSeek 发送所需字幕和视频上下文。API 密钥和扩展收藏保存在当前 Chrome 配置中。HTML 词汇本的学习与复习在本地运行。请把含有个人收藏、释义或复习记录的导出文件保存在本地。 [隐私与数据流向](PRIVACY.md) · [安全问题报告方式](SECURITY.md)

## 用编程 Agent 改造成自己的版本

Video Vocab 使用原生 HTML、CSS 与 JavaScript。可在自己的副本里增加更多翻译目标语言、自定义总结模板或适合自己的复习方式。对于 Video Vocab 的问题，请参考本仓库的文档和安全说明，原项目不接受上游 Issue 或 Pull Request。

如果想换 AI 服务或模型，请先在编程 Agent 中打开 Chrome 通过“加载已解压的扩展程序”使用的那个准确的 Video Vocab 项目文件夹，再从 **Settings → Copy customization prompt** 复制提示并填写服务和模型名。配置完成后自行在扩展里填写密钥。

构建发布包需要 Node.js 22、Bash 和 ZIP 工具。运行 `npm run check` 和 `npm run package`，安装包输出到 `dist/`。公开发布前，用干净的 Chrome 配置和自己的 API 账号测试一次安装、字幕、词汇收藏、导出和词汇本导入。

## 许可与署名

- **原项目**为 Zara Zhang 的 YouTube Digest，版权为 **Copyright (c) 2026 Zara Zhang**。源码和安装包均保留原版权声明与完整 MIT 许可证。 [原项目](https://github.com/zarazhangrui/youtube-digest) · [LICENSE](LICENSE)
- **Video Vocab** 是独立改作，以 MIT 许可证发布，新增了章节词汇、跨视频收藏导出和离线词汇本。再分发软件副本或实质部分时，请保留适用的版权及许可声明。
- **第三方组件**为 Open Spaced Repetition 的 ts-fsrs 5.2.3，采用 MIT 许可证。完整版权和许可声明保存在 `notebook.html` 中，也随独立词汇本 HTML 分发。 [ts-fsrs 项目](https://github.com/open-spaced-repetition/ts-fsrs)
- 软件许可适用于项目代码和文档。分享视频、字幕、画面或个人收藏时，应遵循相关内容本身的使用权限。
