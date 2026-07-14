/* graph.js - interactive Concept Graph (dependency-free force-directed canvas)
   + linear Relationship Map. Clicking a node opens the related term/chapter. */
(function(){
  const G=window.GBH.graph||{nodes:[],edges:[],path:[]};
  function palette(ch){ const h=(ch*37)%360; return `hsl(${h},62%,52%)`; }

  function render(container,onNode){
    container.innerHTML='<canvas id="graphCanvas"></canvas>';
    const cv=container.querySelector('#graphCanvas');
    const ctx=cv.getContext('2d');
    function resize(){ const r=container.getBoundingClientRect(); cv.width=r.width*devicePixelRatio; cv.height=(cv.clientHeight||480)*devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
    const W=()=>cv.clientWidth, H=()=>cv.clientHeight;

    const nodes=G.nodes.map((n,i)=>({...n,x:Math.random(),y:Math.random(),vx:0,vy:0,idx:i}));
    const byId={}; nodes.forEach(n=>byId[n.id]=n);
    const edges=G.edges.filter(e=>byId[e.from]&&byId[e.to]);
    let cam={x:0,y:0,z:1}; let hover=null, dragNode=null, panning=false, last={x:0,y:0};

    resize();
    // init positions spread in circle
    nodes.forEach((n,i)=>{ const a=i/nodes.length*Math.PI*2; n.x=W()/2+Math.cos(a)*Math.min(W(),H())*0.32; n.y=H()/2+Math.sin(a)*Math.min(W(),H())*0.32; });

    function step(){
      const k=90; // ideal edge length
      for(let i=0;i<nodes.length;i++){ const a=nodes[i];
        for(let j=i+1;j<nodes.length;j++){ const b=nodes[j]; let dx=a.x-b.x,dy=a.y-b.y; let d=Math.hypot(dx,dy)||0.01;
          const rep=1600/(d*d); const fx=dx/d*rep, fy=dy/d*rep; a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy; } }
      edges.forEach(e=>{ const a=byId[e.from],b=byId[e.to]; let dx=b.x-a.x,dy=b.y-a.y; let d=Math.hypot(dx,dy)||0.01;
        const f=(d-k)*0.02; const fx=dx/d*f,fy=dy/d*f; a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy; });
      nodes.forEach(n=>{ if(n===dragNode)return; n.vx+=(W()/2-n.x)*0.0008; n.vy+=(H()/2-n.y)*0.0008;
        n.x+=n.vx*=0.86; n.y+=n.vy*=0.86; });
    }
    function toScreen(n){ return {x:(n.x-W()/2)*cam.z+W()/2+cam.x,y:(n.y-H()/2)*cam.z+H()/2+cam.y}; }
    function draw(){
      ctx.clearRect(0,0,W(),H());
      const cs=getComputedStyle(document.body);
      ctx.strokeStyle=cs.getPropertyValue('--border'); ctx.lineWidth=1;
      edges.forEach(e=>{ const a=toScreen(byId[e.from]),b=toScreen(byId[e.to]);
        ctx.globalAlpha=(hover&&(e.from===hover.id||e.to===hover.id))?0.9:0.35;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); });
      ctx.globalAlpha=1;
      nodes.forEach(n=>{ const p=toScreen(n); const r=(hover===n?11:8)*cam.z;
        ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=palette(n.ch);ctx.fill();
        ctx.fillStyle=cs.getPropertyValue('--text'); ctx.font=`${Math.max(10,11*cam.z)}px Inter,sans-serif`;
        ctx.textAlign='center'; ctx.fillText(n.id,p.x,p.y-r-4); });
    }
    let frames=0; function loop(){ if(frames<260){step();frames++;} draw(); requestAnimationFrame(loop); }
    loop();

    function pick(mx,my){ let best=null,bd=18; nodes.forEach(n=>{const p=toScreen(n);const d=Math.hypot(p.x-mx,p.y-my); if(d<bd){bd=d;best=n;}}); return best; }
    cv.addEventListener('mousemove',e=>{ const r=cv.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top;
      if(dragNode){ dragNode.x=(mx-W()/2-cam.x)/cam.z+W()/2; dragNode.y=(my-H()/2-cam.y)/cam.z+H()/2; frames=0; }
      else if(panning){ cam.x+=mx-last.x; cam.y+=my-last.y; last={x:mx,y:my}; }
      else { hover=pick(mx,my); cv.style.cursor=hover?'pointer':'grab'; } });
    cv.addEventListener('mousedown',e=>{ const r=cv.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top;
      const n=pick(mx,my); if(n){dragNode=n;} else {panning=true; last={x:mx,y:my};} });
    window.addEventListener('mouseup',()=>{ dragNode=null; panning=false; });
    cv.addEventListener('click',e=>{ const r=cv.getBoundingClientRect(); const n=pick(e.clientX-r.left,e.clientY-r.top); if(n&&onNode)onNode(n.id); });
    cv.addEventListener('wheel',e=>{ e.preventDefault(); cam.z=Math.min(2.5,Math.max(0.4,cam.z*(e.deltaY<0?1.1:0.9))); },{passive:false});
    window.addEventListener('resize',()=>{resize();});
  }

  window.Graph={render, data:G};
})();
