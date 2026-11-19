const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../notebook.html'),'utf8');
function harness(seed={version:2,items:[]},store=new Map()){
 const ids=new Map();
 function element(tag){return{tag,children:[],value:'',checked:false,listeners:{},style:{},parentElement:{},showModal(){this.open=true;},close(){this.open=false;},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.listeners[name]=fn;},attributes:{},setAttribute(key,value){this.attributes[key]=value;}};}
 for(const match of html.matchAll(/\bid="([^"]+)"/g))ids.set(match[1],element('div'));
 ids.get('state').value='all';ids.get('vocabulary-data').textContent=JSON.stringify(seed);
 const c={console,setTimeout,clearTimeout,setInterval(){},document:{getElementById:id=>ids.get(id),createElement:element},localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}};
 vm.createContext(c);
 for(const match of html.matchAll(/<script(?: id="(?:fsrs-runtime|speech-runtime)")?>\n([\s\S]*?)<\/script>/g))vm.runInContext(match[1],c);
 return{c,ids,store};
}
const record=(term,videoId='abcdefghijk',status='saved')=>({term,meaning:'测试中文答案',sentence:'Original caption',videoId,videoTitle:'Title',timestamp:12,status,kind:'expression'});
const texts=node=>[node.textContent||'',...(node.children||[]).flatMap(texts)].join(' ');
test('loads old seeds, merges idempotently and preserves existing notes and legacy learning state',()=>{
 const {c}=harness({version:2,items:[record('one')]});vm.runInContext("rows.get('abcdefghijk:one').status='mastered';rows.get('abcdefghijk:one').note='my note'",c);
 assert.equal(c.mergeNotebook({version:2,items:[record('one'),record('two')]}),1);assert.equal(c.dataset().items[0].note,'my note');assert.equal(c.dataset().items[0].status,'mastered');
 assert.equal(c.mergeNotebook({version:2,items:[record('two')]}),0);
 const before=JSON.stringify(c.dataset());assert.throws(()=>c.mergeNotebook({version:2,items:[record('three'),{term:'bad'}]}));assert.equal(JSON.stringify(c.dataset()),before);
});
test('all collection includes notes, with source and state filters',()=>{
 const {c,ids}=harness({version:2,items:[record('one'),record('two','12345678901','mastered'),{...record('Long note'),kind:'note',sourceNoteId:'a'}]});
 assert.equal(c.filtered().length,3);ids.get('video').value='12345678901';assert.equal(c.filtered()[0].term,'two');ids.get('video').value='';ids.get('state').value='learning';assert.equal(c.filtered().length,1);assert.equal(c.filtered()[0].term,'one');
 ids.get('state').value='mastered';assert.equal(c.filtered()[0].term,'two');ids.get('search').value='nothing';assert.equal(c.filtered().length,0);
});
test('review answer stays concealed and ungradable until revealed, without changing card structure',()=>{
 const {c,ids}=harness({version:2,items:[record('one')]});assert.match(texts(ids.get('view')),/测试中文答案/);c.switchSection('review');assert.match(texts(ids.get('view')),/学习新收藏/);c.startReview(true);
 const card=ids.get('view').children[0],answer=card.children.find(x=>x.className==='answer-area is-concealed'),body=answer.children[0],overlay=answer.children[1],actions=body.children[1];
 assert.equal(body.inert,true);assert.equal(body.attributes['aria-hidden'],'true');assert.ok(actions.children.every(button=>button.disabled));
 c.gradeReview(c.reviewItem(),3);assert.equal(c.dataset().items[0].srs,undefined);
 overlay.children[0].listeners.click();assert.equal(ids.get('view').children[0],card);assert.equal(body.inert,false);assert.equal(body.attributes['aria-hidden'],'false');assert.equal(overlay.hidden,true);assert.ok(actions.children.every(button=>!button.disabled));
 assert.deepEqual(actions.children.map(button=>button.children[0].textContent),['认识','模糊','忘记']);assert.ok(actions.children.every(button=>button.children[1].tag==='small'));
 actions.children[1].listeners.click();assert.equal(c.dataset().items[0].srs.history[0].rating,2);
});
test('collection is a browsing list, with no duplicate flashcard workflow',()=>{
 const {c,ids}=harness({version:2,items:[record('one'),record('two')]});c.switchSection('all');
 assert.match(texts(ids.get('view')),/测试中文答案/);assert.doesNotMatch(texts(ids.get('view')),/显示释义|记住了|忘记了/);assert.equal(c.dataset().items[0].status,'saved');
});
test('large libraries paginate, maintain timestamp source links and escape CSV formulas',()=>{
 const {c,ids}=harness({version:2,items:Array.from({length:120},(_,i)=>record('term'+i))});c.switchSection('all');
 const body=ids.get('view').children[0].children[0].children[1];assert.equal(body.children.length,50);assert.equal(body.children[0].children[3].children[0].href,'https://www.youtube.com/watch?v=abcdefghijk&t=12s');assert.match(c.notebookCsv([record('=SUM(A1)')]),/'=SUM/);
});
test('FSRS ratings schedule future reviews, store history and never mark a single success mastered',()=>{
 const {c,store}=harness({version:2,items:[record('one')]});const now=new Date('2026-11-12T09:00:00Z'),item=c.dataset().items[0];
 const due=c.reviewRecord(item,3,now);assert.ok(due.getTime()>now.getTime());assert.equal(item.status,'saved');assert.equal(item.srs.history.length,1);assert.equal(item.srs.history[0].rating,3);assert.equal(item.srs.card.reps,1);
 const restored=harness(JSON.parse(JSON.stringify(c.dataset())));assert.equal(restored.c.dataset().items[0].srs.card.due,item.srs.card.due);
 c.reviewRecord(item,1,new Date(due));assert.equal(item.srs.history.length,2);assert.equal(item.srs.history[1].rating,1);assert.equal(JSON.parse(store.get('youtube_digest_notebook_v1')).items[0].srs.history.length,2);
});
test('due words take priority; new words are optional batches, with no daily quota',()=>{
 const {c,ids}=harness({version:2,items:[...Array.from({length:29},(_,i)=>record('term'+i)),record('known','abcdefghijk','mastered'),{...record('note'),kind:'note'}]});
 assert.equal(c.dailyCandidates().fresh.length,29);assert.equal(ids.has('dailyNew'),false);const item=c.dataset().items[0];c.reviewRecord(item,1,new Date(Date.now()-86400000));
 item.srs.card.due=new Date(Date.now()-1000).toISOString();assert.equal(c.dailyCandidates().due[0].term,item.term);
 c.startReview(true);assert.equal(vm.runInContext('reviewQueue.length',c),1);assert.equal(c.reviewItem().term,item.term);
 item.srs.card.due=new Date(Date.now()+60000).toISOString();c.startReview(true);assert.equal(vm.runInContext('reviewQueue.length',c),10);assert.equal(c.dailyCandidates().fresh.length,28);
});
test('single and batch deletion persist tombstones; reimport and reopening cannot resurrect deleted terms',()=>{
 const seed={version:2,items:[record('one'),record('two'),record('three')]};const {c,store}=harness(seed);
 c.deleteRecords(['abcdefghijk:one','abcdefghijk:two']);assert.equal(c.dataset().items.length,1);assert.equal(c.dataset().deleted.length,2);
 assert.equal(c.mergeNotebook(seed),0);assert.equal(c.dataset().items.length,1);
 const reopened=harness(seed,store);assert.equal(reopened.c.dataset().items.length,1);assert.equal(reopened.c.dataset().deleted.length,2);
 c.undoDelete();assert.equal(c.dataset().items.length,3);assert.equal(c.dataset().deleted.length,0);
});
test('deleted view supports restoration with note and full review history intact',()=>{
 const {c,ids}=harness({version:2,items:[record('one')]});const item=c.dataset().items[0];item.note='personal';c.reviewRecord(item,3);c.deleteRecords(['abcdefghijk:one']);
 ids.get('trash').listeners.click();assert.equal(c.filtered().length,1);c.restoreRecords(['abcdefghijk:one']);assert.equal(c.dataset().items[0].note,'personal');assert.equal(c.dataset().items[0].srs.history.length,1);
});
test('invalid review history and deletion metadata are rejected atomically',()=>{
 const {c}=harness({version:2,items:[record('one')]});const before=JSON.stringify(c.dataset());
 assert.throws(()=>c.mergeNotebook({version:2,items:[record('new'),{...record('bad'),srs:{version:1,card:{due:'bad'},history:[]}}]}));assert.equal(JSON.stringify(c.dataset()),before);
 assert.throws(()=>c.mergeNotebook({version:2,items:[],deleted:[{id:'bad',item:record('one'),deletedAt:'invalid'}]}));assert.equal(JSON.stringify(c.dataset()),before);
});

test('review dates are relative and old mastered labels expose no migration terminology or daily enrollment',()=>{
 const {c,ids}=harness({version:2,items:[record('known','abcdefghijk','mastered')]});c.switchSection('all');
 assert.match(texts(ids.get('view')),/已掌握/);assert.doesNotMatch(texts(ids.get('view')),/原记录|加入每日学习|重新复习/);
 const now=new Date('2026-11-12T10:00:00Z');assert.equal(c.dueLabel('2026-11-12T10:10:00Z',now),'10 分钟后');assert.equal(c.dueLabel('2026-11-13T10:00:00Z',now),'明天');
});
test('enriched selected notes retain identity and become reviewable, with highlighted original context',()=>{
 const original={...record('misled'),kind:'note',sourceNoteId:'legacy',sentence:'misled',meaning:''};const {c,ids}=harness({version:2,items:[original]});
 c.mergeNotebook({version:2,items:[{...original,learningExpression:true,meaning:'被误导的',sentence:'Do not be misled by the old map.',timestamp:30}]});c.switchSection('all');
 const item=c.dataset().items[0];assert.equal(c.recordId(item),'note:legacy');assert.equal(item.learningExpression,true);assert.equal(item.timestamp,30);assert.equal(c.dailyCandidates().fresh.length,1);
 const body=ids.get('view').children[0].children[0].children[1];const caption=body.children[0].children[2];assert.equal(caption.children.find(x=>x.tag==='mark').textContent,'misled');
});

test('Hard ratings round-trip and shorter recall intervals differ from Good',()=>{
 const h=harness({version:2,items:[record('hard'),record('good')]});const now=new Date('2026-11-16T09:00:00Z');const [hard,good]=h.c.dataset().items;
 h.c.reviewRecord(hard,2,now);h.c.reviewRecord(good,3,now);assert.ok(Date.parse(hard.srs.card.due)<Date.parse(good.srs.card.due));
 assert.equal(harness(JSON.parse(JSON.stringify(h.c.dataset()))).c.dataset().items[0].srs.history[0].rating,2);
});
test('stats use dated feedback, keep deleted history and do not fabricate legacy mastery',()=>{
 const {c,ids}=harness({version:2,items:[record('one'),record('known','abcdefghijk','mastered')]});const item=c.dataset().items[0];
 assert.equal(c.studyStats().learned,0);c.reviewRecord(item,3,new Date('2026-11-14T10:00:00Z'));c.reviewRecord(item,2,new Date('2026-11-15T10:00:00Z'));c.reviewRecord(item,3,new Date('2026-11-15T11:00:00Z'));
 let stats=c.studyStats();assert.equal(stats.learned,1);assert.equal(stats.days.size,2);assert.equal(stats.reviews,2);
 c.deleteRecords([c.recordId(item)]);assert.equal(c.studyStats().learned,1);assert.equal(c.studyStats().reviews,2);
 ids.get('openRecords').listeners.click();assert.equal(ids.get('recordsDialog').open,true);assert.equal(ids.get('statLearned').textContent,'1');assert.equal(ids.get('statDays').textContent,'2');assert.equal(ids.get('statReviews').textContent,'2');
});
test('mature words still become due; a lapse returns their state to consolidation',()=>{
 const {c}=harness({version:2,items:[record('one')]});const item=c.dataset().items[0];
 for(const day of [1,4,12,28,60])c.reviewRecord(item,3,new Date(2026,6,day,10));
 assert.equal(c.isMastered(item),true);item.srs.card.due=new Date(Date.now()-1000).toISOString();assert.equal(c.dailyCandidates().due.length,1);
 c.reviewRecord(item,1);assert.equal(c.isMastered(item),false);
});

test('calendar displays one-based months and maps real activity to heatmap shading',()=>{
 const {c,ids}=harness({version:2,items:[record('one')]});const item=c.dataset().items[0];c.reviewRecord(item,3,new Date(2026,10,12,10));vm.runInContext("calendarMonth=new Date(2026,10,1);calendarSelected=dayKey(new Date(2026,10,12));renderRecords()",c);
 assert.match(ids.get('calendarDetail').textContent,/2026 \/ 11 \/ 12/);const day=ids.get('calendarDays').children.find(x=>x.textContent==='12');assert.equal(day.attributes['data-level'],'1');assert.equal(day.attributes['aria-pressed'],'true');
});

test('review home prioritizes due work then offers a clearly sized new-word batch without a countdown',()=>{
 const {c,ids}=harness({version:2,items:[record('due'),...Array.from({length:12},(_,i)=>record('fresh'+i))]});const due=c.dataset().items[0];c.reviewRecord(due,3,new Date(Date.now()-86400000));due.srs.card.due=new Date(Date.now()-1000).toISOString();
 c.switchSection('review');assert.match(texts(ids.get('view')),/先巩固，再学新词/);assert.match(texts(ids.get('view')),/开始复习/);assert.doesNotMatch(texts(ids.get('view')),/下一批|分钟后|学习 10 个新表达/);
 c.startReview();vm.runInContext('revealed=true',c);c.gradeReview(c.reviewItem(),3);
 const home=()=>ids.get('view').children[0];assert.equal(home().children[0].textContent,'复习完成');assert.match(texts(home()),/学习 10 个新表达/);assert.match(texts(home()),/还有 12 个未学/);assert.doesNotMatch(texts(home()),/个表达待复习|下一批|分钟后/);
 c.render();assert.equal(home().children[0].textContent,'复习完成');
 c.startReview(true);for(let i=0;i<10;i++){vm.runInContext('revealed=true',c);c.gradeReview(c.reviewItem(),3);}
 assert.equal(home().children[0].textContent,'已学习 10 个新表达');assert.match(texts(home()),/学习 2 个新表达/);assert.match(texts(home()),/还有 2 个未学/);assert.doesNotMatch(texts(home()),/本轮完成|下一批|分钟后/);
});
test('hiding meanings leaves empty cells and never changes stored meanings',()=>{
 const {c,ids}=harness({version:2,items:[record('one')]});const cell=()=>ids.get('view').children[0].children[0].children[1].children[0].children[1];
 assert.equal(cell().textContent,'测试中文答案');ids.get('hideMeaning').checked=true;c.render();assert.equal(cell().textContent,'');assert.equal(c.dataset().items[0].meaning,'测试中文答案');
 ids.get('hideMeaning').checked=false;c.render();assert.equal(cell().textContent,'测试中文答案');
});
test('opening an older HTML seed preserves newer browser history and notes',()=>{
 const seed={version:2,items:[record('one')]};const first=harness(seed),item=first.c.dataset().items[0];item.note='Keep this new note';first.c.reviewRecord(item,2);
 const reopened=harness(seed,first.store);assert.equal(reopened.c.dataset().items[0].note,'Keep this new note');assert.equal(reopened.c.dataset().items[0].srs.history[0].rating,2);assert.equal(reopened.c.dataset().items[0].srs.history.length,1);
});

test('collection defaults to latest saved, offers oldest first and leaves due-review order alone',()=>{
 const dated=(term,savedAt)=>({...record(term),savedAt});
 const {c,ids}=harness({version:2,items:[dated('old','2026-11-01T00:00:00Z'),dated('new','2026-11-15T00:00:00Z'),record('unknown')]});
 assert.deepEqual(Array.from(c.filtered(),x=>x.term),['new','old','unknown']);
 ids.get('sort').value='oldest';ids.get('sort').listeners.change();assert.deepEqual(Array.from(c.filtered(),x=>x.term),['unknown','old','new']);
 const [old,newer]=c.dataset().items;c.reviewRecord(old,3,new Date(Date.now()-86400000));c.reviewRecord(newer,3,new Date(Date.now()-86400000));
 old.srs.card.due=new Date(Date.now()-20000).toISOString();newer.srs.card.due=new Date(Date.now()-10000).toISOString();
 const due=Array.from(c.dailyCandidates().due,x=>x.term);ids.get('sort').value='newest';ids.get('sort').listeners.change();assert.deepEqual(Array.from(c.dailyCandidates().due,x=>x.term),due);assert.deepEqual(due,['old','new']);
});
test('import shows newly added words and preserves edited notes, SRS, saved dates and deletions',async()=>{
 const old={...record('old'),savedAt:'2026-11-01T00:00:00Z'},removed=record('removed');
 const {c,ids}=harness({version:2,items:[old,removed]});const item=c.dataset().items[0];item.note='My edit';c.reviewRecord(item,3);c.deleteRecords([c.recordId(removed)]);
 const history=JSON.stringify(item.srs),data={version:2,items:[{...old,note:'Incoming note',savedAt:'2026-11-30T00:00:00Z'},removed,{...record('fresh'),savedAt:'2026-11-17T00:00:00Z'}]};
 c.switchSection('review');await ids.get('importFile').listeners.change({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:'test'}});
 assert.match(ids.get('message').textContent,/新增 1 个/);assert.equal(c.dataset().items.find(x=>x.term==='old').note,'My edit');assert.equal(JSON.stringify(c.dataset().items.find(x=>x.term==='old').srs),history);
 assert.equal(c.dataset().items.find(x=>x.term==='old').savedAt,old.savedAt);assert.equal(c.dataset().deleted.length,1);
 assert.equal(c.filtered()[0].term,'fresh');assert.equal(ids.get('showImported').hidden,false);ids.get('showImported').listeners.click();assert.deepEqual(Array.from(c.filtered(),x=>x.term),['fresh']);
 ids.get('showImported').listeners.click();assert.equal(c.filtered().length,2);
 let backup;c.download=(_,text)=>{backup=JSON.parse(text);};ids.get('backup').listeners.click();
 const reopened=harness(backup);assert.equal(reopened.c.dataset().items.length,2);assert.equal(reopened.c.dataset().deleted.length,1);assert.equal(reopened.c.dataset().items.find(x=>x.term==='old').note,'My edit');assert.equal(JSON.stringify(reopened.c.dataset().items.find(x=>x.term==='old').srs),history);
});
test('verified full examples upgrade at the same occurrence without replacing learning state or unrelated captions',()=>{
 const original={...record('one'),sentence:'old fragment',timestamp:20},other={...record('two'),sentence:'Keep original occurrence',timestamp:10};
 const {c}=harness({version:2,items:[original,other]});const item=c.dataset().items[0];item.note='Mine';c.reviewRecord(item,2);const before=JSON.stringify(item.srs);
 c.mergeNotebook({version:2,items:[{...original,sentence:'This is the full one example.',sentenceVersion:2,sourceContext:'Original context.'},{...other,sentence:'A different occurrence of two.',sentenceVersion:2,timestamp:90}]});
 assert.equal(item.sentence,'This is the full one example.');assert.equal(item.note,'Mine');assert.equal(JSON.stringify(item.srs),before);assert.equal(c.dataset().items[1].sentence,other.sentence);
});

