/* Vocabulary UI uses the existing panel's video state and seek helper. */
let vocabularyViewGeneration = 0;
let vocabularyItems = [];
let vocabularyVideoId = null;
let vocabularyBusy = false;
let vocabularyMessage = '';
let vocabularyCoverage = '';
const vocabularyPending = new Set();

function vocabularyId(entry) {
  return `${entry.videoId}:${String(entry.term).normalize('NFKC').toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, ' ').replace(/\s+/g, ' ').trim()}`;
}
function vocabularyDownload(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function vocabularyCsv(records) {
  const fields = ['term', 'type', 'meaning', 'sentence', 'reason', 'videoTitle', 'url', 'savedAt', 'status', 'note'];
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [fields, ...records.map(record => fields.map(field => field === 'url' ? `https://www.youtube.com/watch?v=${record.videoId}&t=${Math.floor(record.timestamp || 0)}s` : record[field]))]
    .map(row => row.map(cell).join(',')).join('\r\n');
}
let vocabularyView = 'learn';
let vocabularyGroup = null;
let vocabularyGroupVideo = null;
let vocabularyLatestTime = 0;
let vocabularyRenderGeneration = 0;
let vocabularyCanCompleteExamples=false;
const vocabularyExampleAttempts=new Set();
const vocabularyExamplePending=new Set();
let vocabularyLoopId = null;
function vocabularyEntryId(entry) { return entry.kind === 'note' && entry.sourceNoteId ? `note:${entry.sourceNoteId}` : vocabularyId(entry); }
async function vocabularyRecords(snapshotOnly = false) {
  const result = await chrome.runtime.sendMessage({ action: 'getVocabulary', snapshotOnly });
  if (!result?.success) throw new Error(result?.error || 'Could not load vocabulary');
  return result.records;
}
async function exportVocabulary(format, currentOnly = false) {
  try {
    const videoId = currentVideoId;
    const records = Object.values(await vocabularyRecords(true)).filter(item =>
      item.status !== 'ignored' && (!currentOnly || item.videoId === videoId));
    if (format === 'html') {
      const response = await fetch(chrome.runtime.getURL('notebook.html'));
      if (!response.ok) throw new Error('Notebook template unavailable');
      const template = await response.text();
      const data = JSON.stringify({version: 2, items: records}).replace(/</g, '\\u003c');
      vocabularyDownload('youtube-vocabulary-notebook.html', template.replace('"__VOCABULARY_DATA__"', () => data), 'text/html;charset=utf-8');
    } else vocabularyDownload(currentOnly ? 'video-vocabulary.csv' : 'all-vocabulary.csv', vocabularyCsv(records), 'text/csv;charset=utf-8');
    document.getElementById('vocabMenu').open = false;
    document.getElementById('vocabStatus').textContent = format === 'html'
      ? `Exported ${records.length} saved items from all videos. Import this HTML into your main notebook.`
      : `Exported ${records.length} saved items for spreadsheets. Use HTML to import into your notebook.`;
  } catch (error) { document.getElementById('vocabStatus').textContent = error.message; }
}
let vocabularyChaptersList = [];
const vocabularyChapterResults = new Map();
const vocabularyShown = new Map();
let vocabularyActiveRequest = null;
let vocabularyPauseRequested = false;
let vocabularyPlanning = false;
let vocabularyHideMeaning = false;
const vocabularyRevealedMeanings = new Set();
function groupVocabulary(items) {
  return vocabularyChaptersList.map(chapter => ({...chapter, items:items.filter(item => item.timestamp >= chapter.start && item.timestamp < chapter.end).sort((a,b) => a.timestamp-b.timestamp)}));
}
function vocabularyPlayingChapter() {
  return Math.max(0, vocabularyChaptersList.findIndex(chapter => vocabularyLatestTime >= chapter.start && vocabularyLatestTime < chapter.end));
}
function vocabularyDescriptionChapters(description) {
  return String(description || '').split(/\n/).flatMap(line => {
    const match = line.match(/^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—|]?\s*(.+)$/);
    if (!match) return [];
    return [{timestampSeconds:match[1].split(':').reduce((value,part) => value*60+Number(part),0),title:match[2]}];
  });
}
function vocabularyTime(seconds) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function vocabularyButton(label, action, parent) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'enhance-btn'; button.textContent = label;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await action(); } catch (error) { document.getElementById('vocabStatus').textContent = error.message; }
    finally { button.disabled = false; }
  });
  parent.append(button); return button;
}
function appendVocabularySentence(parent, sentence, term) {
  const index = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) { parent.textContent = sentence; return; }
  parent.append(document.createTextNode(sentence.slice(0, index)));
  const mark = document.createElement('mark'); mark.textContent = sentence.slice(index, index + term.length); parent.append(mark);
  parent.append(document.createTextNode(sentence.slice(index + term.length)));
}
async function renderVocabulary() {
  const generation = ++vocabularyRenderGeneration;
  try {
    const records = await vocabularyRecords();
    if (generation !== vocabularyRenderGeneration) return;
    const content = document.getElementById('contentArea');
    const scrollTop = content?.scrollTop || 0;
    const list = document.getElementById('vocabList'); list.replaceChildren();
    const query = (document.getElementById('vocabSearch')?.value || '').toLowerCase().trim();
    const matches = item => !query || [item.term, item.meaning, item.note].some(value => String(value || '').toLowerCase().includes(query));
    let items = vocabularyView === 'learn' ? vocabularyItems.map(item => {
      // Collection state is shared; each chapter keeps its own caption and timestamp.
      const saved = records[vocabularyEntryId(item)];
      const sameSource=saved?.sentenceVersion>=3&&Math.abs(saved.timestamp-item.timestamp)<0.5;
      return saved ? {...item,...(sameSource?{sentence:saved.sentence,sentenceVersion:saved.sentenceVersion,sentenceComplete:saved.sentenceComplete,sourceContext:saved.sourceContext,usage:saved.usage,supplementVersion:saved.supplementVersion}:{}),status:saved.status,note:saved.note??item.note} : item;
    }).filter(matches) :
      Object.values(records).filter(item => item.videoId === currentVideoId && item.status !== 'ignored').filter(matches).sort((a,b) => a.timestamp - b.timestamp);
    if(typeof vocabularyPrepareExample==='function'&&typeof currentTranscript!=='undefined')items=items.map(item=>vocabularyPrepareExample(item,currentTranscript));
    document.getElementById('vocabViewDescription').textContent = vocabularyView === 'learn' ? '' : 'Saved from this video. Export all videos to your local notebook.';
    document.getElementById('vocabStatus').textContent = vocabularyView === 'learn' ?
      vocabularyMessage || (vocabularyBusy ? (vocabularyPauseRequested ? 'Pausing after the current part. Progress will be saved.' : 'Extracting expressions…') : '') : `${items.length} saved from this video`;
    document.getElementById('vocabRetry').disabled = vocabularyBusy;
    document.getElementById('vocabRetry').hidden = vocabularyView !== 'learn';
    const groups = vocabularyView === 'learn' ? groupVocabulary(items) : [];
    document.getElementById('vocabPause').hidden = !vocabularyBusy || vocabularyView !== 'learn';
    document.getElementById('vocabPause').textContent = vocabularyPauseRequested ? 'Pausing…' : 'Pause';
    document.getElementById('vocabPause').disabled = vocabularyPauseRequested;
    document.getElementById('vocabHideMeaning').checked = vocabularyHideMeaning;
    const chapterSetupFailed = !vocabularyPlanning && !groups.length && Boolean(vocabularyMessage);
    document.getElementById('vocabRetry').textContent = chapterSetupFailed ? 'Try again' : 'Continue extraction';
    document.getElementById('vocabRetry').hidden = vocabularyView !== 'learn' || (!chapterSetupFailed && !vocabularyChapterResults.get(vocabularyGroup)?.error);
    if (groups.length && vocabularyGroupVideo !== currentVideoId) {
      vocabularyGroupVideo = currentVideoId; vocabularyGroup = vocabularyPlayingChapter();
    }
    const groupContainers = new Map();
    const visibleIds = new Set();
    const displayedItems=[];
    if(groups.length) {
      const active=groups.find(group=>group.index===vocabularyGroup)||groups[0];vocabularyGroup=active.index;
      const navigation=document.createElement('div');navigation.className='vocab-chapter-nav';
      const choose=async index=>{
        const chapter=vocabularyChaptersList[index];if(!chapter)return;
        const videoId=currentVideoId;vocabularyGroup=index;
        if(vocabularyLoopId)await setVocabularyLoop(null);
        const playback=seekTo(chapter.start);await renderVocabulary();await playback;
        if(videoId!==currentVideoId)return;
        if(!chapter.optional)await extractVocabularyChapter(index);
      };
      const previous=vocabularyButton('‹',()=>choose(active.index-1),navigation);previous.disabled=active.index===0;previous.setAttribute('aria-label','Previous chapter');
      const directory=document.createElement('details');directory.className='vocab-directory';
      const heading=document.createElement('summary');
      const title=document.createElement('strong');title.textContent=active.title;
      const meta=document.createElement('span');meta.textContent=`${active.index+1} / ${groups.length} · ${vocabularyTime(active.start)}–${vocabularyTime(active.end)}`;
      heading.append(title,meta);directory.append(heading);
      const menu=document.createElement('div');menu.className='vocab-directory-menu';
      for(const group of groups){
        const state=vocabularyChapterResults.get(group.index), chapter=vocabularyChaptersList[group.index];
        const label=state?.complete?`${group.items.length} expressions`:chapter?.optional?'Optional sponsor segment':state?.error?'Continue extraction':'Not extracted';
        const button=vocabularyButton(`${group.index+1}. ${group.title}`,()=>choose(group.index),menu);
        button.setAttribute('aria-current',String(group.index===active.index));
        const detail=document.createElement('small');detail.textContent=`${vocabularyTime(group.start)}–${vocabularyTime(group.end)} · ${label}`;button.append(detail);
      }
      directory.append(menu);navigation.append(directory);
      const next=vocabularyButton('›',()=>choose(active.index+1),navigation);next.disabled=active.index===groups.length-1;next.setAttribute('aria-label','Next chapter');list.append(navigation);
      const state=vocabularyChapterResults.get(active.index),shown=vocabularyShown.get(active.index)||10;
      active.items.slice(0,shown).forEach(item=>visibleIds.add(vocabularyEntryId(item)));
      const cards=document.createElement('div');cards.className='vocab-group-cards';list.append(cards);
      if(!state?.complete && vocabularyActiveRequest?.index!==active.index){
        if(vocabularyChaptersList[active.index]?.optional){const hint=document.createElement('p');hint.className='notes-intro';hint.textContent='Sponsor segment · extract only if you want to study it.';cards.append(hint);}
        vocabularyButton(state?.completedBatches||state?.error?'Continue extraction':'Extract chapter',()=>extractVocabularyChapter(active.index),cards);
      }
      if(state?.complete&&!active.items.length){const empty=document.createElement('p');empty.className='notes-intro';empty.textContent=query?'No matching expressions in this chapter.':'No expressions found in this chapter.';cards.append(empty);}
      groupContainers.set(active.index,{cards,group:active,shown});
    }
    if (!items.length && vocabularyView === 'saved') {
      const empty = document.createElement('p'); empty.className = 'notes-intro'; empty.textContent = query ? 'No matching saved items.' : 'Save an expression while watching. It will appear here.'; list.append(empty);
    }
    for (const item of items) {
      if (vocabularyView === 'learn' && !visibleIds.has(vocabularyEntryId(item))) continue;
      const id = vocabularyEntryId(item);
      const status = records[id]?.status;
      const card = document.createElement('article'); card.className = 'vocab-card' + (status === 'saved' || status === 'mastered' ? ' is-saved' : '');
      const text = (tag, value, parent = card) => { const node = document.createElement(tag); node.textContent = value; parent.append(node); return node; };
      text('h3', item.term);
      if (item.kind !== 'note' || item.meaning) {
        const meaning=text('p','');
        if(vocabularyHideMeaning&&!vocabularyRevealedMeanings.has(id)){
          vocabularyButton('Show meaning',()=>{
            vocabularyRevealedMeanings.add(id);meaning.replaceChildren();
            meaning.textContent=item.meaning||'Meaning not available yet.';
          },meaning);
        }else meaning.textContent=item.meaning||'Meaning not available yet.';
      }
      const compact=vocabularyCompactExample(item.sentence,item.term);
      if(item.sentence&&(item.kind!=='note'||item.sentence!==item.term))appendVocabularySentence(text('blockquote',''),compact.sentence,item.term);
      const extra = document.createElement('details'); extra.className = 'vocab-extra';
      text('summary', 'Details', extra);
      if(item.reason&&!/(?:产品|AI|技术|商业|商务|职场|领域|场景)/i.test(item.reason))text('p',item.reason,extra);
      if(item.usage&&item.supplementVersion===2)text('p',item.usage,extra);
      const fullContext=compact.context||item.sourceContext;
      if(fullContext&&fullContext!==compact.sentence){const context=document.createElement('details');text('summary','Full context',context);appendVocabularySentence(text('blockquote','',context),fullContext,item.term);extra.append(context);}
      if (vocabularyView !== 'learn') text('small', item.videoTitle, extra);
      const playback = document.createElement('div'); playback.className = 'vocab-controls';
      const source = document.createElement('a');
      source.href = `https://www.youtube.com/watch?v=${item.videoId}&t=${Math.floor(item.timestamp)}s`; source.target = '_blank'; source.rel = 'noopener';
      source.textContent = `${Math.floor(item.timestamp / 60)}:${String(Math.floor(item.timestamp % 60)).padStart(2, '0')} Play source`;
      source.addEventListener('click', event => { if (item.videoId === currentVideoId) { event.preventDefault(); void setVocabularyLoop(null); void seekTo(item.timestamp); } });
      playback.append(source);
      card.append(playback);
      const actions = document.createElement('div'); actions.className = 'vocab-controls';
      for (const [label, nextStatus] of [[['saved', 'mastered'].includes(status) ? 'Saved' : 'Save', ['saved', 'mastered'].includes(status) ? 'remove' : 'saved']]) {
        const button = vocabularyButton(label, async () => {
          const result = await chrome.runtime.sendMessage({action: 'updateVocabulary', entry: item, status: nextStatus});
          if (!result?.success) throw new Error(result?.error || 'Save failed');
          await renderVocabulary();
        }, actions);
        button.setAttribute('aria-pressed', String(label === 'Saved' || label === 'Mastered'));
      }
      card.append(actions);
      if(item.note) text('p', item.note, extra);
      if(extra.children.length>1)card.append(extra);
      const parent = vocabularyView === 'learn' ? [...groupContainers.values()].find(group => item.timestamp >= group.group.start && item.timestamp < group.group.end)?.cards : list;
      if (parent) {parent.append(card);displayedItems.push(item);}
    }
    for (const {cards,group,shown} of groupContainers.values()) {
      if (group.items.length > shown) vocabularyButton(`View more · ${group.items.length-shown} remaining`, async () => { vocabularyShown.set(group.index,shown+10); await renderVocabulary(); }, cards);
    }
    if (content) content.scrollTop = scrollTop;
    if(vocabularyCanCompleteExamples)void completeVisibleVocabularyExamples(displayedItems);
  } catch (error) { document.getElementById('vocabStatus').textContent = error.message; }
}
function vocabularyNeedsExample(item){return (item.sentenceVersion!==4||item.supplementVersion!==2)&&(item.kind!=='note'||item.learningExpression===true);}
async function completeVisibleVocabularyExamples(items){
  const videoId=currentVideoId;
  const pending=items.filter(item=>vocabularyNeedsExample(item)&&!vocabularyExampleAttempts.has(`${videoId}:${item.timestamp}:${item.term}`)&&!vocabularyExamplePending.has(`${videoId}:${item.timestamp}:${item.term}`)).slice(0,10);
  if(!pending.length)return;
  const keys=pending.map(item=>`${videoId}:${item.timestamp}:${item.term}`);keys.forEach(key=>{vocabularyExamplePending.add(key);vocabularyExampleAttempts.add(key);});
  try{
    const response=await chrome.runtime.sendMessage({action:'completeVocabularyExamples',videoId,items:pending,transcript:currentTranscript});
    if(!response?.success)throw new Error(response?.error||'Could not complete original examples.');
    if(currentVideoId!==videoId)return;
    for(const example of response.items||[])vocabularyItems=vocabularyItems.map(item=>vocabularyId(item)===vocabularyId({...example,videoId})&&Math.abs(item.timestamp-example.timestamp)<0.5?{...item,...example}:item);
    if(response.items?.length)await renderVocabulary();
    if((response.items?.length||0)<pending.length)document.getElementById('vocabStatus').textContent='Some original examples need more source context. Open the source video or reopen Vocabulary to retry.';
  }catch(error){if(currentVideoId===videoId)document.getElementById('vocabStatus').textContent='Original examples could not be completed. Reopen Vocabulary to retry.';}
  finally{keys.forEach(key=>vocabularyExamplePending.delete(key));}
}
async function setVocabularyLoop(item) {
  const result = await chrome.runtime.sendMessage({action: 'relayToContent', payload: {action: 'vocabularyLoop',
    videoId: currentVideoId, start: item?.timestamp, end: item?.endTimestamp || (item ? item.timestamp + 8 : null), enabled: !!item}});
  if (result?.success === false || result?.response?.success === false) throw new Error('Refresh the YouTube page to enable sentence looping.');
  vocabularyLoopId = item ? vocabularyEntryId(item) : null;
}
async function vocabularyPlaybackTime() {
  try {
    const videoId = currentVideoId;
    const result = await chrome.runtime.sendMessage({action:'relayToContent',tabId:typeof youtubeTabId==='undefined'?null:youtubeTabId,payload:{action:'getCurrentTime',videoId}});
    if (videoId === currentVideoId && Number.isFinite(result?.response?.currentTime)) vocabularyLatestTime = result.response.currentTime;
  } catch (_) {}
}
async function openVocabulary(automatic = false, refresh = false) {
  if (!document.getElementById('vocabList') || !currentTranscript?.length) return;
  vocabularyCanCompleteExamples=true;vocabularyExampleAttempts.clear();
  if (vocabularyVideoId !== currentVideoId) {
    vocabularyViewGeneration++; vocabularyActiveRequest = null; vocabularyBusy = false; vocabularyPlanning = false;
    vocabularyItems = []; vocabularyChaptersList = []; vocabularyChapterResults.clear(); vocabularyShown.clear(); vocabularyRevealedMeanings.clear();
    vocabularyVideoId = currentVideoId; vocabularyGroupVideo = null; vocabularyGroup = null; vocabularyLoopId = null; vocabularyLatestTime = 0;
    vocabularyMessage = ''; vocabularyCoverage = '';
  }
  const generation = vocabularyViewGeneration, videoId = currentVideoId;
  if (vocabularyView === 'saved') { await renderVocabulary(); return; }
  if (!vocabularyChaptersList.length) {
    if (vocabularyPlanning) return;
    vocabularyPlanning = true; vocabularyMessage = 'Finding chapters…'; await renderVocabulary();
    try {
      const info = await chrome.runtime.sendMessage({action:'relayToContent',tabId:typeof youtubeTabId==='undefined'?null:youtubeTabId,payload:{action:'getVideoChapters',videoId}}).catch(() => null);
      if (generation !== vocabularyViewGeneration || videoId !== currentVideoId) return;
      let chapters = info?.response?.chapters || [];
      if (!chapters.length && typeof currentVideoDescription !== 'undefined') chapters = vocabularyDescriptionChapters(currentVideoDescription);
      if (!chapters.length && typeof currentAnalysis !== 'undefined') chapters = currentAnalysis?.chapters || [];
      const response = await chrome.runtime.sendMessage({action:'getVocabularyChapters',videoId,transcript:currentTranscript,chapters,duration:typeof currentVideoDuration === 'undefined' ? 0 : currentVideoDuration});
      if (generation !== vocabularyViewGeneration || videoId !== currentVideoId) return;
      if (!response?.success || !Array.isArray(response.chapters) || !response.chapters.length) throw new Error(response?.error || 'Could not find chapters. Try again.');
      vocabularyChaptersList = response.chapters; vocabularyMessage = response.warning || ''; vocabularyCoverage = '';
      // Load existing chapter checkpoints without starting any provider work.
      for (const chapter of vocabularyChaptersList) {
        const cached = await chrome.runtime.sendMessage({action:'extractVocabulary',videoId,transcript:currentTranscript,level:'ALL',start:chapter.start,end:chapter.end,peek:true});
        if (generation !== vocabularyViewGeneration || videoId !== currentVideoId) return;
        if (cached?.success) applyVocabularyChapter(chapter.index,cached);
      }
    } catch (error) { if (videoId === currentVideoId) vocabularyMessage = error.message; }
    finally { if (generation === vocabularyViewGeneration) vocabularyPlanning = false; }
  }
  if (generation !== vocabularyViewGeneration || videoId !== currentVideoId) return;
  await vocabularyPlaybackTime();
  if (generation !== vocabularyViewGeneration || videoId !== currentVideoId) return;
  if(vocabularyGroupVideo!==videoId||vocabularyGroup==null){vocabularyGroupVideo=videoId;vocabularyGroup=vocabularyPlayingChapter();}
  await renderVocabulary();
  if (vocabularyChaptersList.length && !vocabularyChaptersList[vocabularyGroup]?.optional && (automatic || !vocabularyChapterResults.get(vocabularyGroup)?.complete || refresh)) await extractVocabularyChapter(vocabularyGroup);
}
function applyVocabularyChapter(index, result) {
  const chapter = vocabularyChaptersList[index]; if (!chapter) return;
  vocabularyChapterResults.set(index,result);
  const retained = vocabularyItems.filter(item => item.timestamp < chapter.start || item.timestamp >= chapter.end);
  const completed=new Map(vocabularyItems.filter(item=>item.sentenceVersion>=3).map(item=>[`${vocabularyEntryId(item)}:${item.timestamp}`,item]));
  vocabularyItems = retained.concat(result.items.map(item => {
    const entry={...item,videoId:currentVideoId,videoTitle:currentVideoTitle};
    const previous=completed.get(`${vocabularyEntryId(entry)}:${entry.timestamp}`);
    return previous&&entry.sentenceVersion<3?{...entry,sentence:previous.sentence,sourceContext:previous.sourceContext,sentenceVersion:previous.sentenceVersion,sentenceComplete:previous.sentenceComplete,usage:previous.usage,supplementVersion:previous.supplementVersion}:entry;
  })).sort((a,b) => a.timestamp-b.timestamp);
}
async function extractVocabularyChapter(index) {
  const chapter = vocabularyChaptersList[index]; if (!chapter || vocabularyChapterResults.get(index)?.complete) { await renderVocabulary(); return; }
  if (vocabularyActiveRequest) { vocabularyPauseRequested = true; await renderVocabulary(); return; }
  const request = {videoId:currentVideoId,index,generation:vocabularyViewGeneration};
  const transcript = currentTranscript;
  vocabularyActiveRequest = request; vocabularyBusy = true; vocabularyPauseRequested = false; vocabularyMessage = '';
  await renderVocabulary();
  try {
    do {
      const previous = vocabularyChapterResults.get(index)?.completedBatches || 0;
      const result = await chrome.runtime.sendMessage({action:'extractVocabulary',videoId:request.videoId,transcript,level:'ALL',start:chapter.start,end:chapter.end,stepOnly:true});
      if (request.generation !== vocabularyViewGeneration || request.videoId !== currentVideoId) return;
      if (!result?.success || !Array.isArray(result.items)) throw new Error(result?.error || 'Extraction interrupted.');
      if (!result.complete && (!Number.isInteger(result.completedBatches) || result.completedBatches <= previous)) throw new Error('Extraction did not advance.');
      applyVocabularyChapter(index,result);
      vocabularyCoverage = `${result.completedBatches}/${result.totalBatches} parts`;
      await renderVocabulary();
      if (result.complete) break;
    } while (!vocabularyPauseRequested);
  } catch (error) {
    if (request.videoId === currentVideoId && request.generation === vocabularyViewGeneration) {
      vocabularyChapterResults.set(index,{...vocabularyChapterResults.get(index),error:error.message});
      vocabularyMessage = 'Extraction interrupted. Your progress is saved. Click Continue extraction.';
    }
  } finally {
    if (vocabularyActiveRequest === request) {
      vocabularyActiveRequest = null; vocabularyBusy = false;
      const next = vocabularyGroup;
      const switchChapter = next !== index;
      vocabularyPauseRequested = false; await renderVocabulary();
      if (request.generation === vocabularyViewGeneration && request.videoId === currentVideoId
        && switchChapter && vocabularyView === 'learn' && !vocabularyChaptersList[next]?.optional) void extractVocabularyChapter(next);
    }
  }
}
function handleVocabularyProgress(message) {
  const request = vocabularyActiveRequest;
  if (message.action !== 'vocabularyProgress' || !request || message.videoId !== currentVideoId || message.level !== 'ALL') return;
  const chapter = vocabularyChaptersList[request.index];
  if (message.start !== chapter?.start || message.end !== chapter?.end) return;
  applyVocabularyChapter(request.index,message);
  vocabularyCoverage = `${message.completedBatches}/${message.totalBatches} parts`;
  if (vocabularyView === 'learn') void renderVocabulary();
}
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.onMessage?.addListener(message => {
    handleVocabularyProgress(message);
    if (message.action === 'noteSaved') void renderVocabulary();
  });
  document.querySelectorAll('[data-vocab-view]').forEach(button => button.addEventListener('click', () => {
    vocabularyView = button.dataset.vocabView;
    document.querySelectorAll('[data-vocab-view]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
    const content = document.getElementById('contentArea'); if (content) content.scrollTop = 0;
    void openVocabulary();
  }));
  document.getElementById('vocabSearch').addEventListener('input', () => void renderVocabulary());
  document.getElementById('vocabRetry').addEventListener('click', () => {
    if (vocabularyChaptersList.length) void extractVocabularyChapter(vocabularyGroup);
    else void openVocabulary();
  });
  document.getElementById('vocabPause').addEventListener('click', () => { vocabularyPauseRequested = true; void renderVocabulary(); });
  try { vocabularyHideMeaning = localStorage.getItem('ytd_hide_vocabulary_meaning') === 'true'; } catch (_) {}
  document.getElementById('vocabHideMeaning').addEventListener('change', event => { vocabularyHideMeaning = event.target.checked; vocabularyRevealedMeanings.clear(); try { localStorage.setItem('ytd_hide_vocabulary_meaning',String(vocabularyHideMeaning)); } catch (_) {} void renderVocabulary(); });
  document.getElementById('vocabCsvCurrent').addEventListener('click', () => void exportVocabulary('csv', true));
  document.getElementById('vocabCsv').addEventListener('click', () => void exportVocabulary('csv'));
  document.getElementById('vocabHtml').addEventListener('click', () => void exportVocabulary('html'));
});
