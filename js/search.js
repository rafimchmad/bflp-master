/* search.js - Offline Knowledge Index & smart search engine.
   Pipeline: JSON chunks -> inverted index -> BM25 ranking + fuzzy (typo) +
   synonym/abbreviation expansion (ID/EN) + phrase boosting. */
(function(){
  const idx = window.GBH.searchIndex || [];
  const syn = window.GBH.synonyms || {};
  const glossary = window.GBH.glossary || [];
  const STOP = new Set('yang dan di ke dari untuk pada dengan atau adalah dalam sebagai the a an of to in for and or is are as by on at itu ini'.split(' '));

  function norm(s){ return (s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
  function tokens(s){ return norm(s).split(' ').filter(t=>t && !STOP.has(t)); }

  // ---- Build inverted index + BM25 stats ----
  const df=Object.create(null), postings=Object.create(null);
  let avgdl=0; const docLen=new Array(idx.length);
  idx.forEach((d,i)=>{ const tk=tokens(d.text+' '+d.title); docLen[i]=tk.length; avgdl+=tk.length;
    const tf=Object.create(null); tk.forEach(t=>tf[t]=(tf[t]||0)+1);
    for(const t in tf){ (postings[t]||(postings[t]=[])).push([i,tf[t]]); df[t]=(df[t]||0)+1; } });
  avgdl = avgdl/(idx.length||1);
  const N=idx.length, k1=1.5, b=0.75;
  const vocab=Object.keys(df);

  // ---- Fuzzy: expand a token to close vocabulary terms (edit distance<=1..2) ----
  function lev(a,bb){ const m=a.length,n=bb.length; if(Math.abs(m-n)>2)return 9; const dp=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===bb[j-1]?0:1));}
    return dp[m][n]; }
  function fuzzy(tok){ if(tok.length<4||df[tok])return []; const max=tok.length<=5?1:2; const out=[];
    for(const v of vocab){ if(Math.abs(v.length-tok.length)>max)continue; if(v[0]!==tok[0])continue; if(lev(tok,v)<=max)out.push(v); if(out.length>6)break; } return out; }

  // ---- Expand query with synonyms/abbreviations ----
  function expand(q){ const raw=tokens(q); const set=new Set(raw); const qn=norm(q);
    // whole-query synonym (e.g. "money laundering")
    if(syn[qn]) tokens(syn[qn]).forEach(t=>set.add(t));
    raw.forEach(t=>{ if(syn[t]) tokens(syn[t]).forEach(x=>set.add(x));
      fuzzy(t).forEach(f=>set.add(f)); });
    // glossary aka expansion
    glossary.forEach(g=>{ const names=[g.term,...(g.aka||[])].map(norm);
      if(names.some(n=>n && (qn.includes(n)||n.includes(qn)))) tokens(g.term+' '+(g.aka||[]).join(' ')).forEach(t=>set.add(t)); });
    return [...set]; }

  function bm25(qTokens){ const scores=Object.create(null);
    qTokens.forEach(t=>{ const pl=postings[t]; if(!pl)return; const idf=Math.log(1+(N-df[t]+0.5)/(df[t]+0.5));
      pl.forEach(([i,f])=>{ const dl=docLen[i]||1; const s=idf*(f*(k1+1))/(f+k1*(1-b+b*dl/avgdl)); scores[i]=(scores[i]||0)+s; }); });
    return scores; }

  function highlight(text,qTokens){ let out=text; const uniq=[...new Set(qTokens)].filter(t=>t.length>2).sort((a,b)=>b.length-a.length).slice(0,8);
    uniq.forEach(t=>{ try{ out=out.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>'); }catch(e){} }); return out; }

  function snippet(text,qTokens,len=220){ const low=text.toLowerCase(); let pos=-1;
    for(const t of qTokens){ const p=low.indexOf(t); if(p>=0&&(pos<0||p<pos))pos=p; }
    let start=Math.max(0,pos-60); let s=text.slice(start,start+len); if(start>0)s='…'+s; if(start+len<text.length)s+='…'; return s; }

  const Search={
    query(q,limit=40){ if(!q||!q.trim())return [];
      const qTokens=expand(q); if(!qTokens.length)return [];
      const scores=bm25(qTokens);
      const phrase=norm(q);
      const results=Object.keys(scores).map(i=>{ i=+i; const d=idx[i]; let sc=scores[i];
        if(d.text.toLowerCase().includes(phrase)) sc*=1.8;          // exact phrase boost
        if(d.title.toLowerCase().includes(phrase)) sc*=1.4;
        return {chunk:d,score:sc}; })
        .sort((a,b)=>b.score-a.score).slice(0,limit)
        .map(r=>({ ch:r.chunk.ch,title:r.chunk.title,page:r.chunk.page,score:r.score,
          snippet:highlight(snippet(r.chunk.text,qTokens),qTokens), raw:r.chunk.text }));
      return results; },
    // retrieval for RAG: return top passages
    retrieve(q,k=5){ const qTokens=expand(q); const scores=bm25(qTokens);
      return Object.keys(scores).map(i=>({chunk:idx[+i],score:scores[+i]}))
        .sort((a,b)=>b.score-a.score).slice(0,k).map(r=>r.chunk); },
    expand, tokens, stats(){return {docs:N,terms:vocab.length,avgdl:Math.round(avgdl)};}
  };
  window.Search=Search;
})();
