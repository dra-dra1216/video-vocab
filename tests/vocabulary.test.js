const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function backend() {
  const store = {}; let calls = 0;
  const context = {console, structuredClone, chrome: {storage: {local: {
    get: async key => key === null ? {...store} : Array.isArray(key) ? Object.fromEntries(key.map(k => [k, store[k]])) : {[key]: store[key]},
    set: async values => Object.assign(store, values),
    remove: async keys => keys.forEach(key => delete store[key])
  }}}, parseLooseJson: JSON.parse,
    requestAiCompletion: async ({messages}) => {
      calls++;
      const batch = JSON.parse(messages[1].content);
      return {text: JSON.stringify({items: [{term: 'ballpark figure', meaning: '大致估计', type: '短语', level: 'B2', segmentIndex: Number(messages[0].content.match(/Only extract items starting at segmentIndex (\d+)/)?.[1] ?? batch[0].index)}]})};
    }};
  const source = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'source-examples.js'),'utf8'),context);
  vm.runInContext(source.slice(source.indexOf('// Serialize collection mutations')), context);
  return {context, store, calls: () => calls};
}
test('rejects hallucinated terms, substrings, invalid source indices and deduplicates', () => {
  const {context: c} = backend();
  const transcript = [{text: 'Give a ballpark', start: 35}, {text: 'figure for this.', start: 38}];
  const item = {term: 'ballpark figure', meaning: '估计', segmentIndex: 0};
  const items = c.validateVocabulary([item, item, {...item, term: 'figure out'}, {...item, term: 'park'}, {...item, segmentIndex: 55}], transcript);
  assert.equal(items.length, 1); assert.equal(items[0].timestamp, 35);
  assert.match(items[0].sentence, /ballpark figure/);
});
test('covers long transcripts, caches per level, refreshes and preserves saved vocabulary', async () => {
  const {context: c, store, calls} = backend();
  const videoId = 'abcdefghijk';
  const transcript = [0, 1, 2].map(i => ({text: 'ballpark figure ' + 'x '.repeat(4000), start: i * 60}));
  store.ytd_vocabulary = {kept: {term: 'saved'}};
  const a = await c.handleExtractVocabulary({videoId, transcript, level: 'B2'});
  assert.equal(a.items.length, 1); assert.equal(calls(), 3);
  await c.handleExtractVocabulary({videoId, transcript, level: 'B2'}); assert.equal(calls(), 3);
  await c.handleExtractVocabulary({videoId, transcript, level: 'C1'}); assert.equal(calls(), 6);
  await c.handleExtractVocabulary({videoId, transcript, level: 'B2', refresh: true}); assert.equal(calls(), 9);
  assert.equal(store.ytd_vocabulary.kept.term, 'saved');
});
test('collection stores multiple videos and supports removing one without losing others', async () => {
  const {context: c, store} = backend();
  const entry = {term: 'ballpark figure', videoId: 'abcdefghijk', timestamp: 35, meaning: '估计'};
  await c.updateVocabulary({entry, status: 'saved'});
  await c.updateVocabulary({entry: {...entry, videoId: '12345678901'}, status: 'saved'});
  assert.equal(Object.keys(store.ytd_vocabulary).length, 2);
  await c.updateVocabulary({entry, status: 'remove'});
  assert.equal(Object.keys(store.ytd_vocabulary).length, 1);
});
test('CSV preserves Chinese, quotes, multiline sentences and neutralizes spreadsheet formulas', () => {
  const c = {document: {addEventListener() {}}};
  vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'vocabulary.js'), 'utf8'), c);
  const csv = c.vocabularyCsv([{term: '=SUM(A1)', meaning: '中文"释义"', sentence: 'first\nsecond', url: 'https://example.com'}]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('"\'=SUM(A1)"')); assert.ok(csv.includes('中文""释义""'));
  assert.ok(csv.includes('"first\nsecond"'));
});
test('CSV exports include all saved states, with explicit current-video scope', async () => {
  const records = {a:{term:'one',videoId:'abcdefghijk',timestamp:1,status:'saved'},b:{term:'two',videoId:'12345678901',timestamp:2,status:'mastered'},c:{term:'hidden',videoId:'abcdefghijk',status:'ignored'}};
  const nodes={vocabStatus:{},vocabMenu:{open:true}};
  const c={currentVideoId:'abcdefghijk',document:{addEventListener(){},getElementById:id=>nodes[id]},chrome:{runtime:{sendMessage:async()=>({success:true,records})}}};
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'vocabulary.js'),'utf8'),c);
  c.vocabularyDownload=(_,text)=>c.output=text;
  await c.exportVocabulary('csv');assert.match(c.output,/one/);assert.match(c.output,/two/);assert.doesNotMatch(c.output,/hidden/);
  await c.exportVocabulary('csv',true);assert.match(c.output,/one/);assert.doesNotMatch(c.output,/two/);assert.ok(c.output.includes('https://www.youtube.com/watch?v=abcdefghijk&t=1s'));
});
test('late extraction response from a previous video cannot replace the current video', async () => {
 const {c}=vocabularyHarness(); const waits=[];
 c.renderVocabulary=async()=>{};
 c.chrome.runtime.sendMessage=message=>new Promise(resolve=>waits.push({message,resolve}));
 vm.runInContext("vocabularyVideoId=currentVideoId;vocabularyChaptersList=[{index:0,start:0,end:300,title:'First'}]",c);
 const first=c.extractVocabularyChapter(0);await new Promise(resolve=>setImmediate(resolve));
 c.currentVideoId='12345678901';vm.runInContext("vocabularyViewGeneration++;vocabularyActiveRequest=null;vocabularyItems=[{term:'new video'}]",c);
 waits[0].resolve({success:true,items:[{term:'old video'}],complete:true});await first;
 assert.equal(vm.runInContext('vocabularyItems[0].term',c),'new video');
});
test('simultaneous extraction requests share one provider operation', async () => {
  const {context: c, calls} = backend();
  const params = {videoId: 'abcdefghijk', transcript: [{text: 'ballpark figure', start: 0}], level: 'B2'};
  await Promise.all([c.handleExtractVocabulary(params), c.handleExtractVocabulary(params)]);
  assert.equal(calls(), 1);
});
test('retains more than 20 expressions from the beginning through the end and reports full coverage', async () => {
  const {context: c, store} = backend();
  const progress = [];
  c.chrome.runtime = {sendMessage: async message => progress.push(message)};
  c.requestAiCompletion = async ({messages}) => {
    const segments = JSON.parse(messages[1].content);
    return {text: JSON.stringify({items: segments.map(segment => ({term: `expression${segment.index}`,
      meaning: '表达', segmentIndex: segment.index, type: '短语', level: 'B2'}))})};
  };
  const transcript = Array.from({length: 60}, (_, index) => ({text: `expression${index} ${'context '.repeat(150)}`, start: index * 30}));
  // Pre-upgrade, truncated caches must not silently survive the new extraction.
  store.ytd_vocabulary_cache_abcdefghijk_B2 = Array.from({length: 20}, () => ({term: 'old'}));
  const result = await c.handleExtractVocabulary({videoId: 'abcdefghijk', transcript, level: 'B2'});
  assert.equal(result.items.length, 60);
  assert.equal(result.items[0].timestamp, 0);
  assert.equal(result.items[59].term, 'expression59');
  assert.equal(result.items[59].timestamp, 1770);
  assert.equal(result.completedBatches, result.totalBatches);
  assert.equal(progress.length, result.totalBatches);
  assert.equal(progress.at(-1).items.length, 60);
  assert.equal(new Set(result.items.map(item => item.term)).size, 60);
  const batches = c.buildVocabularyBatches(transcript);
  assert.deepEqual(Array.from(batches.flat(), item => item.index), Array.from({length: 60}, (_, i) => i));
  for (const batch of batches) {
    assert.ok(transcript[batch.at(-1).index].start - transcript[batch[0].index].start < 180);
    assert.ok(batch.reduce((size, item) => size + item.text.length, 0) <= 6000);
  }
});
test('sparse captions are split by timeline even when their text is short', () => {
  const {context: c} = backend();
  const batches = c.buildVocabularyBatches([0, 180, 360, 540].map(start => ({text: 'phrase', start})));
  assert.equal(batches.length, 4);
});
test('progress for another video, level or chapter cannot overwrite the current vocabulary',()=>{
 const {c}=vocabularyHarness();c.renderVocabulary=async()=>{};
 vm.runInContext("vocabularyChaptersList=[{index:0,start:0,end:300}];vocabularyActiveRequest={index:0}",c);
 const base={action:'vocabularyProgress',videoId:'abcdefghijk',level:'ALL',start:0,end:300,items:[{term:'right',timestamp:20}],completedBatches:1,totalBatches:2};
 for(const changes of [{videoId:'12345678901'},{level:'B2'},{start:300}])c.handleVocabularyProgress({...base,...changes});
 assert.equal(vm.runInContext('vocabularyItems.length',c),0);c.handleVocabularyProgress(base);assert.equal(vm.runInContext('vocabularyItems[0].term',c),'right');
});
test('legacy notes migrate once with text and timestamps intact and do not reappear after removal', async () => {
  const {context: c, store} = backend();
  store.ytd_notes = [{id: 'old-note', text: 'An entire personal thought, not a vocabulary term.', videoId: 'abcdefghijk', timestampSeconds: 135, videoTitle: 'A video', createdAt: 12345}];
  await c.migrateVocabularyNotes();
  const entry = store.ytd_vocabulary['note:old-note'];
  assert.equal(entry.kind, 'note'); assert.equal(entry.timestamp, 135);
  assert.equal(entry.term, store.ytd_notes[0].text);
  await c.updateVocabulary({entry, status: 'remove'});
  await c.migrateVocabularyNotes();
  assert.equal(Object.keys(store.ytd_vocabulary).length, 0);
  assert.equal(store.ytd_notes.length, 1);
});
test('backup restore preserves annotations, learning states and existing entries, and is idempotent', async () => {
  const {context: c, store} = backend();
  const first = {term: 'hold back', videoId: 'abcdefghijk', timestamp: 20, note: 'My own explanation'};
  await c.updateVocabulary({entry: first, status: 'mastered'});
  await c.updateVocabulary({entry: {...first, note: ''}, status: 'saved'});
  assert.equal(Object.values(store.ytd_vocabulary)[0].note, first.note);
  const backup = {version: 2, preferences: {alwaysShowMeaning: true}, items: [
    {...first, status: 'mastered', note: 'Should not overwrite'},
    {term: 'a new expression', videoId: '12345678901', timestamp: 50, status: 'mastered', note: 'Keep this'}]};
  const result = await c.restoreVocabulary(backup);
  assert.equal(result.imported, 1); assert.equal(result.skipped, 1);
  assert.equal(store.ytd_vocabulary['abcdefghijk:hold back'].note, first.note);
  assert.equal(store.ytd_vocabulary['12345678901:a new expression'].status, 'mastered');
  assert.equal(store.ytd_vocabulary_always_meaning, true);
  assert.equal((await c.restoreVocabulary(backup)).imported, 0);
  const before = JSON.stringify(store);
  await assert.rejects(c.restoreVocabulary({version: 2, items: [backup.items[1], {term: 'invalid', videoId: 'bad'}]}));
  assert.equal(JSON.stringify(store), before);
});
test('selected expressions are saved with source context and survive AI failure', async () => {
  const {context: c, store} = backend();
  c.requestAiCompletion = async () => { throw new Error('Offline'); };
  await c.handleSaveVocabularySelection({selectedText: 'ballpark figure', videoId: 'abcdefghijk', timestamp: 10,
    videoTitle: 'A video', transcript: [{text: 'Give me a ballpark figure.', start: 10}, {text: 'Please.', start: 15}]});
  const saved = store.ytd_vocabulary['abcdefghijk:ballpark figure'];
  assert.equal(saved.status, 'saved'); assert.match(saved.sentence, /Give me/);
  await assert.rejects(c.handleSaveVocabularySelection({selectedText: 'made up', videoId: 'abcdefghijk', timestamp: 10,
    transcript: [{text: 'Nothing like that.', start: 10}]}));
});
test('sentence loop repeats within its source video and cleans up on stop or navigation', () => {
  const events = new Map(); const windowEvents = new Map(); let handler;
  const video = {currentTime: 0, isConnected: true, play: () => Promise.resolve(), addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name)};
  const c = {console, URLSearchParams, document: {querySelector: () => video}, window: {location: {search: '?v=abcdefghijk'}, addEventListener: (name, fn) => windowEvents.set(name, fn)},
    chrome: {runtime: {onMessage: {addListener: fn => handler = fn}}}, debugLog() {}};
  const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('let vocabularyLoopCleanup = null;'), source.indexOf('} // End idempotent content-script installation.')), c);
  vm.runInContext(source.slice(source.indexOf('chrome.runtime.onMessage.addListener'), source.indexOf('// DIGEST BUTTON INJECTION')), c);
  let reply;
  handler({action: 'vocabularyLoop', enabled: true, start: 12, end: 18, videoId: 'abcdefghijk'}, {}, result => reply = result);
  assert.equal(reply.success, true); assert.equal(video.currentTime, 12);
  video.currentTime = 19; events.get('timeupdate')(); assert.equal(video.currentTime, 12);
  handler({action: 'vocabularyLoop', enabled: false}, {}, () => {}); assert.equal(events.size, 0);
  handler({action: 'vocabularyLoop', enabled: true, start: 12, end: 18, videoId: 'abcdefghijk'}, {}, () => {});
  c.window.location.search = '?v=12345678901'; events.get('timeupdate')(); assert.equal(events.size, 0);
});
function vocabularyHarness() {
  function element(tag) {return {tag,children:[],value:'',checked:false,listeners:{},classList:{add(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){}};}
  const nodes={vocabList:element('div'),vocabSearch:{value:''},vocabStatus:{},vocabRetry:{},vocabViewDescription:{},vocabPause:{},vocabHideMeaning:{}};
  const records={'abcdefghijk:one':{term:'one',meaning:'释义',videoId:'abcdefghijk',timestamp:20,status:'saved'},'abcdefghijk:two':{term:'two',videoId:'abcdefghijk',timestamp:660,status:'mastered'},'note:old':{term:'Original personal note',kind:'note',videoId:'abcdefghijk',timestamp:100,status:'saved'},'12345678901:other':{term:'other video',videoId:'12345678901',timestamp:0,status:'saved'}};
  const c={currentVideoId:'abcdefghijk',currentVideoTitle:'Video title',currentTranscript:[{start:0,duration:1200,text:'caption'}],currentVideoDuration:1200,document:{addEventListener(){},createElement:element,createTextNode:text=>({text}),getElementById:id=>nodes[id]},chrome:{runtime:{sendMessage:async()=>({success:true,records})}}};
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'source-examples.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(root,'vocabulary.js'),'utf8'),c);
  vm.runInContext("vocabularyChaptersList=[{index:0,start:0,end:600,title:'Introduction'},{index:1,start:600,end:1200,title:'Next topic'}]",c);
  return {c,nodes,records};
}
test('Learn renders only the playing chapter with an on-demand directory',async()=>{
 const {c,nodes}=vocabularyHarness();
 vm.runInContext("vocabularyItems=[{term:'one',videoId:'abcdefghijk',timestamp:20},{term:'two',videoId:'abcdefghijk',timestamp:660}];vocabularyLatestTime=650",c);
 await c.renderVocabulary();const [navigation,cards]=nodes.vocabList.children;
 assert.equal(navigation.className,'vocab-chapter-nav');const directory=navigation.children[1];assert.equal(directory.children[0].children[0].textContent,'Next topic');
 assert.equal(directory.children[1].children.length,2);assert.equal(cards.children.filter(x=>x.tag==='article').length,1);assert.equal(cards.children.find(x=>x.tag==='article').children[0].textContent,'two');
});
test('Saved shows only the current video, keeps notes and former mastered records, sorted by time',async()=>{
  const {c,nodes}=vocabularyHarness();vm.runInContext("vocabularyView='saved'",c);await c.renderVocabulary();
  assert.equal(nodes.vocabList.children.length,3);assert.match(nodes.vocabStatus.textContent,/3 saved from this video/);
  const labels=nodes.vocabList.children.map(card=>card.children[0].textContent);
  assert.deepEqual(labels,['one','Original personal note','two']);assert.equal(nodes.vocabRetry.hidden,true);
});
test('chapter boundaries assign expressions once and retain final section',()=>{
 const {c}=vocabularyHarness();vm.runInContext("vocabularyChaptersList=[{index:0,start:0,end:83},{index:1,start:83,end:220}]",c);
 const groups=c.groupVocabulary([0,82,83,219].map(timestamp=>({timestamp})));
 assert.equal(groups.length,2);assert.equal(groups[0].items.length,2);assert.equal(groups[1].items[0].timestamp,83);
});
test('notebook export embeds records as safe JSON rather than executable HTML',async()=>{
  const {c,records}=vocabularyHarness();records['abcdefghijk:one'].term='</script><script>alert(1)</script>';
  c.chrome.runtime.getURL=path=>path;c.fetch=async()=>({ok:true,text:async()=>fs.readFileSync(path.join(root,'notebook.html'),'utf8')});
  c.document.getElementById=()=>({});c.vocabularyDownload=(_,text)=>c.output=text;
  await c.exportVocabulary('html');
  const payload=c.output.match(/<script id="vocabulary-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(payload,/<script/i);assert.equal(JSON.parse(payload).items[0].term,records['abcdefghijk:one'].term);
});

test('failed extraction keeps completed batches and a fresh worker resumes only unfinished source',async()=>{
 const {context:c,store}=backend();let calls=0;
 const transcript=Array.from({length:3},(_,i)=>({text:'ballpark figure',start:i*180}));
 c.requestAiCompletion=async({messages})=>{calls++;if(calls===2)throw new Error('interrupted');return{text:JSON.stringify({items:[{term:'ballpark figure',meaning:'估计',segmentIndex:JSON.parse(messages[1].content)[0].index}]})};};
 await assert.rejects(c.handleExtractVocabulary({videoId:'abcdefghijk',transcript,level:'ALL'}));
 const checkpoint=Object.values(store).find(x=>x.completedBatches===1);assert.ok(checkpoint);assert.equal(checkpoint.items.length,1);
 const next=backend();Object.assign(next.store,JSON.parse(JSON.stringify(store)));
 const result=await next.context.handleExtractVocabulary({videoId:'abcdefghijk',transcript,level:'ALL'});
 assert.equal(next.calls(),2);assert.equal(result.complete,true);
});
test('on-demand extraction never extracts other chapters; peek and completed chapters need no provider calls',async()=>{
 const {context:c,calls}=backend();const transcript=[0,60,180,300].map(start=>({text:'ballpark figure',start}));
 const params={videoId:'abcdefghijk',transcript,level:'ALL',start:60,end:300,stepOnly:true};
 const empty=await c.handleExtractVocabulary({...params,peek:true});assert.equal(calls(),0);assert.equal(empty.complete,false);
 const first=await c.handleExtractVocabulary(params);assert.equal(first.completedBatches,1);assert.equal(first.items[0].timestamp,60);
 const done=await c.handleExtractVocabulary(params);assert.equal(done.complete,true);assert.equal(calls(),2);
 await c.handleExtractVocabulary(params);assert.equal(calls(),2);
 await c.handleExtractVocabulary({...params,transcript:transcript.map(x=>({...x,text:x.text+' revised'}))});assert.equal(calls(),3);
});
test('topic plans cover the full timeline, fill introductions and preserve long semantic chapters without gaps',()=>{
 const {context:c}=backend();const transcript=Array.from({length:361},(_,i)=>({text:'caption',start:i*30,duration:4}));
 const chapters=c.vocabularyChapters([{start:100,title:'Topic A'},{start:600,title:'Topic B'},{start:600,title:'duplicate'}],transcript,10830);
 assert.equal(chapters[0].start,0);assert.equal(chapters.at(-1).end,10830);assert.equal(chapters.length,3);assert.equal(chapters.at(-1).title,'Topic B');
 chapters.forEach((chapter,i)=>{assert.ok(chapter.end>chapter.start);if(i)assert.equal(chapters[i-1].end,chapter.start);});
});
test('View more reveals ten more cards in source order with no extraction request',async()=>{
 const {c,nodes}=vocabularyHarness();let requests=0;c.chrome.runtime.sendMessage=async message=>{if(message.action!=='getVocabulary')requests++;return{success:true,records:{}};};
 vm.runInContext("vocabularyItems=Array.from({length:26},(_,i)=>({term:'term '+i,videoId:currentVideoId,timestamp:i,meaning:'意思'}));vocabularyChapterResults.set(0,{complete:true})",c);
 await c.renderVocabulary();const cards=()=>nodes.vocabList.children[1];assert.equal(cards().children.filter(x=>x.tag==='article').length,10);
 await cards().children.find(x=>x.tag==='button'&&x.textContent.startsWith('View more')).listeners.click();
 assert.equal(cards().children.filter(x=>x.tag==='article').length,20);assert.equal(requests,0);
});

test('Vocabulary views and exports omit migrated notes but keep explicit saves and the legacy backup', async () => {
  const {context:c,store}=backend();
  const expression={kind:'expression',videoId:'abcdefghijk',term:'saved from the transcript',status:'saved'};
  const note={kind:'note',videoId:'abcdefghijk',term:'old note',sourceNoteId:'old',learningExpression:true,status:'saved'};
  store.ytd_notes=[{id:'old',videoId:'abcdefghijk',text:'old note',timestampSeconds:24}];
  store.ytd_vocabulary={'saved':expression,'note:old':note};
  const snapshot=await c.getVocabularyRecords({expressionsOnly:true,snapshotOnly:true});
  const cards=await c.getVocabularyRecords({expressionsOnly:true});
  assert.deepEqual(Object.keys(snapshot),['saved']);
  assert.deepEqual(Object.keys(cards),['saved']);
  const backup=await c.getVocabularyRecords({snapshotOnly:true});
  assert.deepEqual(Object.keys(backup),['saved','note:old']);
  assert.equal(store.ytd_notes[0].timestampSeconds,24);
});

test('legacy selected notes gain meanings and verified captions without losing notes, status or stable IDs',async()=>{
 const {context:c,store}=backend();store.ytd_notes=[];store.ytd_vocabulary={'note:one':{kind:'note',sourceNoteId:'one',videoId:'abcdefghijk',term:'misled',meaning:'',sentence:'misled',timestamp:0,status:'mastered',note:'Keep personal note'},'note:bad':{kind:'note',sourceNoteId:'bad',videoId:'abcdefghijk',term:'not in captions',timestamp:0,status:'saved'}};
 store.digest_abcdefghijk={transcript:[{text:'Do not be misled by the old map.',start:30,duration:4}]};
 c.requestAiCompletion=async()=>({text:JSON.stringify({items:[{index:0,meaning:'被误导的'}]})});
 const result=await c.enrichVocabularyNotes({videoId:'abcdefghijk'});assert.equal(result.updated,1);assert.equal(result.missing,1);
 const item=store.ytd_vocabulary['note:one'];assert.equal(item.status,'mastered');assert.equal(item.note,'Keep personal note');assert.equal(item.timestamp,30);assert.match(item.sentence,/Do not be/);assert.equal(item.learningExpression,true);assert.equal(store.ytd_vocabulary['note:bad'].meaning,undefined);
});

test('sponsor chapters are optional without misclassifying product topics',()=>{
 const {context:c}=backend();const chapters=c.vocabularyChapters([{start:0,title:'Introduction'},{start:20,title:'Introduction and context'},{start:60,title:'Sponsor Break: Test'},{start:100,title:'Product review process'}],[{start:0,text:'a'},{start:200,text:'end'}],210);
 assert.equal(chapters.length,3);assert.equal(chapters[0].start,0);assert.equal(chapters[0].end,60);assert.equal(chapters[1].optional,true);assert.equal(chapters[2].optional,false);
});

test('chapter directory and arrows seek to the selected start, even when already extracted',async()=>{
 const {c,nodes}=vocabularyHarness(),seeks=[];c.seekTo=async seconds=>{seeks.push(seconds);return true;};
 vm.runInContext('vocabularyChapterResults.set(0,{complete:true});vocabularyChapterResults.set(1,{complete:true})',c);
 await c.renderVocabulary();const directory=()=>nodes.vocabList.children[0].children[1];
 await directory().children[1].children[1].listeners.click();assert.deepEqual(seeks,[600]);assert.equal(directory().children[0].children[0].textContent,'Next topic');
 await nodes.vocabList.children[0].children[0].listeners.click();assert.deepEqual(seeks,[600,0]);
 await nodes.vocabList.children[0].children[2].listeners.click();assert.deepEqual(seeks,[600,0,600]);
});
test('Show meaning is replaced in place and stays revealed after saving or rerendering',async()=>{
 const {c,nodes}=vocabularyHarness();vm.runInContext("vocabularyHideMeaning=true;vocabularyItems=[{term:'one',videoId:currentVideoId,timestamp:20,meaning:'释义'}];vocabularyChapterResults.set(0,{complete:true})",c);
 await c.renderVocabulary();const card=()=>nodes.vocabList.children[1].children.find(x=>x.tag==='article');const meaning=card().children[1];
 assert.equal(meaning.children[0].textContent,'Show meaning');await meaning.children[0].listeners.click();assert.equal(meaning.textContent,'释义');assert.equal(meaning.children.length,0);
 await c.renderVocabulary();assert.equal(card().children[1].textContent,'释义');assert.equal(card().children[1].children.length,0);
});
test('choosing an optional chapter seeks without automatically extracting it',async()=>{
 const {c,nodes}=vocabularyHarness(),seeks=[];c.seekTo=async seconds=>{seeks.push(seconds);};let extraction=0;c.extractVocabularyChapter=async()=>{extraction++;};
 vm.runInContext('vocabularyChaptersList[1].optional=true',c);await c.renderVocabulary();await nodes.vocabList.children[0].children[1].children[1].children[1].listeners.click();
 assert.deepEqual(seeks,[600]);assert.equal(extraction,0);
});

test('a saved expression keeps the active chapter caption, meaning and seek time when repeated later',async()=>{
 const {c,nodes,records}=vocabularyHarness(),seeks=[];
 records['abcdefghijk:one']={...records['abcdefghijk:one'],sentence:'Old one caption',meaning:'旧释义',note:'My personal note'};
 c.seekTo=async seconds=>{seeks.push(seconds);};c.setVocabularyLoop=async()=>{};
 vm.runInContext("vocabularyItems=[{term:'one',videoId:currentVideoId,timestamp:660,sentence:'New one caption',meaning:'当前语境释义'}];vocabularyLatestTime=650;vocabularyChapterResults.set(1,{complete:true})",c);
 await c.renderVocabulary();
 const cards=nodes.vocabList.children[1].children.filter(node=>node.tag==='article');
 assert.equal(cards.length,1);
 const card=cards[0];assert.match(card.className,/is-saved/);
 assert.equal(card.children.find(node=>node.tag==='p').textContent,'当前语境释义');
 const sentence=card.children.find(node=>node.tag==='blockquote');
 assert.equal(sentence.children.map(node=>node.text??node.textContent??'').join(''),'New one caption');
 const flatten=node=>[node,...(node.children||[]).flatMap(flatten)],all=flatten(card);
 assert.ok(all.some(node=>node.textContent==='My personal note'));assert.equal(all.some(node=>node.tag==='textarea'),false);
 const source=all.find(node=>node.tag==='a');assert.match(source.href,/t=660s/);
 source.listeners.click({preventDefault(){}});assert.deepEqual(seeks,[660]);
});

test('examples reconstruct complete original sentences across captions while preserving the term timestamp',()=>{
 const {context:c}=backend();
 const transcript=[{start:0,text:'An earlier point.'},{start:3,text:'When you need a quick'},{start:5,text:'ballpark figure,'},{start:7,text:'ask the team to estimate'},{start:9,text:'the work before you'},{start:11,text:'make a commitment.'},{start:14,text:'Then review it together.'}];
 const [item]=c.validateVocabulary([{term:'ballpark figure',meaning:'大致估计',segmentIndex:2}],transcript);
 assert.equal(item.sentence,'When you need a quick ballpark figure, ask the team to estimate the work before you make a commitment.');
 assert.equal(item.timestamp,5);assert.equal(item.sentenceVersion,2);assert.ok(item.endTimestamp>=11);
 assert.ok(transcript.map(x=>x.text).join(' ').includes(item.sentence));
 assert.equal(c.vocabularySourceSentence(transcript,0,'invented expression'),null);
});
test('short context-dependent source sentences include adjacent original context and handle abbreviations',()=>{
 const {context:c}=backend(),transcript=[{start:0,text:'Dr. Smith shared an estimate.'},{start:3,text:'It was a ballpark figure.'},{start:6,text:'We still needed to check the details.'}];
 const result=c.vocabularySourceSentence(transcript,1,'ballpark figure');
 assert.equal(result.sentence,'It was a ballpark figure.');assert.match(result.sourceContext,/Dr\. Smith shared an estimate/);
 assert.match(result.sourceContext,/We still needed/);
});
test('exports can upgrade old examples using local caption caches without changing notes, dates or review history',async()=>{
 const {context:c,store,calls}=backend();
 const old={term:'ballpark figure',meaning:'估计',videoId:'abcdefghijk',timestamp:5,sentence:'ballpark figure',note:'Keep this',savedAt:'2026-11-01T00:00:00Z',srs:{history:[{rating:3}]},status:'saved'};
 store.ytd_vocabulary={one:old,two:{...old,videoId:'12345678901'}};
 store.digest_abcdefghijk={transcript:[{start:0,text:'We need a'},{start:5,text:'ballpark figure'},{start:7,text:'before Friday.'}]};
 const records=await c.getVocabularyRecords({expressionsOnly:true});assert.equal(records.one.sentence,'We need a ballpark figure before Friday.');
 for(const key of ['note','savedAt','srs'])assert.equal(records.one[key],old[key]);
 assert.equal(records.two.sentence,'ballpark figure');assert.equal(store.ytd_vocabulary.one,old);assert.equal(calls(),0);
});
test('unified extraction explains practical value without assigning CEFR levels',async()=>{
 const {context:c}=backend();let prompt='';
 c.requestAiCompletion=async({messages})=>{prompt=messages[0].content;return{text:JSON.stringify({items:[]})};};
 await c.handleExtractVocabulary({videoId:'abcdefghijk',level:'ALL',transcript:[{start:0,text:'A useful source.'}]});
 assert.match(prompt,/already understand basic English/);assert.match(prompt,/collocations or related expressions/);assert.doesNotMatch(prompt,/above the learner level|"level":"B1/);
});

test('punctuation restoration accepts only original contiguous words at the target occurrence',()=>{
 const {context:c}=backend();const transcript=[{start:0,text:'we decided to bring a'},{start:4,text:'solar powered lamp like an off grid lamp'},{start:9,text:'because we would be camping overnight'}];
 const context=c.vocabularySourceSentence(transcript,1,'solar powered',true);
 const valid='We decided to bring a solar-powered lamp, like an off-grid lamp, because we would be camping overnight.';
 assert.equal(c.validateVocabularyExample(valid,context,'solar powered'),valid);
 for(const invalid of ['We needed a solar-powered lamp.','We decided to bring a remarkably bright solar-powered lamp.','A solar-powered lamp was what we bought.'])assert.equal(c.validateVocabularyExample(invalid,context,'solar powered'),null);
 assert.equal(c.validateVocabularyExample(valid.replace(/\.$/,''),context,'solar powered'),null);
 const repeated={windowText:'We used a ballpark figure. Later, a ballpark figure was revised.',windowFrom:35,windowTo:49};
 assert.equal(c.validateVocabularyExample('We used a ballpark figure.',repeated,'ballpark figure'),null);
});
test('repaired original examples are cached and persist without losing notes or review data',async()=>{
 const {context:c,store}=backend();const transcript=[{start:0,text:'we need a'},{start:4,text:'ballpark figure before Friday'}];
 const entry={videoId:'abcdefghijk',term:'ballpark figure',timestamp:4,status:'saved',note:'My note',savedAt:'2026-11-01',srs:{history:[{rating:3}]}};
 store.ytd_vocabulary={'abcdefghijk:ballpark figure':entry};store.digest_abcdefghijk={transcript};let requests=0;
 c.requestAiCompletion=async()=>{requests++;return{text:JSON.stringify({items:[{index:0,sentence:'We need a ballpark figure before Friday.',usage:'ballpark figure 指大致估算；a rough estimate 意思相近。'}]})};};
 const result=await c.handleVocabularyExamples({videoId:'abcdefghijk',items:[entry]});assert.equal(result.items[0].sentenceVersion,4);
 const saved=store.ytd_vocabulary['abcdefghijk:ballpark figure'];assert.equal(saved.note,'My note');assert.equal(saved.savedAt,'2026-11-01');assert.equal(saved.srs,entry.srs);
 await c.handleVocabularyExamples({videoId:'abcdefghijk',items:[entry]});assert.equal(requests,1);
 const records=await c.getVocabularyRecords({expressionsOnly:true});assert.equal(records['abcdefghijk:ballpark figure'].sentence,'We need a ballpark figure before Friday.');
});
test('example completion rejects invented source words and does not resurrect a deleted save during the AI request',async()=>{
 const {context:c,store}=backend(),entry={videoId:'abcdefghijk',term:'ballpark figure',timestamp:4,status:'saved'};
 store.digest_abcdefghijk={transcript:[{start:0,text:'we need a'},{start:4,text:'ballpark figure before Friday'}]};store.ytd_vocabulary={'abcdefghijk:ballpark figure':entry};
 c.requestAiCompletion=async()=>({text:JSON.stringify({items:[{index:0,sentence:'We calculated a ballpark figure for the project.'}]})});
 assert.equal((await c.handleVocabularyExamples({videoId:'abcdefghijk',items:[entry]})).items.length,0);assert.equal(store.ytd_vocabulary['abcdefghijk:ballpark figure'].sentence,undefined);
 c.requestAiCompletion=async()=>{store.ytd_vocabulary={};return{text:JSON.stringify({items:[{index:0,sentence:'We need a ballpark figure before Friday.'}]})};};
 await c.handleVocabularyExamples({videoId:'abcdefghijk',items:[entry]});assert.equal(Object.keys(store.ytd_vocabulary).length,0);
});
test('new extraction keeps complete punctuation-only examples and usage through repeated validation',()=>{
 const {context:c}=backend(),transcript=[{start:0,text:'we need a'},{start:4,text:'ballpark figure before Friday'}];
 const [item]=c.validateVocabulary([{term:'ballpark figure',meaning:'估计',segmentIndex:1,example:'We need a ballpark figure before Friday.',usage:'a rough estimate：大致估算'}],transcript);
 assert.equal(item.sentenceVersion,4);assert.equal(item.sentence,'We need a ballpark figure before Friday.');assert.match(item.usage,/rough estimate/);
 assert.equal(c.validateVocabulary([item],transcript)[0].sentenceVersion,4);
});
test('vocabulary cards have plain explanations and existing notes without loop or annotation controls',async()=>{
 const {c,nodes,records}=vocabularyHarness();records['abcdefghijk:one'].note='Existing personal note';
 vm.runInContext("vocabularyItems=[{term:'one',videoId:currentVideoId,timestamp:20,reason:'现有解释',usage:'相关用法',supplementVersion:2}];vocabularyChapterResults.set(0,{complete:true})",c);await c.renderVocabulary();
 const flatten=node=>[node,...(node.children||[]).flatMap(flatten)],all=flatten(nodes.vocabList);
 const text=all.map(node=>node.textContent||'').join(' ');assert.match(text,/现有解释/);assert.match(text,/相关用法/);assert.match(text,/Existing personal note/);
 assert.doesNotMatch(text,/Why learn this|Add a note|Save note|Loop sentence|Stop loop/);assert.equal(all.some(node=>node.tag==='textarea'),false);
});
test('HTML export reads one saved snapshot across all videos without requesting example completion', async () => {
  const {c, records, nodes} = vocabularyHarness();
  const requests = [];
  const legacyUrl = 'https://www.youtube.com/watch?v=12345678901';
  records['12345678901:old'] = {videoId:'12345678901',term:'old',sentence:'Original unpunctuated words',status:'saved',url:legacyUrl};
  records['abcdefghijk:ignored'] = {videoId:'abcdefghijk',term:'ignored',status:'ignored'};
  c.chrome.runtime.getURL = name => name;
  c.chrome.runtime.sendMessage = async message => {
    requests.push(message);
    if (message.action !== 'getVocabulary') throw new Error('Unexpected export request');
    return {success:true,records};
  };
  c.fetch = async name => ({ok:true,text:async()=>fs.readFileSync(path.join(root,name),'utf8')});
  c.document.getElementById = id => nodes[id] || (nodes[id] = {});
  let content;
  c.vocabularyDownload = (_,text) => { content = text; };
  await c.exportVocabulary('html');
  assert.equal(requests.length,1);
  assert.equal(requests[0].snapshotOnly,true);
  assert.equal(requests[0].expressionsOnly,true);
  const payload=JSON.parse(content.match(/<script id="vocabulary-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(payload.items.some(item=>item.videoId==='abcdefghijk'));
  assert.ok(payload.items.some(item=>item.url===legacyUrl&&item.sentence==='Original unpunctuated words'));
  assert.ok(!payload.items.some(item=>item.status==='ignored'));
  assert.match(nodes.vocabStatus.textContent,/from all videos/);
});

test('later extraction progress never replaces a completed example with an older caption fragment',()=>{
 const {c}=vocabularyHarness();
 vm.runInContext("vocabularyItems=[{term:'one',videoId:currentVideoId,timestamp:20,sentence:'This is one complete original example.',sentenceVersion:3,usage:'Keep usage'}]",c);
 c.applyVocabularyChapter(0,{complete:false,items:[{term:'one',timestamp:20,sentence:'one complete',sentenceVersion:2},{term:'new',timestamp:30}]});
 const item=vm.runInContext('vocabularyItems[0]',c);assert.equal(item.sentenceVersion,3);assert.equal(item.sentence,'This is one complete original example.');assert.equal(item.usage,'Keep usage');
});

test('legacy cue fragments are reconstructed immediately from punctuation on both UI and worker paths',()=>{
 const {context:c}=backend();
 const transcript=[{start:0,text:'The first trip ended early.'},{start:4,text:'That is what we came to see. So'},{start:6,text:'we decided to plan a self guided'},{start:8,text:'tour with several breaks along'},{start:10,text:"the route and we marked them on"},{start:12,text:'our map. And we thought the'},{start:14,text:'new group would need a place to'},{start:15,text:'meet. Which station should we use?'},{start:17,text:'Hello from the station. Welcome'},{start:19,text:'to the weekend market. Our next stop is'}];
 const first=c.vocabularyPrepareExample({term:'self guided',timestamp:6,sentence:'we decided to plan a self guided tour',sentenceVersion:2},transcript);
 assert.equal(first.sentence,"So we decided to plan a self guided tour with several breaks along the route and we marked them on our map.");assert.equal(first.sentenceComplete,true);
 const question=c.vocabularyPrepareExample({term:'Which station should we use?',timestamp:15,sentence:'meet. Which station should we use? Hello from the station. Our next stop is',sentenceVersion:2},transcript);
 assert.equal(question.sentence,'Which station should we use?');assert.equal(question.sentenceComplete,true);
 const quoted=c.vocabularySourceSentence([{start:0,text:"We booked a 'self guided' tour for the weekend."}],0,'self guided');assert.match(quoted.sentence,/weekend\.$/);
});
test('old topic-limited explanations are not presented as the general definition',async()=>{
 const {c,nodes}=vocabularyHarness();vm.runInContext("vocabularyItems=[{term:'one',videoId:currentVideoId,timestamp:20,reason:'烘焙教学场景下的表达',usage:'可用于描述在不同场合逐步完成活动，并不限于烘焙。',supplementVersion:2}];vocabularyChapterResults.set(0,{complete:true})",c);
 await c.renderVocabulary();const flatten=node=>[node,...(node.children||[]).flatMap(flatten)],text=flatten(nodes.vocabList).map(x=>x.textContent||'').join(' ');
 assert.doesNotMatch(text,/烘焙教学场景/);assert.match(text,/并不限于烘焙/);
});

test('a pause inside an unfinished sentence does not cut off its ending',()=>{
 const {context:c}=backend();const transcript=[{start:0,duration:1,text:'We packed a self guided'},{start:2,duration:1,text:'tour booklet and that was what'},{start:4,duration:1,text:'we wanted to take along with'},{start:11,duration:1,text:'our spare map.'}];
 const source=c.vocabularySourceSentence(transcript,0,'self guided');assert.match(source.sentence,/with our spare map\.$/);assert.equal(source.sentenceComplete,true);
});
test('saved vocabulary remains readable when Chrome reports a different patch version',async()=>{
 const {c,records}=vocabularyHarness();c.chrome.runtime.getManifest=()=>({version:'1.8.7'});assert.equal(await c.vocabularyRecords(),records);
});

test('the panel fixes old worker snippets locally instead of showing a three-cue fragment',async()=>{
 const {c,nodes}=vocabularyHarness();c.currentTranscript=[{start:0,text:'We wanted to leave early.'},{start:6,text:'So the self guided tour'},{start:10,text:'is what we wanted to take along with'},{start:12,text:'our printed map. A different sentence starts.'}];
 vm.runInContext("vocabularyItems=[{term:'self guided',videoId:currentVideoId,timestamp:6,sentence:'self guided tour is what we wanted to take along with',sentenceVersion:2}];vocabularyChapterResults.set(0,{complete:true})",c);
 await c.renderVocabulary();const card=nodes.vocabList.children[1].children.find(x=>x.tag==='article'),quote=card.children.find(x=>x.tag==='blockquote');
 assert.ok(quote);assert.equal(quote.children.map(x=>x.text??x.textContent??'').join(''),'So the self guided tour is what we wanted to take along with our printed map.');
});

test('long spoken turns become short semantic clauses around each expression, with exact full context retained',()=>{
 const {context:c}=backend();
 const long="We chose the park because there are sheltered paths and there are enough seats to take a breather between stops and then when I decided I wanted to invite the neighbors I thought carefully about the route and then I realized that shade mattered so we did not want to walk through the field early on I think there are campgrounds nearby, right?";
 for(const term of ['take a breather','campgrounds']){
  const result=c.vocabularyCompactExample(long,term);assert.equal(result.shortened,true);assert.equal(result.context,long);assert.ok(c.vocabularyExampleWords(result.sentence).length<=36);assert.ok(c.vocabularyTermRange(result.sentence,term));
  const original=c.vocabularyExampleWords(long).map(x=>x.word).join(' '),excerpt=c.vocabularyExampleWords(result.sentence).map(x=>x.word).join(' ');assert.ok(original.includes(excerpt));assert.match(result.sentence,/[.!?]$/);assert.doesNotMatch(result.sentence,/\b(?:when I decided|and then um)\.$/);
 }
 const short='There are campgrounds nearby.';assert.equal(c.vocabularyCompactExample(short,'campgrounds').sentence,short);assert.equal(c.vocabularyCompactExample(short,'campgrounds').shortened,false);
});

test('the first Learn view opens the chapter at the current playback time', async () => {
 const {c,records}=vocabularyHarness();
 vm.runInContext('vocabularyChaptersList=[]',c);
 c.chrome.runtime.sendMessage=async message=>{
  if(message.action==='getVocabulary')return{success:true,records};
  if(message.action==='getVocabularyChapters')return{success:true,chapters:[{index:0,start:0,end:600,title:'First'},{index:1,start:600,end:900,title:'Second'}]};
  if(message.payload?.action==='getCurrentTime')return{success:true,response:{currentTime:660}};
  if(message.action==='extractVocabulary')return{success:true,complete:true,items:[]};
  return {success:true,response:{chapters:[]}};
 };
 await c.openVocabulary();assert.equal(vm.runInContext('vocabularyGroup',c),1);
});

test('incomplete extraction with no new checkpoint stops and offers retry', async () => {
 const {c,nodes,records}=vocabularyHarness();let requests=0;
 c.chrome.runtime.sendMessage=async message=>{
  if(message.action==='getVocabulary')return{success:true,records};
  assert.equal(message.action,'extractVocabulary');requests++;
  return{success:true,complete:false,completedBatches:1,totalBatches:3,items:[]};
 };
 await c.extractVocabularyChapter(0);
 assert.equal(requests,2);assert.equal(nodes.vocabRetry.hidden,false);
 assert.match(nodes.vocabStatus.textContent,/Continue extraction/);
});
