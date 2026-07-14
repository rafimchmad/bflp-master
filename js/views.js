/* views.js - all rendering surfaces. Each view returns HTML into #viewRoot. */
(function(){
  const CH=window.GBH.chapters||[], G=window.GBH.glossary||[], META=window.GBH.meta||[];
  const $=s=>document.querySelector(s), root=()=>$('#viewRoot'), crumb=()=>$('#crumb');
  const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const pdf=ch=>`assets/pdf/${(META.find(m=>m.ch===ch)||{}).file}`;
  function setCrumb(parts){ crumb().innerHTML=parts.map((p,i)=>i===parts.length-1?`<b>${esc(p.t)}</b>`:
    `<a href="#" data-nav='${JSON.stringify(p.go||{})}'>${esc(p.t)}</a> <span>›</span>`).join(' '); }
  function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }

  // ---------------- HOME / DASHBOARD ----------------
  function home(){
    setCrumb([{t:'Beranda'}]);
    const pct=Store.overallPct(), avg=Store.avgScore(), st=Store.s;
    const done=CH.filter(c=>Store.chapterPct(c.ch)>=90).length;
    const pagesRead=Object.values(st.progress).reduce((a,p)=>a+p.pagesRead.length,0);
    const recs=Store.recommendations(); const plan=Store.reviewPlan();
    root().innerHTML=`
    <div class="view">
      <div class="card hero">
        <h2>Selamat belajar, ${esc((st.settings.name)||'Barney')} 👋</h2>
        <p style="color:var(--muted);margin:4px 0 14px">General Banking Certification · BFLP BRI — 19 bab · ${META.reduce((a,m)=>a+m.pages,0)} halaman terindeks.</p>
        <div class="progressbar"><div style="width:${pct}%"></div></div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">Progres keseluruhan: <b>${pct}%</b></div>
        <div class="btnrow" style="margin-top:14px">
          <button class="btn primary" data-view="quiz">Mulai Kuis</button>
          <button class="btn" data-view="flash">Flashcard</button>
          <button class="btn" data-view="graph">Concept Graph</button>
          <button class="btn" data-view="glossary">Glosarium</button>
        </div>
      </div>
      <div class="grid c4">
        <div class="stat"><div class="n">${done}/19</div><div class="l">Bab dikuasai</div></div>
        <div class="stat"><div class="n">${pagesRead}</div><div class="l">Halaman dibaca</div></div>
        <div class="stat"><div class="n">${avg}%</div><div class="l">Rata-rata kuis</div></div>
        <div class="stat"><div class="n">${st.streak||0}🔥</div><div class="l">Hari beruntun</div></div>
      </div>
      <div class="grid c2" style="margin-top:16px">
        <div class="card"><h3>🎯 Rekomendasi untuk Anda</h3>
          ${recs.length?recs.map(r=>`<div class="list-item" data-rec='${JSON.stringify(r)}'>
            <span>${r.icon}</span><div><div>${esc(r.text)}</div>
            <div style="font-size:11px;color:var(--muted)">${esc(r.type)} · ${esc(r.reason)}</div></div></div>`).join('')
            :'<div class="empty">Mulai belajar & kerjakan kuis agar AI memberi rekomendasi.</div>'}
        </div>
        <div class="card"><h3>🗓 Rencana Belajar</h3>
          <p>• <b>Harian:</b> ${esc(plan.daily)}</p>
          <p>• <b>Mingguan:</b> ${esc(plan.weekly)}</p>
          <p>• <b>Estimasi selesai:</b> ±${plan.estMinutes} menit belajar lagi</p>
          <h3>Bab</h3>
          <div>${CH.map(c=>`<span class="chip" data-view="chapter" data-ch="${c.ch}">${c.ch}. ${esc(c.title)} · ${Store.chapterPct(c.ch)}%</span>`).join('')}</div>
        </div>
      </div>
    </div>`;
  }

  // ---------------- DASHBOARD (detailed) ----------------
  function dashboard(){
    setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Dashboard'}]);
    const st=Store.s; const days=[];
    for(let i=181;i>=0;i--){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10); days.push([d,st.activity[d]||0]); }
    const max=Math.max(1,...days.map(d=>d[1]));
    const heat=days.map(([d,v])=>{ const a=v/max; const bg=v?`background:color-mix(in srgb,var(--accent) ${Math.round(20+a*80)}%,var(--surface-2))`:''; return `<span title="${d}: ${v} mnt" style="${bg}"></span>`; }).join('');
    const hist=st.searchHistory.slice(0,15).map(h=>`<span class="chip" data-search="${esc(h.q)}">${esc(h.q)}</span>`).join('')||'<span style="color:var(--muted)">Belum ada</span>';
    const quizRows=st.quiz.slice(0,8).map(q=>`<tr><td>${new Date(q.ts).toLocaleDateString('id')}</td><td>${q.correct}/${q.total}</td><td>${Math.round(q.correct/q.total*100)}%</td></tr>`).join('')||'<tr><td colspan=3 style="color:var(--muted)">Belum ada kuis</td></tr>';
    const flashSeen=Object.keys(st.flash).length, flashDue=Store.dueCards(window.GBH.flashcards||[]).length;
    root().innerHTML=`<div class="view">
      <div class="card"><h2>📊 Progress Dashboard</h2>
        <div class="grid c4">
          <div class="stat"><div class="n">${Store.overallPct()}%</div><div class="l">Progres total</div></div>
          <div class="stat"><div class="n">${st.quiz.length}</div><div class="l">Kuis dikerjakan</div></div>
          <div class="stat"><div class="n">${flashSeen}</div><div class="l">Flashcard direview</div></div>
          <div class="stat"><div class="n">${st.bookmarks.length}</div><div class="l">Bookmark</div></div>
        </div>
      </div>
      <div class="card"><h3>🔥 Heatmap Belajar (6 bulan) · Streak ${st.streak||0} hari</h3><div class="heat">${heat}</div></div>
      <div class="grid c2">
        <div class="card"><h3>Progres per Bab</h3>${CH.map(c=>`<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span data-view="chapter" data-ch="${c.ch}" style="cursor:pointer">${c.ch}. ${esc(c.title)}</span><b>${Store.chapterPct(c.ch)}%</b></div><div class="progressbar"><div style="width:${Store.chapterPct(c.ch)}%"></div></div></div>`).join('')}</div>
        <div class="card"><h3>Riwayat Kuis</h3><table style="width:100%;font-size:13px"><tr style="color:var(--muted);text-align:left"><th>Tanggal</th><th>Skor</th><th>%</th></tr>${quizRows}</table>
          <h3>Flashcard jatuh tempo</h3><p>${flashDue} kartu siap direview hari ini (spaced repetition).</p>
          <h3>Riwayat Pencarian</h3><div>${hist}</div>
        </div>
      </div>
      <div class="card"><button class="btn" id="expJson">Export data belajar (JSON)</button> <button class="btn" id="impJson">Import</button> <button class="btn" id="resetAll" style="color:#e5484d">Reset semua</button></div>
    </div>`;
    $('#expJson').onclick=()=>{ const b=new Blob([Store.export()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='gbh-progress.json'; a.click(); };
    $('#impJson').onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.onchange=e=>{const f=e.target.files[0];const rd=new FileReader();rd.onload=()=>{Store.import(rd.result)?toast('Data diimpor'):toast('Gagal impor');dashboard();};rd.readAsText(f);}; inp.click(); };
    $('#resetAll').onclick=()=>{ if(confirm('Hapus semua data belajar?')){Store.reset();toast('Direset');dashboard();} };
  }

  // ---------------- CHAPTER (Smart Summary) ----------------
  function chapter(ch){ const c=CH.find(x=>x.ch===ch); if(!c)return home();
    Store.markRead(ch,1); Store.pushRecent({type:'chapter',ch,page:1,label:'Bab '+ch+': '+c.title});
    setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Bab '+ch},{t:c.title}]);
    const terms=c.terms.map(t=>`<span class="tag" data-term="${esc(t)}">${esc(t)}</span>`).join('');
    const mind=`<div style="text-align:center;font-family:var(--mono);font-size:12px;line-height:1.9">
      <b>${esc(c.title)}</b><br>│<br>${c.takeaways.map(t=>'├─ '+esc(t.slice(0,60))).join('<br>')}</div>`;
    root().innerHTML=`<div class="view">
      <div class="card hero"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span class="pill">Bab ${ch}</span><span class="pill">${c.pages} halaman</span><span class="pill">${c.words} kata</span>
        <button class="btn sm" data-view="pdf" data-ch="${ch}" data-page="1" style="margin-left:auto">📖 Buka PDF</button>
        <button class="btn sm" data-bookmark data-ch="${ch}" data-page="1">☆ Bookmark</button></div>
        <h2 style="margin-top:10px">${esc(c.title)}</h2><p>${esc(c.summary)}</p></div>
      <div class="grid c2">
        <div class="card"><h3>✅ Key Takeaways</h3><ul class="clean">${c.takeaways.map(t=>'<li>'+esc(t)+'</li>').join('')}</ul></div>
        <div class="card"><h3>🧠 Mind Map</h3>${mind}</div>
      </div>
      ${c.formulas.length?`<div class="card"><h3>ƒ Rumus Penting</h3>${c.formulas.map(f=>'<div class="formula">'+esc(f)+'</div>').join('')}</div>`:''}
      <div class="card"><h3>🔑 Istilah Penting</h3>${terms||'<span style="color:var(--muted)">-</span>'}</div>
      <div class="card"><h3>☑ Checklist Belajar</h3>${c.checklist.map((t,i)=>`<label style="display:block;margin:6px 0"><input type="checkbox" data-check="${ch}-${i}"> ${esc(t)}</label>`).join('')}</div>
      <div class="card"><h3>❓ FAQ</h3>${c.faq.map(f=>`<details style="margin:8px 0"><summary style="cursor:pointer;font-weight:600">${esc(f[0])}</summary><p style="color:var(--muted)">${esc(f[1])}</p></details>`).join('')}</div>
      <div class="card"><h3>📄 Cross Reference — halaman yang membahas bab ini</h3>
        <div id="chXref" style="color:var(--muted)">Memuat…</div></div>
    </div>`;
    // checklist persistence
    root().querySelectorAll('[data-check]').forEach(cb=>{ const k='chk_'+cb.dataset.check; cb.checked=localStorage.getItem(k)==='1'; cb.onchange=()=>localStorage.setItem(k,cb.checked?'1':'0'); });
    // cross-ref: pages in this chapter (sample distributed)
    const pages=(window.GBH.searchIndex||[]).filter(x=>x.ch===ch).map(x=>x.page);
    const sample=pages.filter((_,i)=>i%Math.ceil(pages.length/12||1)===0).slice(0,12);
    $('#chXref').innerHTML = sample.map(p=>`<span class="chip" data-view="pdf" data-ch="${ch}" data-page="${p}">hal. ${p}</span>`).join('') || 'Halaman berbasis gambar.';
  }

  // ---------------- PDF VIEWER (image-based, mobile-friendly) ----------------
  const pageImg=(ch,p)=>`assets/pages/ch${String(ch).padStart(2,'0')}/${p}.jpg`;
  function pdfView(ch,page){ const c=CH.find(x=>x.ch===ch); if(!c)return home();
    let cur=Math.max(1,Math.min(c.pages,page||1)); let zoom=+(localStorage.getItem('pv_zoom')||100);
    Store.pushRecent({type:'pdf',ch,page:cur,label:`Bab ${ch} hal.${cur}`});
    root().innerHTML=`
      <div class="pdf-toolbar">
        <button class="btn sm" id="pv-prev">‹ Prev</button>
        <span>Hal.</span><input id="pv-page" type="number" value="${cur}" min="1" max="${c.pages}"><span id="pv-total">/ ${c.pages}</span>
        <button class="btn sm" id="pv-next">Next ›</button>
        <button class="btn sm" id="pv-go">Jump</button>
        <span class="pv-zoomwrap"><button class="btn sm" id="pv-zout">−</button><span id="pv-zoom">${zoom}%</span><button class="btn sm" id="pv-zin">+</button></span>
        <span class="pv-spacer"></span>
        <button class="btn sm" id="pv-bm">☆ Bookmark</button>
        <button class="btn sm" id="pv-note">📝 Catatan</button>
        <button class="btn sm" id="pv-open">↗ PDF asli</button>
      </div>
      <div class="pdf-stage" id="pv-stage"><img id="pv-img" class="pdf-page" alt=""></div>`;
    const img=$('#pv-img');
    img.onload=()=>{ img.style.opacity='1'; };
    img.onerror=()=>{ img.style.opacity='1'; $('#pv-stage').innerHTML='<div class="empty">Gambar halaman belum tersedia.<br><button class="btn sm" id="pv-open2">↗ Buka PDF asli</button></div>'; const o=$('#pv-open2'); if(o)o.onclick=()=>window.open(pdf(ch)+'#page='+cur,'_blank'); };
    const setZoom=z=>{ zoom=Math.max(50,Math.min(300,z)); localStorage.setItem('pv_zoom',zoom); img.style.width=zoom+'%'; $('#pv-zoom').textContent=zoom+'%'; };
    const draw=()=>{ cur=Math.max(1,Math.min(c.pages,cur));
      setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Bab '+ch,go:{view:'chapter',ch}},{t:'PDF hal. '+cur}]);
      $('#pv-page').value=cur; img.style.opacity='0.35'; img.src=pageImg(ch,cur); img.alt='Bab '+ch+' halaman '+cur;
      $('#pv-prev').disabled=cur<=1; $('#pv-next').disabled=cur>=c.pages;
      $('#pv-bm').innerHTML=(Store.isBookmarked(ch,cur)?'★':'☆')+' Bookmark';
      Store.markRead(ch,cur);
      [cur-1,cur+1,cur+2].forEach(n=>{ if(n>=1&&n<=c.pages){ const im=new Image(); im.src=pageImg(ch,n); } });
      $('#pv-stage').scrollTop=0; };
    const go=p=>{ cur=+p||1; draw(); };
    setZoom(zoom); draw();
    $('#pv-prev').onclick=()=>go(cur-1);
    $('#pv-next').onclick=()=>go(cur+1);
    $('#pv-go').onclick=()=>go($('#pv-page').value);
    $('#pv-page').onkeydown=e=>{ if(e.key==='Enter')go(e.target.value); };
    $('#pv-zin').onclick=()=>setZoom(zoom+15);
    $('#pv-zout').onclick=()=>setZoom(zoom-15);
    $('#pv-open').onclick=()=>window.open(pdf(ch)+'#page='+cur,'_blank');
    $('#pv-bm').onclick=()=>{ const on=Store.toggleBookmark({ch,page:cur,label:'Bab '+ch+' hal.'+cur}); $('#pv-bm').innerHTML=(on?'★':'☆')+' Bookmark'; toast(on?'Ditambahkan ke bookmark':'Bookmark dihapus'); };
    $('#pv-note').onclick=()=>{ const txt=prompt('Catatan untuk Bab '+ch+' hal.'+cur); if(txt){ Store.addNote({ch,page:cur,text:txt,tag:'PDF',color:'#f37021'}); toast('Catatan tersimpan'); } };
    const key=e=>{ if(!document.getElementById('pv-img')){ document.removeEventListener('keydown',key); return; } const tag=(e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea')return; if(e.key==='ArrowRight'||e.key==='PageDown'){ e.preventDefault(); go(cur+1); } else if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); go(cur-1); } };
    document.addEventListener('keydown',key);
    let sx=0,sy=0; const stage=$('#pv-stage');
    stage.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
    stage.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){ dx<0?go(cur+1):go(cur-1); } },{passive:true});
  }

  // ---------------- SEARCH RESULTS ----------------
  function search(q){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Pencarian'},{t:q}]);
    Store.logSearch(q);
    const res=window.Search.query(q,50);
    const gloss=G.filter(g=>[g.term,...(g.aka||[])].some(n=>n.toLowerCase().includes(q.toLowerCase())||q.toLowerCase().includes(n.toLowerCase()))).slice(0,4);
    root().innerHTML=`<div class="view">
      <div class="card"><h2>Hasil pencarian: “${esc(q)}”</h2>
        <div style="font-size:12px;color:var(--muted)">${res.length} halaman ditemukan · diperluas ke: ${window.Search.expand(q).slice(0,10).map(esc).join(', ')}</div></div>
      ${gloss.length?`<div class="card"><h3>🔑 Istilah terkait</h3>${gloss.map(g=>`<span class="chip" data-term="${esc(g.term)}">${esc(g.term)}</span>`).join('')}</div>`:''}
      ${res.length?res.map(r=>`<div class="result" data-view="pdf" data-ch="${r.ch}" data-page="${r.page}">
        <div class="meta"><span class="tag">Bab ${r.ch}</span><span>${esc(r.title)}</span><span>· hal. ${r.page}</span></div>
        <div class="snippet">${r.snippet}</div></div>`).join('')
        :'<div class="empty"><div class="big">🔍</div>Tidak ada hasil. Coba kata kunci lain atau tanya AI Tutor.</div>'}
    </div>`;
  }

  // ---------------- GLOSSARY + EXPLANATION MODES ----------------
  function glossary(filter){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Glosarium'}]);
    const list=G.slice().sort((a,b)=>a.term.localeCompare(b.term));
    root().innerHTML=`<div class="view"><div class="card"><h2>🔑 Glosarium (${list.length} istilah)</h2>
      <input id="glf" placeholder="Filter istilah…" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 12px;margin-top:8px"></div>
      <div id="glList"></div></div>`;
    const draw=f=>{ const items=list.filter(g=>!f||[g.term,...(g.aka||[])].join(' ').toLowerCase().includes(f.toLowerCase()));
      $('#glList').innerHTML=items.map(g=>`<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <h3 style="margin:0">${esc(g.term)}</h3><span class="pill">Bab ${g.ch}</span>
        <span style="font-size:11px;color:var(--muted)">${(g.aka||[]).map(esc).join(' · ')}</span>
        <button class="btn sm" data-fav="${esc(g.term)}" style="margin-left:auto">${Store.isFav(g.term)?'★':'☆'} Favorit</button></div>
        <p style="margin:8px 0">${esc(g.def)}</p>
        <div class="btnrow">${['Detailed','ELI5','Technical','Example','Analogy','Case Study','Comparison','Flow'].map(m=>`<button class="btn sm" data-explain="${esc(g.term)}" data-mode="${m}">${m}</button>`).join('')}</div>
        <div class="explain-out" id="ex-${esc(g.term).replace(/\W/g,'')}"></div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">Muncul di ${g.count} halaman: ${(g.xref||[]).slice(0,10).map(x=>`<span class="chip" data-view="pdf" data-ch="${x.ch}" data-page="${x.page}">B${x.ch}/${x.page}</span>`).join('')}</div>
      </div>`).join(''); };
    draw(filter||''); if(filter)$('#glf').value=filter;
    $('#glf').oninput=e=>draw(e.target.value);
  }

  function explain(term,mode){ const g=G.find(x=>x.term===term); if(!g)return; Store.openTerm(term);
    const box=$('#ex-'+term.replace(/\W/g,'')); if(!box)return;
    let html='';
    const ref=(g.xref||[]).slice(0,5).map(x=>`<span class="chip" data-view="pdf" data-ch="${x.ch}" data-page="${x.page}">B${x.ch}/hal.${x.page}</span>`).join('');
    switch(mode){
      case 'ELI5': html=`🧒 <b>Sederhana:</b> ${esc(g.mnemonic||g.def)}`; break;
      case 'Technical': html=`⚙ <b>Teknis:</b> ${esc(g.def)}${g.calc?'<div class="formula">'+esc(g.calc)+'</div>':''}`; break;
      case 'Example': html=`📌 <b>Contoh:</b> ${esc(g.example||'-')}`; break;
      case 'Analogy': html=`🌀 <b>Analogi:</b> ${esc(g.mnemonic||g.def)}`; break;
      case 'Case Study': html=`💼 <b>Studi kasus:</b> ${esc(g.example||g.def)} <br><i>Bagaimana ini muncul di operasional BRI? Lihat halaman terkait.</i>`; break;
      case 'Comparison': html=`⚖ <b>Terkait & pembanding:</b> ${(g.related||[]).map(r=>`<span class="chip" data-term="${esc(r)}">${esc(r)}</span>`).join('')||'-'}`; break;
      case 'Flow': html=`➡ <b>Alur/Hubungan:</b> ${g.term} → ${(g.related||[]).slice(0,4).join(' → ')||'-'}`; break;
      default: html=`<b>Definisi:</b> ${esc(g.def)}<br>${g.why?'<b>Mengapa penting:</b> '+esc(g.why)+'<br>':''}${g.calc?'<b>Cara hitung:</b> <span class="formula">'+esc(g.calc)+'</span>':''}${g.example?'<b>Contoh:</b> '+esc(g.example)+'<br>':''}${g.pitfall?'<b>Kesalahan umum:</b> '+esc(g.pitfall)+'<br>':''}${g.mnemonic?'💡 '+esc(g.mnemonic):''}`;
    }
    box.innerHTML=`<div class="card" style="background:var(--surface-2);margin:8px 0 0"><div>${html}</div><div style="margin-top:8px;font-size:12px;color:var(--muted)">📄 Referensi: ${ref||'-'}</div></div>`;
  }

  // ---------------- FLASHCARDS ----------------
  let flashState={list:[],i:0,mode:'basic'};
  function flash(mode){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Flashcard'}]);
    const all=window.GBH.flashcards||[]; mode=mode||'basic';
    let list = mode==='review'? Store.dueCards(all) : mode==='all'? all : all.filter(c=>c.level===mode);
    if(!list.length) list=all;
    flashState={list,i:0,mode};
    root().innerHTML=`<div class="view">
      <div class="card"><h2>🃏 Smart Flashcard</h2>
        <div class="btnrow">${['basic','intermediate','advanced','expert','review','all'].map(m=>`<button class="btn sm ${m===mode?'primary':''}" data-flash="${m}">${m}</button>`).join('')}
          <button class="btn sm" id="fl-shuffle">🔀 Acak</button></div>
        <div style="font-size:12px;color:var(--muted)">Mode <b>${mode}</b> · ${list.length} kartu · spaced repetition aktif</div>
      </div>
      <div class="flash" id="flCard"><div class="flash-inner">
        <div class="flash-face front"><div class="q" id="flFront"></div><div style="color:var(--muted);margin-top:10px;font-size:12px" id="flHint"></div></div>
        <div class="flash-face back"><div class="a" id="flBack"></div></div>
      </div></div>
      <div class="btnrow" style="justify-content:center">
        <button class="btn" id="fl-again">✗ Ulang</button>
        <button class="btn" id="fl-flip">↺ Balik</button>
        <button class="btn primary" id="fl-good">✓ Paham</button></div>
      <div style="text-align:center;color:var(--muted);font-size:12px" id="flPos"></div></div>`;
    drawFlash();
    const card=$('#flCard');
    card.onclick=()=>card.classList.toggle('flip');
    $('#fl-flip').onclick=e=>{e.stopPropagation();card.classList.toggle('flip');};
    $('#fl-good').onclick=e=>{e.stopPropagation();rate(true);};
    $('#fl-again').onclick=e=>{e.stopPropagation();rate(false);};
    $('#fl-shuffle').onclick=()=>{flashState.list.sort(()=>Math.random()-.5);flashState.i=0;drawFlash();};
  }
  function drawFlash(){ const {list,i}=flashState; if(!list.length)return; const c=list[i%list.length];
    $('#flFront').textContent=c.front; $('#flBack').textContent=c.back; $('#flHint').textContent=c.hint?('Petunjuk: '+c.hint):'';
    $('#flPos').textContent=`Kartu ${i%list.length+1} / ${list.length}`; $('#flCard').classList.remove('flip'); }
  function rate(good){ const {list,i}=flashState; const c=list[i%list.length]; if(c)Store.reviewCard(c.id,good);
    flashState.i++; drawFlash(); }

  // ---------------- QUIZ ----------------
  let quizState=null;
  function quiz(){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Kuis'}]);
    root().innerHTML=`<div class="view"><div class="card"><h2>📝 Quiz Generator</h2>
      <p style="color:var(--muted)">Soal dibuat dari materi (pilihan ganda & benar/salah), lengkap dengan pembahasan & referensi halaman.</p>
      <div>Jumlah soal: <div class="btnrow">${[10,20,50,100].map(n=>`<button class="btn sm" data-qn="${n}">${n} soal</button>`).join('')}</div></div>
      <div>Fokus bab: <select id="qch" style="height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);padding:0 8px"><option value="0">Semua bab</option>${CH.map(c=>`<option value="${c.ch}">Bab ${c.ch}. ${esc(c.title)}</option>`).join('')}</select></div>
      <div class="btnrow"><button class="btn primary" id="qstart">Mulai</button></div></div></div>`;
    let n=20; root().querySelectorAll('[data-qn]').forEach(b=>b.onclick=()=>{n=+b.dataset.qn;root().querySelectorAll('[data-qn]').forEach(x=>x.classList.remove('primary'));b.classList.add('primary');});
    $('#qstart').onclick=()=>startQuiz(n,+$('#qch').value);
  }
  function startQuiz(n,ch){ let bank=(window.GBH.quiz||[]).slice(); if(ch)bank=bank.filter(q=>q.ch===ch);
    bank.sort(()=>Math.random()-.5); if(n>bank.length){ /* repeat to reach count */ const base=bank.slice(); while(bank.length<n&&base.length)bank=bank.concat(base); }
    bank=bank.slice(0,n).map(q=>({...q,opts:q.options.map((o,i)=>({o,i})).sort(()=>Math.random()-.5)}));
    quizState={bank,i:0,answers:[],ch}; renderQ();
  }
  function renderQ(){ const {bank,i}=quizState; if(i>=bank.length)return finishQuiz();
    const q=bank[i]; setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Kuis'},{t:`Soal ${i+1}/${bank.length}`}]);
    root().innerHTML=`<div class="view"><div class="card">
      <div class="progressbar"><div style="width:${i/bank.length*100}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:12px;color:var(--muted)"><span>Bab ${q.ch} · ${q.type==='tf'?'Benar/Salah':'Pilihan ganda'}</span><span>Soal ${i+1} / ${bank.length}</span></div>
      <h3 style="color:var(--text)">${esc(q.q)}</h3>
      <div id="qopts">${q.opts.map(o=>`<button class="qopt" data-i="${o.i}">${esc(o.o)}</button>`).join('')}</div>
      <div id="qexpl"></div></div></div>`;
    root().querySelectorAll('.qopt').forEach(b=>b.onclick=()=>answer(+b.dataset.i));
  }
  function answer(choice){ const {bank,i}=quizState; const q=bank[i]; const correct=choice===q.answer;
    quizState.answers.push({ch:q.ch,correct});
    root().querySelectorAll('.qopt').forEach(b=>{ const bi=+b.dataset.i; b.disabled=true;
      if(bi===q.answer)b.classList.add('correct'); if(bi===choice&&!correct)b.classList.add('wrong'); });
    $('#qexpl').innerHTML=`<div class="card" style="background:var(--surface-2);margin-top:12px">
      <b>${correct?'✅ Benar!':'❌ Kurang tepat.'}</b> ${esc(q.expl)}
      <div style="margin-top:8px"><span class="chip" data-view="pdf" data-ch="${q.ch}" data-page="${q.page}">📄 Lihat Bab ${q.ch} hal.${q.page}</span></div>
      <div class="btnrow"><button class="btn primary" id="qnext">${i+1>=bank.length?'Selesai':'Lanjut ›'}</button></div></div>`;
    $('#qnext').onclick=()=>{ quizState.i++; renderQ(); };
  }
  function finishQuiz(){ const {bank,answers}=quizState; const correct=answers.filter(a=>a.correct).length;
    const wrongCh=[...new Set(answers.filter(a=>!a.correct).map(a=>a.ch))];
    Store.logQuiz(bank.length,correct,wrongCh);
    const pct=Math.round(correct/bank.length*100);
    setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Kuis'},{t:'Hasil'}]);
    root().innerHTML=`<div class="view"><div class="card hero" style="text-align:center">
      <div style="font-size:52px">${pct>=80?'🎉':pct>=60?'👍':'💪'}</div>
      <h2>Skor: ${correct}/${bank.length} (${pct}%)</h2>
      <p style="color:var(--muted)">${pct>=80?'Luar biasa, Anda siap!':pct>=60?'Bagus, tinggal poles bab yang lemah.':'Tetap semangat — ulangi bab yang salah.'}</p></div>
      <div class="card"><h3>Topik yang perlu diulang</h3>${wrongCh.length?wrongCh.map(c=>{const cc=CH.find(x=>x.ch===c);return `<div class="list-item" data-view="chapter" data-ch="${c}">⚠ Bab ${c}. ${esc(cc?cc.title:'')}</div>`;}).join(''):'<div class="empty">Semua benar! 🌟</div>'}
        <div class="btnrow"><button class="btn primary" data-view="quiz">Kuis lagi</button><button class="btn" data-view="flash">Review flashcard</button></div></div></div>`;
  }

  // ---------------- NOTES ----------------
  function notes(){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Catatan'}]);
    const list=Store.s.notes;
    root().innerHTML=`<div class="view"><div class="card"><h2>📝 Smart Notes</h2>
      <textarea id="newNote" placeholder="Tulis catatan baru…" style="width:100%;min-height:60px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:10px"></textarea>
      <div class="btnrow"><input id="noteTag" placeholder="Tag/kategori (mis. NPL)" style="height:34px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 10px">
      <button class="btn primary" id="addNote">Simpan</button>
      <button class="btn" id="expNotes">Export .md</button></div></div>
      <div id="noteList">${list.length?list.map(n=>noteCard(n)).join(''):'<div class="empty">Belum ada catatan.</div>'}</div></div>`;
    $('#addNote').onclick=()=>{ const t=$('#newNote').value.trim(); if(!t)return; Store.addNote({text:t,tag:$('#noteTag').value||'Umum',color:'#00529b',ch:0,page:0}); notes(); };
    $('#expNotes').onclick=()=>{ const md=Store.s.notes.map(n=>`## ${n.tag} ${n.ch?`(Bab ${n.ch} hal.${n.page})`:''}\n${n.text}\n`).join('\n'); const b=new Blob([md],{type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='catatan-general-banking.md'; a.click(); };
    root().querySelectorAll('[data-delnote]').forEach(b=>b.onclick=()=>{Store.delNote(b.dataset.delnote);notes();});
    root().querySelectorAll('[data-editnote]').forEach(t=>t.onblur=()=>Store.updateNote(t.dataset.editnote,{text:t.value}));
  }
  function noteCard(n){ return `<div class="note" style="border-left-color:${n.color||'#f37021'}">
    <textarea data-editnote="${n.id}">${esc(n.text)}</textarea>
    <div class="nmeta"><span class="tag">${esc(n.tag||'Umum')}</span>${n.ch?`<span class="chip" data-view="pdf" data-ch="${n.ch}" data-page="${n.page}">Bab ${n.ch}/hal.${n.page}</span>`:''}<span>${new Date(n.ts).toLocaleString('id')}</span><button class="btn sm" data-delnote="${n.id}" style="margin-left:auto;color:#e5484d">Hapus</button></div></div>`; }

  // ---------------- GRAPH ----------------
  function graph(){ setCrumb([{t:'Beranda',go:{view:'home'}},{t:'Concept Graph'}]);
    root().innerHTML=`<div class="view" style="max-width:1200px">
      <div class="card"><h2>🕸 Concept Graph & Relationship Map</h2>
      <p style="color:var(--muted)">Seret node, scroll untuk zoom, klik node untuk membuka istilah. Warna = bab.</p>
      <div style="margin:8px 0"><b>Relationship Map likuiditas→profitabilitas:</b> ${(window.Graph.data.path||[]).map(p=>`<span class="chip" data-term="${esc(p)}">${esc(p)}</span>`).join(' → ')}</div>
      </div>
      <div class="card" style="padding:6px"><div id="graphHost" style="height:calc(100vh - 320px);min-height:380px"></div></div></div>`;
    window.Graph.render($('#graphHost'),term=>{ const g=G.find(x=>x.term===term); if(g){ location.hash='glossary'; setTimeout(()=>{glossary(term);},30);} });
  }

  // ---------------- SETTINGS ----------------
  function settings(){ const st=Store.s.settings;
    root().innerHTML=`<div class="view"><div class="card"><h2>⚙ Pengaturan AI Tutor</h2>
      <p style="color:var(--muted)">Mode <b>offline</b> aktif tanpa konfigurasi (jawaban ekstraktif dari materi). Untuk jawaban generatif penuh (RAG), isi endpoint & API key OpenAI-compatible. Data disimpan hanya di browser ini.</p>
      <label>Nama panggilan<br><input id="set-name" value="${esc(st.name||'Barney')}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 10px"></label>
      <label>API Base URL (mis. https://api.openai.com/v1)<br><input id="set-url" value="${esc(st.apiUrl)}" placeholder="kosongkan untuk mode offline" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 10px"></label>
      <label>API Key<br><input id="set-key" type="password" value="${esc(st.apiKey)}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 10px"></label>
      <label>Model<br><input id="set-model" value="${esc(st.model)}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 10px"></label>
      <div class="btnrow"><button class="btn primary" id="set-save">Simpan</button></div></div></div>`;
    $('#set-save').onclick=()=>{ Object.assign(Store.s.settings,{name:$('#set-name').value,apiUrl:$('#set-url').value.trim(),apiKey:$('#set-key').value.trim(),model:$('#set-model').value.trim()||'gpt-4o-mini'}); Store.save(); toast('Pengaturan disimpan'); };
  }

  window.Views={home,dashboard,chapter,pdfView,search,glossary,explain,flash,quiz,notes,graph,settings,toast};
})();