test('review details show plain explanations and saved notes with no add-note editor, preserving table editing',()=>{
 const {c,ids}=harness({version:2,items:[{...record('one'),reason:'现有解释',usage:'a related phrase：相关表达',supplementVersion:2,note:'Existing note'}]});
 c.switchSection('review');c.startReview(true);const card=ids.get('view').children[0],flatten=node=>[node,...(node.children||[]).flatMap(flatten)],all=flatten(card),text=texts(card);
 assert.match(text,/现有解释/);assert.match(text,/related phrase/);assert.match(text,/Existing note/);assert.doesNotMatch(text,/为什么值得学|添加笔记|保存笔记|笔记与详情/);assert.equal(all.some(node=>node.tag==='textarea'),false);
 c.switchSection('all');assert.match(texts(ids.get('view')),/保存笔记/);assert.equal(c.dataset().items[0].note,'Existing note');
});
test('long examples use a short source clause with full context while retaining SRS and notes',()=>{
 const sentence='We should get a ballpark figure, '+('using the original words and context, '.repeat(20))+'before Friday.';
 const original={...record('ballpark figure'),sentence:'a ballpark figure before Friday',sentenceVersion:2};
 const {c,ids}=harness({version:2,items:[original]});const item=c.dataset().items[0];item.note='Keep';c.reviewRecord(item,3);const history=JSON.stringify(item.srs);
 c.mergeNotebook({version:2,items:[{...original,sentence,usage:'rough estimate：大致估算',sentenceVersion:3}]});assert.equal(item.sentence,sentence);assert.equal(item.note,'Keep');assert.equal(JSON.stringify(item.srs),history);
 c.startReview();c.startReview(true); // The source remains intact even if no cards are currently due.
 const target={children:[],append(...nodes){this.children.push(...nodes);}};c.highlightedSentence(item,target);const short=target.children.filter(node=>node.tag!=='details').map(node=>node.textContent||'').join('');assert.ok(short.length<sentence.length);assert.match(short,/ballpark figure/);const context=target.children.find(node=>node.tag==='details');assert.ok(context);assert.equal(context.children.find(node=>node.tag==='blockquote').children.map(node=>node.textContent||'').join(''),sentence);assert.equal(item.sentence,sentence);
});

