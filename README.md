# Video Vocab

**English** · [简体中文完整教程](README.zh-CN.md)

**Find useful English expressions chapter by chapter on YouTube, save them with their original sentences and timestamps, and review them in an offline vocabulary notebook.**

[Highlights](#highlights) · [Manual installation](#1-install-in-chrome-manually) · [API keys](#2-get-and-enter-your-api-keys) · [First use](#3-learn-from-a-video) · [Notebook](#4-build-your-vocabulary-notebook) · [Supported scope](#supported-scope) · [Troubleshooting](#troubleshooting)

Video Vocab is a desktop Chrome extension based on Zara Zhang's YouTube Digest. It is designed for learners who already know some English and want to pick up natural expressions from interviews, talks, and courses. [Original project](https://github.com/zarazhangrui/youtube-digest) · [MIT license](LICENSE)

## Highlights

- **Learn one chapter at a time.** The sidebar extracts reusable phrases, natural collocations, and useful words from the selected chapter. Start with 10, then show more as needed. Select a chapter or a timestamp to return to that point in the video.
- **Keep the context when you save.** Save an expression with its meaning, source sentence, and timestamp when available. You can also select a phrase directly from the transcript.
- **Review across videos in one offline notebook.** Export an HTML notebook, open it in your browser, and use FSRS-6 for spaced review. Each entry links back to its video and timestamp.
- **Follow the whole video in one sidebar.** Use the original project's searchable transcripts, bilingual translation, AI overviews, key quotes, text explanations, and timestamped notes.

## 1. Install in Chrome manually

Use desktop Google Chrome 116 or later. Installation and daily use require neither Node.js nor a terminal. To fetch captions and use AI features, prepare your own Supadata and DeepSeek API keys using the next section. Use `chrome://extensions` in the Chrome address bar to manage the extension.

### Download and unzip

1. Open the most recent published release under **Releases**. In **Assets**, download the installer named `video-vocab-v*.zip`. You can also get the source ZIP from **Code → Download ZIP** on the repository's main page. [Video Vocab Releases](https://github.com/dra-dra1216/video-vocab/releases)
2. Unzip the download to a folder you plan to keep, such as `~/Documents/video-vocab` on macOS or Linux, or `%USERPROFILE%\Documents\video-vocab` on Windows. Chrome continues to read the files from this folder.
3. In the extracted folder, look for `manifest.json`. If the outer folder only contains another folder, open it until you see `manifest.json`, `sidepanel.html`, and `options.html` together.

### Load the extension in Chrome

1. Open `chrome://extensions`. Alternatively, click the puzzle-piece icon in Chrome's toolbar and choose **Manage Extensions**.
2. Turn on **Developer mode** in the upper-right corner. Click **Load unpacked** and select the folder containing `manifest.json`. [Chrome installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
3. Look for the **Video Vocab** card on the extensions page. Open the puzzle-piece menu and pin **Video Vocab** for quick access.
4. Open a public YouTube video with English captions and click **Video Vocab** in the toolbar. The sidebar prompts you to configure keys on first use.

To update, extract the new files into the same installation folder, click **Reload** on the Video Vocab card at `chrome://extensions`, and reopen the sidebar. If the current video tab still connects to an older version, refresh the video tab.

## 2. Get and enter your API keys

| Key | What it does | Where to get it |
| --- | --- | --- |
| **Supadata API key** | Fetches native YouTube captions and timestamps | [Supadata dashboard](https://dash.supadata.ai/) |
| **DeepSeek API key** | Powers overviews, bilingual translation, text explanations, vocabulary extraction and meanings, and note polishing | [DeepSeek API Keys](https://platform.deepseek.com/api_keys) |

### Get a Supadata API key

1. If you are new to Supadata, sign up and complete the onboarding prompts, including email verification if requested. Existing users can sign in to the dashboard. [Supadata sign-up](https://dash.supadata.ai/auth/sign-up)
2. Find **API key** in the dashboard. Follow the onboarding prompts to generate or display your key, then copy it.
3. Check that your account has caption-request credits. For your first test, choose a public video with English captions. Video Vocab uses `mode=native`, so captions depend on which existing tracks Supadata can fetch. [Supadata dashboard](https://dash.supadata.ai/) · [Native transcript API](https://docs.supadata.ai/get-transcript)

### Get a DeepSeek API key

1. Sign in to the **DeepSeek API platform** and open **API Keys**. The two services have separate accounts and usage. [DeepSeek API Keys](https://platform.deepseek.com/api_keys)
2. Click **Create new API key**. Name it `Video Vocab` so you can recognize it later. Copy the full key after creating it.
3. Check your API account's balance and usage. If a request reports insufficient balance, resolve it in the API platform before retrying. [DeepSeek API docs](https://api-docs.deepseek.com/) · [Models and pricing](https://api-docs.deepseek.com/quick_start/pricing/)

### Enter both keys in Chrome

1. Open the sidebar on YouTube and click the **Settings** gear. You can also open **Options** from the Video Vocab card at `chrome://extensions`.
2. Choose **English** or **中文** in the upper-right corner of Settings. Paste each key into its matching field, **Supadata API key** or **DeepSeek API key**.
3. Click **Save settings / 保存设置**, then close and reopen the Video Vocab sidebar so it uses the new settings.
4. Test on a public video with English captions. Open **Transcript** and check for timestamped captions. Then open **Overview** or **Vocabulary → Learn** to check that the AI features work.

The release uses DeepSeek Flash with the model ID `deepseek-flash` and the endpoint `https://api.deepseek.com`. Both are configured for you. Enter your keys directly in extension settings and keep them out of chats, screenshots, and source files. [DeepSeek model documentation](https://api-docs.deepseek.com/quick_start/pricing/)

**API usage and cost** are billed to your own Supadata and DeepSeek accounts. Supadata meters caption requests, while DeepSeek meters AI usage by tokens. Failed lookups or retries may count toward usage. Check each provider's dashboard and pricing page. [Supadata pricing](https://supadata.ai/pricing) · [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/)

## 3. Learn from a video

For your first session, choose a short video with English captions and save a few expressions as you watch.

1. Use **Transcript** to search captions or switch between **Original**, **中文**, and **双语**. Click a timestamp to jump in the video. Select text to **Explain** or **Save** it.
2. Use **Overview** to see AI-generated chapters and key quotes. Click a chapter timestamp to jump to it.
3. Open **Vocabulary → Learn** to study expressions from the current chapter in playback order. The first 10 appear by default. Use **View more** to show the next batch of extracted items, or select another chapter to jump in the video and study it.
4. Click **Save** to collect an expression and **Play source** to revisit it. Turn on **Hide meanings** to test yourself, then click **Show meaning** to check. **Saved** shows this video's collection. A fresh installation starts with an empty collection.

Longer chapters can be processed in batches. Use **Pause** when shown, then **Continue extraction** to resume later. If a selected chapter shows **Extract chapter**, click it to start extraction.

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

## Supported scope

| Area | Supported in this release |
| --- | --- |
| Browser | Desktop Google Chrome 116 or later. Install using Developer mode and Load unpacked. Firefox, Safari, and mobile browsers are outside the supported scope. |
| Video pages | Standard `www.youtube.com/watch` pages. Start with a public video that has native captions. Shorts, live streams, embeds, and restricted videos may be unavailable. |
| Captions | Existing tracks returned by Supadata, with English preferred. Video Vocab does not transcribe audio if an existing track is unavailable. |
| Languages | English and Simplified Chinese for the guides and Settings. Transcript and Overview can show original text, Chinese, or both where available. The offline notebook interface is in Simplified Chinese, with English expressions and examples. |
| Online and offline use | Captions and AI features require an internet connection and the corresponding keys. An exported HTML notebook can be browsed, organized, and reviewed offline. Video source links require an internet connection. |

## Troubleshooting

- **Chrome reports a missing or unreadable manifest.** Unzip the download first and select the folder containing `manifest.json` directly.
- **Video Vocab button is missing on YouTube.** Open the extension from the toolbar on a standard `youtube.com/watch` page. If needed, reload the extension and refresh the video page.
- **Captions are unavailable.** Try a public video with native captions and check your Supadata key, quota, and rate limits. The extension uses `mode=native`. Shorts, live streams, and restricted videos may be unavailable.
- **AI requests fail.** Check your DeepSeek key and permissions for `401` or `403`. For `429`, check the provider's response for rate or quota limits. Check the API account balance if shown.
- **The sidebar and HTML export show different totals.** **Saved** shows the current video. **Export all saved vocabulary (HTML)** includes saves across all videos.
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
