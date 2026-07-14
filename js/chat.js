/* chat.js - AI Tutor with Retrieval-Augmented Generation.
   Works OFFLINE by default (extractive answers from PDF chunks + glossary),
   and becomes fully generative if an OpenAI-compatible API is configured
   in Settings. Every answer shows sources (PDF page vs external reference)
   and never fabricates: if nothing is found it says so honestly. */
(function(){
  const glossary=window.GBH.glossary||[];
  const chapters=window.GBH.chapters||[];
  // Curated credible external references (shown as "external", clearly labelled)
  const EXT={
    'ojk':{name:'OJK - Otoritas Jasa Keuangan',url:'https://www.ojk.go.id'},
    'bi':{name:'Bank Indonesia',url:'https://www.bi.go.id'},
    'lps':{name:'LPS - Lembaga Penjamin Simpanan',url:'https://www.lps.go.id'},
    'bri':{name:'Bank BRI',url:'https://bri.co.id'},
    'basel':{name:'Basel Committee (BIS)',url:'https://www.bis.org/bcbs'},
    'ifrs':{name:'IFRS Foundation',url:'https://www.ifrs.org'}
  };

  function findTerm(q){ const qn=q.toLowerCase();
    let best=null,score=0;
    glossary.forEach(g=>{ const names=[g.term,...(g.aka||[])];
      names.forEach(n=>{ const nl=n.toLowerCase(); let s=0;
        if(qn===nl)s=100; else if(qn.includes(nl))s=nl.length; else if(nl.includes(qn)&&qn.length>3)s=qn.length*0.5;
        if(s>score){score=s;best=g;} }); });
    return score>=3?best:null; }

  function detectExternal(q){ const qn=q.toLowerCase(); const hits=[];
    Object.entries(EXT).forEach(([k,v])=>{ if(qn.includes(k)||qn.includes(v.name.toLowerCase().split(' ')[0])) hits.push(v); });
    return hits; }

  // Build an extractive (offline) answer
  function offlineAnswer(q){
    const passages=window.Search.retrieve(q,5);
    const term=findTerm(q);
    const qn=q.toLowerCase();
    let parts=[]; let sources=[]; let external=[];

    // Intent: ELI5 / analogy / compare
    const eli5=/(umur 10|anak|sederhana|eli5|gampang)/.test(qn);
    const analogy=/(analogi|ibarat|seperti apa)/.test(qn);
    const compare=/(bandingkan|beda|perbedaan|vs|versus|dibanding)/.test(qn);

    if(term){
      if(eli5){ parts.push(`🧒 **${term.term} (versi sederhana):** ${term.mnemonic||term.def}`); }
      else if(analogy){ parts.push(`🌀 **Analogi ${term.term}:** ${term.mnemonic||term.def}`); }
      else {
        parts.push(`**${term.term}** — ${term.def}`);
        if(term.why) parts.push(`• *Mengapa penting:* ${term.why}`);
        if(term.calc) parts.push(`• *Cara menghitung:* ${term.calc}`);
        if(term.example) parts.push(`• *Contoh:* ${term.example}`);
        if(term.pitfall) parts.push(`• *Kesalahan umum:* ${term.pitfall}`);
        if(term.related&&term.related.length) parts.push(`• *Terkait:* ${term.related.join(', ')}`);
        if(term.mnemonic) parts.push(`💡 *Tips ingat:* ${term.mnemonic}`);
      }
      (term.xref||[]).slice(0,6).forEach(x=>sources.push({ch:x.ch,page:x.page}));
    }
    if(compare){ // pull two terms
      const matched=glossary.filter(g=>qn.includes(g.term.toLowerCase())||
        (g.aka||[]).some(a=>qn.includes(a.toLowerCase()))).slice(0,2);
      if(matched.length===2){ parts=[`**Perbandingan ${matched[0].term} vs ${matched[1].term}:**`];
        matched.forEach(m=>{ parts.push(`• **${m.term}:** ${m.def}`); (m.xref||[]).slice(0,3).forEach(x=>sources.push({ch:x.ch,page:x.page})); }); }
    }

    // Add best PDF passages as evidence
    if(passages.length){
      const top=passages.slice(0,3);
      if(!parts.length){ parts.push('Berdasarkan materi, berikut kutipan paling relevan:'); }
      top.forEach(p=>{ sources.push({ch:p.ch,page:p.page}); });
      if(!term){ parts.push('\n“'+ (passages[0].text.slice(0,340)) +'…”'); }
    }

    // external references if user explicitly asked or nothing found in PDF
    external=detectExternal(q);
    if(!passages.length && !term){
      return {text:'Maaf, saya tidak menemukan informasi ini di dalam materi General Banking yang tersedia. '+
        'Coba gunakan kata kunci lain, atau aktifkan mode AI penuh di ⚙ Settings untuk jawaban yang lebih luas dari sumber resmi.',
        sources:[],external:[]};
    }
    // dedupe sources
    const seen=new Set(); sources=sources.filter(s=>{const k=s.ch+'-'+s.page; if(seen.has(k))return false; seen.add(k);return true;}).slice(0,8);
    return {text:parts.join('\n'),sources,external};
  }

  // Build context for LLM
  function buildContext(q){ const passages=window.Search.retrieve(q,6);
    const ctx=passages.map(p=>`[Bab ${p.ch} · hal.${p.page} · ${p.title}]\n${p.text}`).join('\n\n');
    return {ctx,passages}; }

  async function llmAnswer(q,history){
    const st=window.Store.s.settings; const {ctx,passages}=buildContext(q);
    const sys=`Anda adalah AI Tutor untuk materi General Banking Certification (BFLP BRI).
Jawab dalam Bahasa Indonesia. WAJIB mengutamakan KONTEKS materi di bawah.
Tandai jelas bagian jawaban yang berasal dari materi PDF vs referensi eksternal resmi (OJK, BI, LPS, BRI, POJK, SEOJK, Basel, IFRS).
Jangan mengarang. Jika tidak ada di materi maupun sumber terpercaya, katakan jujur bahwa informasi tidak ditemukan.
Selalu sebutkan nomor Bab & halaman yang dipakai.

=== KONTEKS MATERI ===
${ctx}`;
    const msgs=[{role:'system',content:sys}];
    (history||[]).slice(-6).forEach(m=>msgs.push({role:m.role==='user'?'user':'assistant',content:m.text}));
    msgs.push({role:'user',content:q});
    const base=(st.apiUrl||'https://api.openai.com/v1').replace(/\/$/,'');
    const res=await fetch(base+'/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+st.apiKey},
      body:JSON.stringify({model:st.model||'gpt-4o-mini',messages:msgs,temperature:0.2})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const j=await res.json(); const text=j.choices?.[0]?.message?.content||'(kosong)';
    return {text,sources:passages.map(p=>({ch:p.ch,page:p.page})).slice(0,8),external:[]};
  }

  const Chat={
    async ask(q,history){ const st=window.Store.s.settings;
      if(st.apiKey && st.apiUrl!==''){ try{ return await llmAnswer(q,history);}catch(e){
        const off=offlineAnswer(q); off.text='⚠ Mode AI penuh gagal ('+e.message+'), memakai mode offline.\n\n'+off.text; return off; } }
      return offlineAnswer(q); },
    findTerm, EXT
  };
  window.Chat=Chat;
})();