test('all three ratings survive reload and cannot re-enter the automatic queue on the same day',()=>{
 for(const rating of [1,2,3]){
  const seed={version:2,items:[record('one')]},{c,store}=harness(seed);const item=c.dataset().items[0],now=new Date();
  c.reviewRecord(item,rating,now);const later=new Date(now);later.setHours(23,59,59,999);
  item.srs.card.due=new Date(now.getTime()+60000).toISOString();c.persist();
  assert.equal(c.dailyCandidates(later).due.length,0);
  const reopened=harness(seed,store);assert.equal(reopened.c.dataset().items[0].srs.history.length,1);assert.equal(reopened.c.dailyCandidates(later).due.length,0);
  const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(12,0,0,0);assert.equal(reopened.c.dailyCandidates(tomorrow).due.length,1);
 }
});
test('unfinished review resumes at the next unanswered card after reloading the same notebook',()=>{
 const seed={version:2,items:[record('one'),record('two'),record('three')]},{c,store}=harness(seed);
 c.switchSection('review');c.startReview(true);const first=c.reviewItem().term;vm.runInContext('revealed=true',c);c.gradeReview(c.reviewItem(),3);
 const next=c.reviewItem().term;assert.notEqual(next,first);
 const reopened=harness(seed,store);reopened.c.switchSection('review');assert.equal(reopened.c.reviewItem().term,next);assert.equal(vm.runInContext('reviewAnswered',reopened.c),1);
 const graded=reopened.c.dataset().items.find(x=>x.term===first);assert.equal(graded.srs.history.length,1);
 for(let i=0;i<2;i++){vm.runInContext('revealed=true',reopened.c);reopened.c.gradeReview(reopened.c.reviewItem(),3);}
 const finished=harness(seed,store);finished.c.switchSection('review');assert.equal(finished.c.reviewItem(),null);assert.equal(finished.c.dailyCandidates().due.length,0);assert.match(texts(finished.ids.get('view')),/今天的学习已保存/);
});
test('a failed local save leaves the current card ungraded and shows an explicit error',()=>{
 const {c,ids}=harness({version:2,items:[record('one')]});c.switchSection('review');c.startReview(true);const item=c.reviewItem();
 c.localStorage.setItem=()=>{throw new Error('storage unavailable');};vm.runInContext('revealed=true',c);c.gradeReview(item,3);
 assert.equal(c.reviewItem(),item);assert.equal(item.srs,undefined);assert.equal(vm.runInContext('reviewAnswered',c),0);assert.match(ids.get('message').textContent,/未能保存/);
});

