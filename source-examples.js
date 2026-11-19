// Shared original-caption example parsing. No network access.
function vocabularyNormalize(text) {
  return String(text || "").normalize("NFKC").toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, " ").replace(/\s+/g, " ").trim();
}
// Reconstruct source windows; AI punctuation is accepted only after original-word validation.
function vocabularyTermRange(text, term) {
  const tokens=vocabularyExampleWords(text),wanted=vocabularyExampleWords(term);
  if(!wanted.length)return null;
  for(let i=0;i<=tokens.length-wanted.length;i++)if(wanted.every((token,j)=>token.word===tokens[i+j].word))return{start:tokens[i].start,end:tokens[i+wanted.length-1].end};
  return null;
}
function vocabularySourceSentence(transcript, index, term, includeWindow = false) {
  if (!transcript[index]) return null;
  const anchor = transcript.slice(index, index + 3).map(segment => String(segment.text || '')).join(' ');
  const target = vocabularyTermRange(anchor, term);
  if (!target) return null;
  // Bound unusual, unpunctuated captions while allowing sentences across many cues.
  let first = index, last = Math.min(transcript.length - 1, index + 2), size = anchor.length;
  while (first > 0 && index - first < 30 && size < 10000 && transcript[index].start - transcript[first - 1].start < 90) {
    const previous = transcript[first - 1];
    if (Number.isFinite(previous.duration) && transcript[first].start - previous.start - previous.duration > 2 && /[.!?]["”’')\]]*\s*$/.test(String(previous.text||''))) break;
    first--; size += String(previous.text || '').length + 1;
  }
  while (last + 1 < transcript.length && last - index < 30 && size < 10000 && transcript[last + 1].start - transcript[index].start < 90) {
    const current = transcript[last];
    if (Number.isFinite(current.duration) && transcript[last + 1].start - current.start - current.duration > 2 && /[.!?]["”’')\]]*\s*$/.test(String(current.text||''))) break;
    last++; size += String(transcript[last].text || '').length + 1;
  }
  const parts = transcript.slice(first, last + 1).map(segment => String(segment.text || ''));
  const text = parts.join(' '), offset = parts.slice(0, index - first).reduce((total, part) => total + part.length + 1, 0);
  const from = offset + target.start, to = offset + target.end;
  const sentences = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('en', {granularity:'sentence'}).segment(text)].map(item => ({start:item.index, end:item.index + item.segment.length}))
    : [...text.matchAll(/[^.!?]+[.!?]*\s*/g)].map(item => ({start:item.index, end:item.index + item[0].length}));
  // Intl sentence segmentation can split honorifics such as "Dr. Smith".
  for (let i = 1; i < sentences.length; i++) {
    if (/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)\.|\b(?:[A-Z]\.){1,3})\s*$/.test(text.slice(sentences[i - 1].start, sentences[i - 1].end))) {
      sentences[i - 1].end = sentences[i].end; sentences.splice(i, 1); i--;
    }
  }
  const begin = sentences.findIndex(item => item.end > from);
  let finish = sentences.findIndex(item => item.end >= to); if (finish < begin) finish = begin;
  if (begin < 0) return null;
  const start = sentences[begin].start, end = sentences[finish].end;
  const sentence = text.slice(start, end).trim();
  if (!sentence || !vocabularyTermRange(sentence, term)) return null;
  const adjacent = text.slice(sentences[Math.max(0, begin - 1)].start, sentences[Math.min(sentences.length - 1, finish + 1)].end).trim();
  const context = adjacent !== sentence && (sentence.length < 50 || /^(?:it|this|that|they|these|those)\b/i.test(sentence)) ? adjacent : '';
  const endPart = parts.findIndex((_, i) => parts.slice(0, i + 1).join(' ').length >= end);
  const finalSegment = transcript[first + Math.max(0, endPart)];
  return {sentence, sourceContext:context, sentenceVersion:2,
    sentenceComplete:/[.!?]["”’')\]]*\s*$/.test(sentence)&&(first===0||start>0),
    ...(includeWindow ? {windowText:text, windowFrom:from, windowTo:to} : {}),
    endTimestamp:Math.max(transcript[index].start + 1, Number(finalSegment.start) + (Number(finalSegment.duration) || 3))};
}
function vocabularyExampleWords(text) {
  return [...String(text).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(match => ({word:match[0].normalize('NFKC').toLowerCase().replace(/’/g,"'"),start:match.index,end:match.index+match[0].length}));
}
function validateVocabularyExample(value, context, term) {
  if (typeof value !== 'string' || value.length > 6000 || !/[.!?]["”’')\]]*\s*$/.test(value)) return null;
  const words=vocabularyExampleWords(value), original=vocabularyExampleWords(context.windowText);
  if (!words.length || !vocabularyTermRange(value,term)) return null;
  // Match a contiguous source span containing this occurrence. Only punctuation/case may change.
  for (let i=0;i<=original.length-words.length;i++) {
    if (original[i].start>context.windowFrom || original[i+words.length-1].end<context.windowTo) continue;
    if (words.every((token,j)=>token.word===original[i+j].word)) return value.trim();
  }
  return null;
}

function vocabularyPrepareExample(item,transcript){
 if(!Array.isArray(transcript)||!transcript.length)return item;
 const index=transcript.findIndex((segment,i)=>segment.start<=item.timestamp&&(!transcript[i+1]||transcript[i+1].start>item.timestamp));
 let original=null;
 for(const candidate of [index,index-1,index+1]){if(candidate<0||!transcript[candidate]||Math.abs(transcript[candidate].start-item.timestamp)>15)continue;original=vocabularySourceSentence(transcript,candidate,item.term,true);if(original)break;}
 if(!original)return item;
 const {windowText,windowFrom,windowTo,...source}=original;
 if(item.sentenceVersion>=3&&validateVocabularyExample(item.sentence,original,item.term)){
  // Trim adjacent sentences from older cached quotes, using punctuation rather than cue boundaries.
  const target=vocabularyTermRange(item.sentence,item.term);
  const parts=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(item.sentence)];
  const first=parts.findIndex(part=>part.index+part.segment.length>target.start),last=parts.findIndex(part=>part.index+part.segment.length>=target.end);
  const quote=first>=0&&last>=first?item.sentence.slice(parts[first].index,parts[last].index+parts[last].segment.length).trim():item.sentence;
  if(validateVocabularyExample(quote,original,item.term))return{...item,sentence:quote,sentenceVersion:4,sentenceComplete:true};
 }
 return{...item,...source};
}

// A short source clause for reading; the unchanged quotation remains available as context.
function vocabularyCompactExample(value,term){
 const fullSource=String(value||'').trim();let source=fullSource;
 const words=text=>[...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(m=>({word:m[0].normalize('NFKC').toLowerCase().replace(/’/g,"'"),start:m.index,end:m.index+m[0].length}));
 let tokens=words(source);const wanted=words(String(term||''));let hit=-1;
 if(wanted.length)for(let i=0;i<=tokens.length-wanted.length;i++)if(wanted.every((w,j)=>w.word===tokens[i+j].word)){hit=i;break;}
 if(hit>=0&&typeof Intl.Segmenter==='function'){
  const from=tokens[hit].start,to=tokens[hit+wanted.length-1].end,parts=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(source)];
  const first=parts.findIndex(part=>part.index+part.segment.length>from),last=parts.findIndex(part=>part.index+part.segment.length>=to);
  if(first>=0&&last>=first){const candidate=source.slice(parts[first].index,parts[last].index+parts[last].segment.length).trim();if(/[.!?]["”’')\]]*$/.test(candidate)&&candidate!==source){source=candidate.replace(/^([a-z])/,c=>c.toUpperCase());tokens=words(source);hit=-1;for(let i=0;i<=tokens.length-wanted.length;i++)if(wanted.every((w,j)=>w.word===tokens[i+j].word)){hit=i;break;}}}
 }
 const unchanged={sentence:source,context:source!==fullSource?fullSource:'',shortened:source!==fullSource};
 if(hit<0||tokens.length<=32)return unchanged;
 const from=tokens[hit].start,to=tokens[hit+wanted.length-1].end;
 const starts=new Map([[0,1]]),ends=new Map([[source.length,1]]);
 // Real punctuation and grammatical transitions are the only candidate boundaries.
 for(const m of source.matchAll(/[.!?;:,—]+["”’')\]]*\s+/g)){const end=m.index+m[0].trimEnd().length,start=m.index+m[0].length;ends.set(end,2);starts.set(start,2);}
 const transitions=/\b(?:and then|but then|and|but|so|because|although|while|when|like|then)\s+/gi;
 for(const m of source.matchAll(transitions)){ends.set(m.index,1);starts.set(m.index,0);starts.set(m.index+m[0].length,0);}
 const subjects=/\b(?:I (?:think|thought|said|realized|realised|decided|wanted|had)|we (?:chose|wanted|decided|need|needed|have|had|did|didn't|can|could)|there(?:'s| is| are| was| were)|it(?:'s| is| was| means| can)|you (?:can|could|need|have)|they (?:have|can|are|were))\b/gi;
 for(const m of source.matchAll(subjects)){starts.set(m.index,/^I think$/i.test(m[0])?7:3);ends.set(m.index,0);}
 let best=null;
 for(const [start,quality]of starts){
  if(start>from)continue;
  for(const [end,endQuality]of ends){
   if(end<to||end<=start)continue;
   let raw=source.slice(start,end).trim().replace(/^[,;:—\s]+|[,;:—\s]+$/g,'');
   raw=raw.replace(/^(?:(?:um|uh|like|then)\b[\s,]*)+/i,'').replace(/(?:[\s,]+(?:and|but|then|um|uh|when|so|like))+$/i,'').trim();
   const tag=source.slice(end).match(/^[,\s]*(?:right|isn't it|don't you)\?/i);if(tag)raw+=', '+tag[0].replace(/^[,\s]*/,'');
   const count=words(raw).length;
   if(count<Math.max(5,wanted.length+2)||count>=tokens.length)continue;
   if(/\b(?:a|an|the|to|of|with|for|at|in|and|or|but|because|than|as|that|which|we|they|you|I|is|are|was|were|have|had)\s*$/i.test(raw))continue;
   if(/\b(?:I|we|they|you|he|she)\s+(?:decided|wanted|said|thought|think|realized|realised|knew|know)\s*$/i.test(raw))continue;
   let score=Math.abs(count-20)*0.45+Math.max(0,count-36)*8-quality*2-endQuality;
   if(/\b(there's|there is|there are)[\s\S]{0,35}\b\1\b/i.test(raw))score+=8;
   score+=(raw.match(/\b(?:um|uh)\b/gi)||[]).length*0.8;
   if(/^(?:because|although|while|when|where|which|that|like|to|of|with|at|as)\b/i.test(raw))score+=9;
   if(!best||score<best.score)best={raw,score};
  }
 }
 if(!best)return unchanged;
 let sentence=best.raw.replace(/^([a-z])/,c=>c.toUpperCase());
 if(!/[.!?]["”’')\]]*$/.test(sentence))sentence+='.';
 return{sentence,context:fullSource,shortened:true};
}
