# Privacy

Effective: November 17, 2026

Video Vocab is a GitHub-only, bring-your-own-key Chrome extension. It has no Video Vocab account, developer-operated backend, analytics, advertising, or telemetry.

## Data the extension handles

Depending on the feature you use, Video Vocab handles:

- the canonical URL and video ID of the active YouTube video;
- transcript text and timestamps;
- video metadata such as title, channel, description, and duration;
- text you select in the transcript and nearby transcript context;
- transcript context around a timestamped note;
- content you ask to translate;
- notes you save;
- Supadata and DeepSeek configuration, including API keys; and
- cached transcript, digest, and translation results.

## Where data goes

### Supadata

Video Vocab sends the canonical YouTube video URL to `https://api.supadata.ai` with your Supadata API key. Supadata returns the transcript and timestamps. A Supadata key is required for transcript retrieval.

### DeepSeek

The published version sends AI feature content to DeepSeek Flash at `https://api.deepseek.com`:

- transcript plus relevant title, channel, description, or duration for an overview;
- selected text plus nearby transcript context for an explanation;
- small semantic transcript batches currently needed for progressive Chinese
  translation, or requested overview or explanation content;
- nearby transcript context and video metadata when polishing a saved note.

The endpoint and `deepseek-flash` model are fixed in the published Settings page. You provide one DeepSeek API key. To use another provider or model, you must adapt your own local source copy and its permissions. The Settings page provides a coding-agent prompt for that purpose and warns you never to include an API key in the prompt or chat.

Requests go directly from the extension to Supadata or DeepSeek. They are authenticated with the keys you supply. Video Vocab's developer does not proxy or receive these requests.

Those services process data under their own terms, privacy policies, retention practices, and account settings. Do not send confidential, personal, or regulated content unless their terms and your obligations permit it.

## Local storage and retention

Video Vocab uses Chrome's local extension storage, not a Video Vocab cloud service.

- Supadata and DeepSeek settings and API keys remain on the device in Chrome's extension storage.
- Saved notes remain until you delete them or remove/clear the extension's data. The extension keeps up to 100 notes.
- Recent transcript, digest, and per-segment translation cache entries are stored
  locally. The cache is limited to 20 videos, and entries older than 30 days are
  removed when the side panel opens.

Chrome extension storage is not a password vault. Anyone with sufficient access to your browser profile or device may be able to recover locally stored keys or content. Use scoped keys where providers support them, set spending limits, and rotate or revoke a key if the device or browser profile is compromised.

To remove data:

- delete individual saved notes in Video Vocab;
- use the Options page to clear cached digests, delete all notes, or reset all extension data;
- remove the extension or clear its stored data from Chrome to delete all local settings, keys, notes, and cache entries; and
- revoke keys in the Supadata or DeepSeek dashboard to stop their future use.

Clearing local data does not delete information already processed or retained by Supadata or DeepSeek. Use each service's controls for service-side requests.

## Permissions

Video Vocab uses Chrome permissions for these purposes:

- `sidePanel`: display the Video Vocab interface beside YouTube.
- `storage`: store settings, keys, notes, and cached results locally.
- `tabs`: identify and interact with the active YouTube tab.
- `scripting`: coordinate the extension's YouTube page controls.
- YouTube host access: read the active video's URL and metadata and provide timestamp controls.
- Supadata host access: retrieve transcripts.
- DeepSeek host access: provide AI overviews, explanations, translation, and note polishing through DeepSeek Flash.

Video Vocab does not use these permissions to monitor general browsing activity.

## No sale or advertising use

Video Vocab does not sell personal information, build advertising profiles, or share data with data brokers. It does not include analytics SDKs.

## Changes

Privacy-relevant changes will be documented in this file and in the repository history. Review updates before installing a new version.

## Questions

Review this policy, the source code, and each provider's documentation for details about data handling. For a vulnerability or accidental secret exposure, follow the private process in [SECURITY.md](SECURITY.md).

## Vocabulary and standalone notebook

Vocabulary extraction sends the requested chapter's caption text to DeepSeek in checkpointed batches. When native chapters are unavailable, planning sends a sampled caption outline. Saving a selected expression sends the term and matched source captions for a contextual meaning. Repairing old selected notes may retrieve native captions from Supadata when not cached, then send matched terms and captions to DeepSeek. Personal annotations are not included in the repair prompt; unmatched source captions are not invented.

The unified collection stores saved expressions, meanings, source metadata, annotations and learning states in Chrome local extension storage, separately from legacy notes. Generated extraction caches are bounded separately from saved items. Overview’s My Notes uses the original timestamped notes in Chrome storage. The Vocabulary panel and its HTML and CSV exports include saved expressions. The Settings JSON backup can still include legacy note records. Use Reset extension data in Settings to remove the entire extension collection.

Standalone HTML and JSON exports contain learning records, original captions, video metadata, annotations, review history and supported deletion markers, never API keys. Treat these files as personal data. CSV includes saved learning content and excludes notebook soft-deleted items. Imports validate and merge records. They do not automatically synchronize with the extension.

The notebook embeds the MIT-licensed ts-fsrs 5.2.3 scheduler. FSRS-6 scheduling, answer ratings, review dates, memory state and due dates are processed locally. Browser localStorage retains notebook changes on that browser; the original HTML on disk is not automatically rewritten. Download updated HTML or JSON for a portable backup. Soft-deleted notebook records remain recoverable in Trash and in full backups; clearing extension data does not clear the separate notebook, its browser storage or downloaded files. Remove those separately when deleting your learning data.

The notebook uses no external scripts, remote fonts, analytics or speech service. Source links open YouTube when clicked. It does not automatically transmit notebook learning data to a server.

Saved vocabulary remains until removed individually or the extension data is reset. The 100-note limit above applies to the legacy notes collection, not saved vocabulary. The standalone notebook has its own browser storage; resetting the extension does not clear notebook storage or downloaded files. Delete those separately when needed. No text-to-speech service is used.

## Original-example readability (1.8.7)

When older examples need completion, the extension may send up to ten expressions and bounded surrounding original captions to DeepSeek for sentence-boundary selection and punctuation restoration. Only capitalization and punctuation may change; proposed examples must match a contiguous original word sequence containing the target occurrence. Optional Chinese usage notes are separate from the quotation. Results are cached locally and may be written into saved vocabulary while retaining annotations and review history. Displaying legacy vocabulary may trigger these requests. HTML and CSV exports read saved records from local storage. Personal annotations and review history are not included in the completion prompt. Missing captions or failed completion do not prevent exporting existing saved data. Generated example caches are bounded independently of saved vocabulary. No speech or looping controls are presented on cards.

## Local review checkpoints (1.8.8)

The existing local notebook dataset retains per-word history. A separate browser-local session key stores the current date, round type, vocabulary identifiers and position for reload recovery. It is not transmitted to a server or copied into portable backups. A failed history write is shown and does not advance the card. Local history is not guaranteed to be shared between different HTML file URLs or browsers.