test('an expression that is itself a complete question can be learned and retains its original quote',()=>{
 const item={...record('Where do we start?'),sentence:'Where do we start?',sentenceVersion:4,sentenceComplete:true};const {c,ids}=harness({version:2,items:[item]});
 assert.equal(c.dailyCandidates().fresh.length,1);c.switchSection('review');c.startReview(true);assert.equal(c.reviewItem().term,item.term);
 assert.equal(ids.get('view').children[0].children.find(node=>node.tag==='blockquote').children.find(node=>node.tag==='mark').textContent,item.term);
});

test('notebook and extension use the same compact-example function for old long quotes',()=>{
 const shared=fs.readFileSync(path.join(__dirname,'../source-examples.js'),'utf8');
 const fn=shared.slice(shared.indexOf('// A short source clause for reading;')).trim();assert.ok(html.includes(fn));
 const {c}=harness();const quote='We discussed the project in detail because there was a lot to consider and then we reviewed our options but I think there are shortcuts, right? '+('We considered other possibilities and explored them carefully. '.repeat(8));
 const result=c.vocabularyCompactExample(quote,'shortcuts');assert.equal(result.shortened,true);assert.ok(result.sentence.split(/\s+/).length<=36);assert.match(result.sentence,/shortcuts/);assert.equal(result.context,quote.trim());
});

