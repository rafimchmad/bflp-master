/* app.js - bootstrap, routing, sidebar/directory, command palette, shortcuts,
   global search, chat wiring, event delegation. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const CH=window.GBH.chapters||[], G=window.GBH.glossary||[];
  const V=window.Views;
  const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // ---- Router ----
  function route(state){ state=state||{view:'home'};
    try{ switch(state.view){
      case 'chapter': V.chapter(+state.ch); break;
      case 'pdf': V.pdfView(+state.ch,+state.page||1); break;
      case 'search': V.search(state.q||''); break;
      case 'glossary': V.glossary(state.term); break;
      case 'flash': V.flash(state.mode); break;
      case 'quiz': V.quiz(); break;
      case 'dashboard': V.dashboard(); break;
      case 'notes': V.notes(); break;
      case 'graph': V.graph(); break;
      case 'settings': V.settings(); break;
      default: V.home();
    }}catch(e){ console.error(e); $('#viewRoot').innerHTML='<div class="view"><div class="empty">Terjadi kesalahan: '+esc(e.message)+'</div></div>'; }
    document.querySelector('.main').scrollTop=0;
  }
  window.go=route;

  // ---- Sidebar: Directory tree ----
  const openCh=new Set();
  function renderDir(){
    const body=$('#sideBody');
    let html='<div class="side-title">Navigasi Cepat</div>';
    html+=['home:Beranda','dashboard:Dashboard','graph:Concept Graph','glossary:Glosarium','flash:Flashcard','quiz:Kuis','notes:Catatan']
      .map(x=>{const[v,l]=x.split(':');return `<div class="list-item" data-view="${v}">▸ ${l}</div>`;}).join('');
    html+='<div class="side-title">Direktori Materi</div>';
    CH.forEach(c=>{ const open=openCh.has(c.ch); const pct=Store.chapterPct(c.ch);
      html+=`<div class="tree-node"><div class="tree-row ${open?'open':''}" data-toggle="${c.ch}">
        <span class="tw">›</span><span>${c.ch}. ${esc(c.title)}</span><span class="badge">${pct}%</span></div>`;
      if(open){ html+='<div class="tree-children">';
        html+=`<div class="subtopic" data-view="chapter" data-ch="${c.ch}">📑 Smart Summary</div>`;
        html+=`<div class="subtopic" data-view="pdf" data-ch="${c.ch}" data-page="1">📖 Buka PDF (${c.pages} hal)</div>`;
        (c.terms||[]).forEach(t=>html+=`<div class="subtopic" data-term="${esc(t)}">• ${esc(t)}</div>`);
        // sub-topics from key takeaways
        (c.takeaways||[]).slice(0,4).forEach((t,i)=>html+=`<div class="subtopic" data-view="chapter" data-ch="${c.ch}">◦ ${esc(t.slice(0,42))}…</div>`);
        html+='</div>'; }
      html+='</div>'; });
    body.innerHTML=html;
  }
  function renderBookmarks(){ const b=Store.s.bookmarks;
    $('#sideBody').innerHTML='<div class="side-title">Bookmark</div>'+(b.length?b.map(x=>`<div class="list-item" data-view="pdf" data-ch="${x.ch}" data-page="${x.page}">★ ${esc(x.label||('Bab '+x.ch+' hal.'+x.page))}<span class="x" data-unbook='${x.ch}-${x.page}'>✕</span></div>`).join(''):'<div class="empty">Belum ada bookmark.</div>'); }
  function renderRecent(){ const r=Store.s.recent;
    $('#sideBody').innerHTML='<div class="side-title">Terakhir dilihat</div>'+(r.length?r.map(x=>`<div class="list-item" data-view="${x.type==='pdf'?'pdf':'chapter'}" data-ch="${x.ch}" data-page="${x.page||1}">🕒 ${esc(x.label)}</div>`).join(''):'<div class="empty">Belum ada riwayat.</div>'); }
  function renderFav(){ const f=Store.s.favorites;
    $('#sideBody').innerHTML='<div class="side-title">Favorit</div>'+(f.length?f.map(t=>`<div class="list-item" data-term="${esc(t)}">♥ ${esc(t)}<span class="x" data-unfav="${esc(t)}">✕</span></div>`).join(''):'<div class="empty">Belum ada favorit. Tandai istilah di Glosarium.</div>'); }
  let sideTab='dir';
  function renderSide(){ ({dir:renderDir,book:renderBookmarks,recent:renderRecent,fav:renderFav}[sideTab])(); }

  $$('.side-tabs button').forEach(b=>b.onclick=()=>{ $$('.side-tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); sideTab=b.dataset.stab; renderSide(); });

  // ---- Global click delegation ----
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-view],[data-toggle],[data-term],[data-explain],[data-flash],[data-bookmark],[data-fav],[data-unfav],[data-unbook],[data-nav],[data-rec],[data-search],[data-check]');
    if(!t)return;
    if(t.dataset.toggle){ const c=+t.dataset.toggle; openCh.has(c)?openCh.delete(c):openCh.add(c); renderDir(); return; }
    if(t.hasAttribute('data-view')){ const st={view:t.dataset.view}; if(t.dataset.ch)st.ch=+t.dataset.ch; if(t.dataset.page)st.page=+t.dataset.page; if(t.dataset.mode)st.mode=t.dataset.mode; route(st); highlightActive(); return; }
    if(t.dataset.term){ route({view:'glossary',term:t.dataset.term}); return; }
    if(t.dataset.explain){ V.explain(t.dataset.explain,t.dataset.mode); return; }
    if(t.dataset.flash){ V.flash(t.dataset.flash); return; }
    if(t.hasAttribute('data-bookmark')){ const on=Store.toggleBookmark({ch:+t.dataset.ch,page:+t.dataset.page,label:'Bab '+t.dataset.ch+' hal.'+t.dataset.page}); t.textContent=(on?'★':'☆')+' Bookmark'; V.toast(on?'Ditambahkan ke bookmark':'Bookmark dihapus'); return; }
    if(t.dataset.fav){ const on=Store.toggleFav(t.dataset.fav); t.textContent=(on?'★':'☆')+' Favorit'; V.toast(on?'Difavoritkan':'Favorit dihapus'); return; }
    if(t.dataset.unfav){ Store.toggleFav(t.dataset.unfav); renderFav(); return; }
    if(t.dataset.unbook){ const[c,p]=t.dataset.unbook.split('-'); Store.toggleBookmark({ch:+c,page:+p}); renderBookmarks(); return; }
    if(t.dataset.search){ $('#globalSearch').value=t.dataset.search; route({view:'search',q:t.dataset.search}); return; }
    if(t.dataset.rec){ const r=JSON.parse(t.dataset.rec); if(r.term)route({view:'glossary',term:r.term}); else if(r.ch)route({view:'chapter',ch:r.ch}); return; }
    if(t.dataset.nav){ try{const st=JSON.parse(t.dataset.nav); if(st.view)route(st);}catch(_){}; return; }
  });
  function highlightActive(){ /* placeholder for active state sync */ }

  // ---- Global search (debounced, live) ----
  const gs=$('#globalSearch'); let deb;
  gs.addEventListener('input',()=>{ clearTimeout(deb); const q=gs.value.trim(); deb=setTimeout(()=>{ if(q.length>=2)route({view:'search',q}); },250); });
  gs.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const q=gs.value.trim(); if(q)route({view:'search',q}); } });

  // ---- Theme ----
  function applyTheme(t){ document.documentElement.setAttribute('data-theme',t); Store.s.settings.theme=t; Store.save(); $('#btnTheme').textContent=t==='dark'?'☀':'☾'; }
  applyTheme(Store.s.settings.theme||'light');
  $('#btnTheme').onclick=()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
  $('#btnSidebar').onclick=()=>$('#sidebar').classList.toggle('collapsed');
  $('#btnChat').onclick=()=>$('#chat').classList.toggle('collapsed');

  // ---- Chat ----
  const chatBody=$('#chatBody'); let chatHist=[];
  const SUGGEST=['Apa itu KUR?','Kenapa CASA penting?','Jelaskan Giro seperti saya umur 10 tahun','Bandingkan Giro vs Deposito','Bagaimana alur pembukaan rekening?','Sebutkan 8 jenis risiko bank'];
  function renderSuggest(){ $('#chatSuggest').innerHTML=SUGGEST.map(s=>`<span class="chip" data-ask="${esc(s)}">${esc(s)}</span>`).join(''); }
  function addMsg(role,text,sources,external){ const d=document.createElement('div'); d.className='msg '+role;
    let html=esc(text).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/\n/g,'<br>');
    if((sources&&sources.length)||(external&&external.length)){ html+='<div class="src">';
      if(sources&&sources.length){ html+='<span class="src-badge src-pdf">DARI MATERI PDF</span> ';
        html+=sources.map(s=>`<a href="#" data-view="pdf" data-ch="${s.ch}" data-page="${s.page}">Bab ${s.ch}/hal.${s.page}</a>`).join(''); }
      if(external&&external.length){ html+='<br><span class="src-badge src-ext">REFERENSI EKSTERNAL</span> ';
        html+=external.map(x=>`<a href="${x.url}" target="_blank">${esc(x.name)}</a>`).join(', '); }
      html+='</div>'; }
    d.innerHTML=html; chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight; return d; }
  async function ask(q){ if(!q.trim())return; addMsg('user',q); chatHist.push({role:'user',text:q}); $('#chatInput').value='';
    const loading=addMsg('ai','… mencari di materi'); 
    try{ const res=await window.Chat.ask(q,chatHist); loading.remove(); addMsg('ai',res.text,res.sources,res.external); chatHist.push({role:'ai',text:res.text}); }
    catch(e){ loading.remove(); addMsg('ai','Maaf, terjadi kesalahan: '+e.message); } }
  $('#chatSend').onclick=()=>ask($('#chatInput').value);
  $('#chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); ask($('#chatInput').value); } });
  $('#chatClear').onclick=()=>{ chatBody.innerHTML=''; chatHist=[]; greet(); };
  $('#chatSettings').onclick=()=>route({view:'settings'});
  document.addEventListener('click',e=>{ const a=e.target.closest('[data-ask]'); if(a){ ask(a.dataset.ask); } });
  function greet(){ addMsg('ai','Halo! Saya AI Tutor Anda untuk General Banking. Tanyakan istilah, konsep, atau minta penjelasan/analogi. Saya menjawab dari materi PDF (dengan sitasi halaman) dan menandai bila memakai referensi eksternal.'); renderSuggest(); }

  // ---- Command palette (Ctrl/Cmd+K) ----
  const cmds=[{t:'Beranda',v:{view:'home'},k:'G H'},{t:'Dashboard',v:{view:'dashboard'}},{t:'Concept Graph',v:{view:'graph'}},
    {t:'Glosarium',v:{view:'glossary'}},{t:'Flashcard',v:{view:'flash'}},{t:'Kuis',v:{view:'quiz'}},{t:'Catatan',v:{view:'notes'}},
    {t:'Pengaturan AI',v:{view:'settings'}},{t:'Ganti tema terang/gelap',fn:()=>$('#btnTheme').click()}]
    .concat(CH.map(c=>({t:'Bab '+c.ch+': '+c.title,v:{view:'chapter',ch:c.ch}})))
    .concat(G.map(g=>({t:'Istilah: '+g.term,v:{view:'glossary',term:g.term}})));
  let cmdSel=0, cmdFiltered=cmds;
  function openCmd(){ $('#cmdk').classList.add('open'); $('#cmdkInput').value=''; $('#cmdkInput').focus(); filterCmd(''); }
  function closeCmd(){ $('#cmdk').classList.remove('open'); }
  function filterCmd(q){ q=q.toLowerCase(); cmdFiltered=cmds.filter(c=>c.t.toLowerCase().includes(q)).slice(0,40); cmdSel=0; drawCmd(); }
  function drawCmd(){ $('#cmdkList').innerHTML=cmdFiltered.map((c,i)=>`<div class="cmdk-item ${i===cmdSel?'sel':''}" data-ci="${i}"><span>›</span>${esc(c.t)}${c.k?`<span class="k">${c.k}</span>`:''}</div>`).join('')||'<div class="cmdk-item">Tidak ada</div>'; }
  function runCmd(c){ if(!c)return; closeCmd(); if(c.fn)c.fn(); else route(c.v); }
  $('#cmdkInput').addEventListener('input',e=>filterCmd(e.target.value));
  $('#cmdkInput').addEventListener('keydown',e=>{ if(e.key==='ArrowDown'){cmdSel=Math.min(cmdFiltered.length-1,cmdSel+1);drawCmd();e.preventDefault();}
    else if(e.key==='ArrowUp'){cmdSel=Math.max(0,cmdSel-1);drawCmd();e.preventDefault();}
    else if(e.key==='Enter'){runCmd(cmdFiltered[cmdSel]);} else if(e.key==='Escape'){closeCmd();} });
  $('#cmdkList').addEventListener('click',e=>{ const it=e.target.closest('[data-ci]'); if(it)runCmd(cmdFiltered[+it.dataset.ci]); });
  $('#cmdk').addEventListener('click',e=>{ if(e.target.id==='cmdk')closeCmd(); });

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown',e=>{ const tag=(e.target.tagName||'').toLowerCase(); const typing=tag==='input'||tag==='textarea';
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); openCmd(); return; }
    if((e.ctrlKey||e.metaKey)&&e.key==='/'){ e.preventDefault(); $('#globalSearch').focus(); return; }
    if(typing)return;
    if(e.key==='/'){ e.preventDefault(); $('#globalSearch').focus(); }
    else if(e.key.toLowerCase()==='t')$('#btnTheme').click();
    else if(e.key.toLowerCase()==='b')$('#btnSidebar').click();
    else if(e.key.toLowerCase()==='c')$('#btnChat').click();
    else if(e.key.toLowerCase()==='g')route({view:'graph'});
    else if(e.key.toLowerCase()==='q')route({view:'quiz'});
    else if(e.key.toLowerCase()==='f')route({view:'flash'});
  });

  // ---- boot ----
  function boot(){ renderSide(); greet(); route({view:'home'});
    // periodic sidebar refresh to reflect progress
    const _r=window.go; window.go=st=>{_r(st); if(sideTab==='dir')renderDir();};
    console.log('General Banking Hub ready.',window.Search.stats());
  }
  boot();
})();
