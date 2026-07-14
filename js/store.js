/* store.js - persistent state, learning analytics (lightweight on-device ML),
   recommendation engine. All data kept in localStorage; nothing leaves device. */
(function(){
  const KEY='gbh_state_v1';
  const def={
    bookmarks:[],           // {ch,page,label,ts}
    favorites:[],           // term names
    recent:[],              // {type,ch,page,label,ts}
    notes:[],               // {id,ch,page,text,tag,color,ts}
    searchHistory:[],       // {q,ts}
    progress:{},            // ch -> {pagesRead:[], done:bool}
    quiz:[],                // {ts,total,correct,wrongCh:[]}
    flash:{},               // cardId -> {box,due,seen}
    termOpens:{},           // term -> count
    chapterOpens:{},        // ch -> count
    wrongTopics:{},         // ch -> wrongCount
    activity:{},            // 'YYYY-MM-DD' -> minutes
    streak:0, lastActive:null,
    settings:{theme:'light', apiUrl:'', apiKey:'', model:'gpt-4o-mini'},
    sessionStart:Date.now()
  };
  let s;
  try{ s=Object.assign({},def,JSON.parse(localStorage.getItem(KEY)||'{}')); }
  catch(e){ s=Object.assign({},def); }
  s.settings=Object.assign({},def.settings,s.settings||{});

  let saveTimer=null;
  function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){} },120); }
  function today(){ return new Date().toISOString().slice(0,10); }

  const Store={
    get s(){return s;},
    save,
    reset(){ s=JSON.parse(JSON.stringify(def)); s.sessionStart=Date.now(); save(); },
    export(){ return JSON.stringify(s,null,2); },
    import(json){ try{ s=Object.assign({},def,JSON.parse(json)); save(); return true;}catch(e){return false;} },

    // ----- activity / streak -----
    tick(mins){ const t=today(); s.activity[t]=(s.activity[t]||0)+(mins||0.5);
      if(s.lastActive!==t){ const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
        s.streak = (s.lastActive===y)? (s.streak||0)+1 : 1; s.lastActive=t; }
      save(); },

    // ----- recent -----
    pushRecent(item){ item.ts=Date.now();
      s.recent=s.recent.filter(r=>!(r.type===item.type&&r.ch===item.ch&&r.page===item.page&&r.label===item.label));
      s.recent.unshift(item); s.recent=s.recent.slice(0,40); save(); },

    // ----- bookmarks -----
    toggleBookmark(b){ const i=s.bookmarks.findIndex(x=>x.ch===b.ch&&x.page===b.page);
      if(i>=0){s.bookmarks.splice(i,1); save(); return false;} b.ts=Date.now(); s.bookmarks.unshift(b); save(); return true; },
    isBookmarked(ch,page){ return s.bookmarks.some(x=>x.ch===ch&&x.page===page); },

    // ----- favorites (terms) -----
    toggleFav(term){ const i=s.favorites.indexOf(term); if(i>=0){s.favorites.splice(i,1);save();return false;} s.favorites.unshift(term);save();return true; },
    isFav(term){ return s.favorites.includes(term); },

    // ----- notes -----
    addNote(n){ n.id='n'+Date.now()+Math.random().toString(36).slice(2,6); n.ts=Date.now(); s.notes.unshift(n); save(); return n; },
    updateNote(id,patch){ const n=s.notes.find(x=>x.id===id); if(n){Object.assign(n,patch); save();} },
    delNote(id){ s.notes=s.notes.filter(x=>x.id!==id); save(); },

    // ----- search history + term tracking -----
    logSearch(q){ if(!q||q.length<2)return; s.searchHistory.unshift({q,ts:Date.now()}); s.searchHistory=s.searchHistory.slice(0,60);
      const key=q.trim().toLowerCase(); s.termOpens[key]=(s.termOpens[key]||0)+1; save(); },
    openTerm(term){ s.termOpens[term.toLowerCase()]=(s.termOpens[term.toLowerCase()]||0)+1; save(); },

    // ----- progress -----
    markRead(ch,page){ const p=s.progress[ch]||(s.progress[ch]={pagesRead:[],done:false});
      if(!p.pagesRead.includes(page)) p.pagesRead.push(page); s.chapterOpens[ch]=(s.chapterOpens[ch]||0)+1;
      const meta=(window.GBH.meta||[]).find(m=>m.ch===ch); if(meta&&p.pagesRead.length>=Math.max(3,meta.pages*0.6)) p.done=true; save(); },
    chapterPct(ch){ const p=s.progress[ch]; const meta=(window.GBH.meta||[]).find(m=>m.ch===ch);
      if(!p||!meta) return 0; return Math.min(100,Math.round(p.pagesRead.length/meta.pages*100)); },
    overallPct(){ const M=window.GBH.meta||[]; if(!M.length)return 0;
      let read=0,tot=0; M.forEach(m=>{tot+=m.pages; read+=((s.progress[m.ch]||{}).pagesRead||[]).length;}); return Math.round(read/tot*100); },

    // ----- quiz -----
    logQuiz(total,correct,wrongCh){ s.quiz.unshift({ts:Date.now(),total,correct,wrongCh});
      (wrongCh||[]).forEach(c=>{ s.wrongTopics[c]=(s.wrongTopics[c]||0)+1; }); s.quiz=s.quiz.slice(0,50); save(); },
    avgScore(){ if(!s.quiz.length)return 0; return Math.round(s.quiz.reduce((a,q)=>a+q.correct/q.total*100,0)/s.quiz.length); },

    // ----- flashcard spaced repetition (Leitner) -----
    reviewCard(id,correct){ const now=Date.now(); const c=s.flash[id]||(s.flash[id]={box:1,due:now,seen:0});
      c.seen++; c.box=correct?Math.min(5,c.box+1):1;
      const days=[0,1,2,4,7,15][c.box]; c.due=now+days*864e5; save(); },
    dueCards(list){ const now=Date.now(); return list.filter(c=>{const st=s.flash[c.id]; return !st||st.due<=now;}); },

    // ===== Recommendation engine (on-device heuristic learning) =====
    recommendations(){
      const recs=[]; const CH=window.GBH.chapters||[];
      // 1. weakest chapters by quiz errors
      const weak=Object.entries(s.wrongTopics).sort((a,b)=>b[1]-a[1]).slice(0,3);
      weak.forEach(([ch,n])=>{ const c=CH.find(x=>x.ch==ch); if(c) recs.push({icon:'⚠',type:'Perlu diulang',ch:+ch,
        text:`Bab ${ch} · ${c.title}`,reason:`${n}x salah di kuis`}); });
      // 2. unread / low progress chapters
      CH.map(c=>({c,pct:Store.chapterPct(c.ch)})).filter(x=>x.pct<40).sort((a,b)=>a.pct-b.pct).slice(0,3)
        .forEach(x=>recs.push({icon:'◷',type:'Belum dikuasai',ch:x.c.ch,text:`Bab ${x.c.ch} · ${x.c.title}`,reason:`${x.pct}% dibaca`}));
      // 3. frequently searched terms -> suggest glossary
      Object.entries(s.termOpens).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([t,n])=>{
        recs.push({icon:'✦',type:'Sering dicari',term:t,text:`Perdalam: \u201c${t}\u201d`,reason:`${n}x dicari`}); });
      return recs.slice(0,6);
    },
    // daily/weekly review sets
    reviewPlan(){
      const dueFlash=Store.dueCards(window.GBH.flashcards||[]).length;
      const weakCh=Object.entries(s.wrongTopics).sort((a,b)=>b[1]-a[1])[0];
      return { daily:`Review ${Math.min(10,dueFlash||10)} flashcard + 5 soal kuis`,
        weekly: weakCh? `Fokus mingguan: Bab ${weakCh[0]} (paling sering salah)` : 'Selesaikan 1 bab baru minggu ini',
        estMinutes: Math.round(((window.GBH.meta||[]).reduce((a,m)=>a+m.pages,0)-
          Object.values(s.progress).reduce((a,p)=>a+p.pagesRead.length,0))*0.4) };
    }
  };
  window.Store=Store;
  // heartbeat for activity tracking
  setInterval(()=>{ if(document.hasFocus()) Store.tick(0.5); }, 30000);
})();