test('old words show the complete sentence already stored, without requiring reimport',()=>{
 const original='the final ingredient is patience and preparation. We learned this when somebody';
 const {c,ids}=harness({version:2,items:[{...record('patience and preparation'),sentence:original,sentenceComplete:false}]});c.switchSection('review');c.startReview(true);
 const card=ids.get('view').children[0],quote=card.children.find(node=>node.tag==='blockquote');const main=quote.children.filter(node=>node.tag!=='details').map(node=>node.textContent||'').join('');
 assert.equal(main,'The final ingredient is patience and preparation.');assert.doesNotMatch(texts(card),/请从新版 Digest 导入|原句待更新/);assert.equal(c.dataset().items[0].sentence,original);
});
test('legacy captions are never hidden just because punctuation or completion metadata is missing',()=>{
 const original='patience and preparation help us stay focused';const {c,ids}=harness({version:2,items:[{...record('patience and preparation'),sentence:original,sentenceComplete:false}]});
 assert.match(texts(ids.get('view')),/help us stay focused/);assert.doesNotMatch(texts(ids.get('view')),/请从新版 Digest 导入|原句待更新/);
});

test('smart review shows one short example, with no full-context or details disclosure',()=>{
 const sentence='I dealt with the damaged parcel. I dealt with the missing receipt as well.';
 const {c,ids}=harness({version:2,items:[{...record('dealt with'),sentence,reason:'表示处理或应对某事',usage:'deal with something：应对某事',supplementVersion:2}]});
 c.switchSection('review');c.startReview(true);const flatten=node=>[node,...(node.children||[]).flatMap(flatten)],card=ids.get('view').children[0],all=flatten(card);
 assert.equal(all.some(node=>node.tag==='details'),false);assert.doesNotMatch(texts(card),/完整上下文|详情/);
 const quote=all.find(node=>node.tag==='blockquote');assert.ok(quote);assert.doesNotMatch(texts(quote),/receipt/);
 c.switchSection('all');assert.match(texts(ids.get('view')),/完整上下文/);
});
test('supplemental usage is inside the hidden answer and appears below meaning on the same reveal',()=>{
 const {c,ids}=harness({version:2,items:[{...record('step by step'),reason:'与 all at once 对照，表示逐步完成',usage:'与 all at once 对照，表示逐步完成',supplementVersion:2}]});
 c.switchSection('review');c.startReview(true);const card=ids.get('view').children[0],answer=card.children.find(node=>node.className==='answer-area is-concealed'),body=answer.children[0],overlay=answer.children[1];
 assert.equal(body.inert,true);assert.equal(body.attributes['aria-hidden'],'true');assert.equal(body.children[0].className,'meaning');
 const notes=body.children.find(node=>node.className==='answer-notes'),actions=body.children.find(node=>node.className==='card-actions');assert.ok(notes);assert.equal(notes.children.length,1);assert.ok(body.children.indexOf(notes)<body.children.indexOf(actions));
 overlay.children[0].listeners.click();assert.equal(body.inert,false);assert.equal(overlay.hidden,true);assert.match(texts(notes),/all at once/);assert.ok(actions.children.every(node=>!node.disabled));
});
