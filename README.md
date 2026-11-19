# Video Vocab

[简体中文完整教程](README.zh-CN.md) · [English](README.md)

**Learn English from the YouTube videos you already watch.**

Video Vocab is a Chrome extension that builds on Zara Zhang's YouTube Digest. It keeps searchable transcripts, Chinese and bilingual views, AI overviews, text explanations, and timestamped notes. The added **Vocabulary** tab lets you learn and save expressions chapter by chapter. An exported **offline vocabulary notebook** lets you browse and review them later. [Original project](https://github.com/zarazhangrui/youtube-digest) · [MIT license](LICENSE)

[Install](#1-install-in-chrome) · [Set up API keys](#2-get-and-enter-your-api-keys) · [Learn from video](#3-learn-from-a-video) · [Use the notebook](#4-build-your-vocabulary-notebook) · [License](#license-and-credits)

## 1. Install in Chrome

You need desktop Chrome 116 or later and your own Supadata and DeepSeek API keys.

1. In this repository's **Releases**, download the latest `video-vocab-v*.zip` installer. You can also download the source through **Code → Download ZIP**.
2. Unzip to a permanent folder such as `~/Documents/video-vocab` on macOS or Linux, or `%USERPROFILE%\Documents\video-vocab` on Windows.
3. Open `chrome://extensions` in Chrome. Turn on **Developer mode** and choose **Load unpacked**.
4. Select the folder that contains `manifest.json`. Pin **Video Vocab** from Chrome's extensions menu if you want quick access. [Chrome installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

To update, extract the new files to the same installation directory, click **Reload** on the Video Vocab card at `chrome://extensions` and reopen it from the toolbar. Keep the unpacked files in the same location for Chrome to find them.

## 2. Get and enter your API keys

| Key | What it does |
| --- | --- |
| **Supadata API key** | Fetches native YouTube captions and timestamps |
| **DeepSeek API key** | Powers overviews, translation, explanations, vocabulary extraction, and note polishing |

### Supadata

1. Sign up or log in and complete onboarding if prompted. [Supadata sign-up](https://dash.supadata.ai/auth/sign-up)
2. Copy your API key from the dashboard. [Supadata dashboard](https://dash.supadata.ai/) · [Native transcript API](https://docs.supadata.ai/get-transcript)

### DeepSeek

1. Sign in to the DeepSeek API platform and open your keys page. [DeepSeek API Keys](https://platform.deepseek.com/api_keys)
2. Create a key, name it `Video Vocab` if useful, and copy it after creation.
3. Confirm your API account has enough credit. [DeepSeek API docs](https://api-docs.deepseek.com/) · [Models and pricing](https://api-docs.deepseek.com/quick_start/pricing/)

### Enter both keys in Chrome

1. Open a regular YouTube video with English captions and click **Video Vocab** in the Chrome toolbar.
2. Open the **Settings** gear in the side panel. You can also open **Options** from the extension's Chrome card.
3. Enter the keys in the matching fields, click **Save settings**, and reopen the panel.
4. Check that **Transcript** loads captions, then open **Overview** or **Vocabulary** to verify AI access.

The release uses DeepSeek Flash with the model ID `deepseek-flash`. The endpoint and model are already configured. Enter keys only in extension settings. Keep them out of chats, source files, and screenshots. Provider usage and charges follow your own account, and failed lookups or retries may count toward usage. [Supadata pricing](https://supadata.ai/pricing) · [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/)

## 3. Learn from a video

1. Use **Transcript** to search captions or switch between **Original**, **中文**, and **双语**. Click a timestamp to jump in the video. Select text to **Explain** or **Save** it.
2. Use **Overview** to see AI-generated chapters and key quotes. Click a chapter timestamp to jump to it.
3. Open **Vocabulary → Learn** to study expressions from the current chapter in playback order. The first 10 appear by default. Use **View more** to show the next batch of extracted items, or select another chapter to jump in the video and study it.
4. Use **Save** to collect an expression and **Play source** to revisit it. **Saved** shows this video's collection. A fresh installation starts with an empty collection.

## 4. Build your vocabulary notebook

### First export

Choose **Vocabulary → ⋯ → Export all saved vocabulary (HTML)**. The export includes items you saved across all videos. Open the downloaded HTML in your browser and use it as your main notebook.

### Add vocabulary from new videos

1. After saving more expressions, export another HTML file from the extension.
2. Open your main notebook, click the management icon, and choose **导入词汇** (Import vocabulary). Select the newly exported HTML.
3. The import merges the new items and preserves existing notes, review history, and deletion records. Choose **查看新增** (View new items) to see what was added.

Extension exports carry the extension's saved items. Notes, review history, and deletions added in the notebook live there. The notebook autosaves to the current browser, and the HTML on disk remains a snapshot. Before moving files, clearing browser data, or switching devices, choose **管理 → 导出与备份 → 备份完整词汇本 HTML** (Manage → Export and backup → Back up the full notebook HTML). Open that backup to continue with your progress.

| File | Use it to |
| --- | --- |
| HTML from the extension | Start a notebook or merge new saves into your main notebook |
| Full HTML backup from the notebook | Move or preserve the collection, notes, review progress, and deletions |
| JSON backup | Restore compatible backup data using the notebook's import menu |
| CSV | View and sort in a spreadsheet. The notebook imports HTML or JSON |

### Browse and review

- **全部收藏** (All saved) supports searching, sorting, and filtering. Source links include video timestamps. Deleted items can be recovered through **回收站** (Trash).
- **智能复习** (Smart Review) shows due items first. Then you can study a batch of new expressions. Reveal the meaning and rate your recall with **认识 / 模糊 / 忘记** (Recognized / Fuzzy / Forgot). The notebook schedules reviews locally using FSRS-6 with your answers and elapsed time.
- The **学习记录** (Learning record) icon opens the activity calendar and study totals.

## Install with your coding agent

Send the link to this repository and the prompt below to your agent.

> Download or clone Video Vocab to a permanent folder I choose and tell me its exact full path. If I need a folder suggestion, offer `~/Documents/video-vocab` on macOS or Linux, or `%USERPROFILE%\Documents\video-vocab` on Windows. Show me how to select the folder containing manifest.json using Chrome's Load unpacked button, where to get my own Supadata and DeepSeek API keys, and where to enter them. I will enter the keys myself. Then use a YouTube video with English captions to check Transcript, Vocabulary, and the HTML export.

## Troubleshooting

- **Video Vocab button is missing on YouTube.** Open the extension from the toolbar on a standard `youtube.com/watch` page. If needed, reload the extension and refresh the video page.
- **Captions are unavailable.** Try a public video with native captions and check your Supadata key, quota, and rate limits. The extension uses `mode=native`. Shorts, live streams, and restricted videos may be unavailable.
- **AI requests fail.** Check your DeepSeek key and permissions for `401` or `403`. For `429`, check the provider's response for rate or quota limits. Check the API account balance if shown.
- **New expressions are missing from the notebook.** Import the latest extension HTML into your main notebook and check **查看新增** or sort by most recent.

## Privacy

The extension sends the video URL to Supadata for captions, and sends relevant captions and context to DeepSeek to provide AI features. API keys and extension saves are held in Chrome's local storage. The exported notebook runs locally. Keep personal exports and backups private. [Privacy and data flow](PRIVACY.md) · [Security reporting](SECURITY.md)

## Remix it with your coding agent

Video Vocab uses plain HTML, CSS, and JavaScript. Ideas for your own copy include more translation languages and customized summary templates. For Video Vocab questions, use this repository's documentation and security reporting instructions. The upstream project states that upstream issues and pull requests are not accepted.

To change providers or models, first open the exact Video Vocab project folder that Chrome loaded through **Load unpacked** in your coding agent. In **Settings**, use **Copy customization prompt** and supply the provider and model. Enter your key in the extension after the adaptation.

With Node.js 22, Bash, and ZIP tools, run `npm run check` and `npm run package`. The installation ZIP is created in `dist/`. Before releasing, use a clean Chrome profile and your own API accounts to test installation, captions, vocabulary, HTML export, and notebook import.

## License and credits

- **YouTube Digest** by **Zara Zhang**, copyright (c) 2026 Zara Zhang. Its existing copyright and full MIT license are retained in the source and installer. [Upstream project](https://github.com/zarazhangrui/youtube-digest) · [LICENSE](LICENSE)
- **Video Vocab** is an independently maintained remix and is not an official upstream release. Its additions include chapter vocabulary, cross-video exports, and the offline vocabulary notebook, released under MIT. Retain the applicable copyright and permission notices when redistributing software copies or substantial portions.
- **ts-fsrs 5.2.3** by Open Spaced Repetition uses the MIT license. Its full notice is embedded in `notebook.html` and included in exported notebooks. [ts-fsrs project](https://github.com/open-spaced-repetition/ts-fsrs)
- The software license covers the project code and documentation. Sharing videos, captions, images, or personal collections is subject to the permissions for that material.
