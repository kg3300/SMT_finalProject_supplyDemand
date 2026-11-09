(function () {
  'use strict';
  const mount = document.getElementById('model-mount');
  mount.innerHTML = `<div class="model-heading"><h1>A NEIGHBORHOOD OF POSSIBILITIES</h1><p>25 fictional blocks / 500 original lots<br>Spatial capacity, not a development forecast.</p></div>
    <div class="model-toolbar"><button id="geometry-baseline" aria-pressed="false">View baseline</button><button id="rotate-left" aria-label="Rotate left">↶</button><button id="rotate-right" aria-label="Rotate right">↷</button><button id="zoom-in" aria-label="Zoom in">＋</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="reset-view">Reset view</button></div>
    <canvas id="neighborhood-canvas" tabindex="0" aria-label="Fictional neighborhood. Drag or use left and right arrow keys to rotate. Scroll or use plus and minus to zoom."></canvas>
    <div class="model-inspector" hidden></div><div class="model-stats" aria-label="Spatial results"></div>
    <p class="model-caption">Drag to rotate · Scroll to zoom · Click a building<br><span id="geometry-status">Scenario / baseline spatial rules</span><br>Geometry updates immediately; the year slider controls the separate economic demo only.</p>
    <details class="model-notes"><summary>Spatial model / assumptions</summary><div class="notes-body"><p>All geometry is synthetic: 5 × 5 blocks, each 100 × 80 m, with twenty 10 × 40 m lots. Streets are 20 m wide; each floor is 3 m tall. This is not a real NYC neighborhood or a zoning-compliance model.</p><p>Baseline: 12-floor height limit, 70% lot coverage, unmerged lots, maximum FAR 8. Coverage sets the footprint. Floors = floor(min(height limit, FAR / coverage fraction) × build-out factor), with a minimum of one floor.</p><p>Each original lot has a fixed illustrative factor of 0.45–0.95. Merged lots average their factors. Merging joins adjacent lots within a block row; any remainder stays as a smaller parcel. Land area is conserved.</p><p>Spatial policies combine simultaneously, not in chain order. Removing a policy restores its baseline parameter. Realized FAR is gross floor area divided by parcel land area, excluding streets. Uncovered land is not necessarily public space.</p><p>Interest, affordability, density bonus and subsidy retain Jae's illustrative economic equations. They do not yet alter geometry. Geometry does not yet feed housing-unit or financial outputs. No construction timing, displacement, rents or validated forecasts are modeled.</p></div></details>`;
  document.querySelector('.manual p').textContent = 'Explore policy with two deliberately separate prototypes: Jae’s illustrative economic demo and a fictional neighborhood geometry model. Drag a tile by its arrow, or click the arrow to add or remove it. Height, coverage, lot merging and FAR update the buildings immediately. The year slider runs the economic demo only. The base condition stays fixed. Open Spatial model / assumptions for the geometry rules and limitations.';
  document.querySelector('.credits-content p:nth-of-type(3)').textContent = 'Interface by Jae; spatial adapter added for Krishna’s review fork. All displayed geometry and economic results are synthetic demonstrations. No observed dataset, real NYC zoning, or Rhino/Grasshopper model is connected.';
  document.querySelector('.demo-note').textContent = 'Economic demo only · not coupled to geometry · not a validated forecast';
  const canvas = document.getElementById('neighborhood-canvas'), ctx = canvas.getContext('2d');
  const inspector = mount.querySelector('.model-inspector');
  let policies = {}, baseline = false, angle = -.65, zoom = 1, hits = [], selected = null;
  const baseMetrics = SpatialModel.measure(SpatialModel.build());
  function draw() {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = box.width, H = box.height, scale = Math.max(.02, Math.min(W / 850, H / 440)) * zoom;
    const co = Math.cos(angle), si = Math.sin(angle);
    const project = (x, y, z = 0) => { x -= 290; y -= 240; return [W / 2 + (x * co - y * si) * scale, H * .57 + (x * si + y * co) * .48 * scale - z * scale]; };
    hits = [];
    function poly(vertices, color, b) {
      const points = vertices.map(v => project(...v));
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = b?.id === selected ? '#35495c' : '#68758255'; ctx.lineWidth = b?.id === selected ? 1.6 : .45; ctx.stroke();
      if (b) hits.push({ points, b });
    }
    poly([[-16,-16],[596,-16],[596,496],[-16,496]], '#c5cbd1');
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) poly([[x*120-3,y*100-3],[x*120+103,y*100-3],[x*120+103,y*100+83],[x*120-3,y*100+83]], '#e6e9ec');
    const bs = SpatialModel.build(baseline ? {} : policies);
    bs.sort((a,b) => ((a.x+a.w/2)*si+(a.y+a.d/2)*co)-((b.x+b.w/2)*si+(b.y+b.d/2)*co));
    for (const b of bs) {
      const {x,y,w,d,h} = b;
      const faces = [ [[x,y,0],[x+w,y,0],[x+w,y,h],[x,y,h]], [[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]], [[x+w,y+d,0],[x,y+d,0],[x,y+d,h],[x+w,y+d,h]], [[x,y+d,0],[x,y,0],[x,y,h],[x,y+d,h]] ];
      // Visible Y face is determined by cos(angle), X face by sin(angle).
      // Swapping these tests renders back faces and makes the boxes look broken.
      poly(co < 0 ? faces[0] : faces[2], '#8d99a5', b);
      poly(si > 0 ? faces[1] : faces[3], '#b1bbc4', b);
      poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]], '#edf0f3', b);
    }
    const m = SpatialModel.measure(bs), fmt = n => n.toLocaleString(undefined,{maximumFractionDigits:1});
    const delta = (n,b,u='') => Math.abs(n-b)<.01 ? 'Same as baseline' : `${n>b?'+':''}${fmt(n-b)}${u} vs baseline`;
    mount.querySelector('.model-stats').innerHTML = [ [m.parcels,'BUILDING PARCELS',delta(m.parcels,baseMetrics.parcels)], [m.far.toFixed(2),'REALIZED GROSS FAR',delta(m.far,baseMetrics.far,'×')], [fmt(Math.round(m.area)),'GROSS FLOOR AREA / M²',delta(m.area,baseMetrics.area)], [fmt(m.open)+'%','UNCOVERED LOT AREA',delta(m.open,baseMetrics.open,' pp')] ].map(([v,l,d])=>`<div class="model-stat"><strong>${v}</strong><span>${l}</span><small>${d}</small></div>`).join('');
    document.getElementById('geometry-status').textContent = baseline ? 'BASELINE / spatial policies excluded' : `SCENARIO / ${Object.keys(policies).filter(k=>k in SpatialModel.baseline).length} active spatial rules`;
    const picked = bs.find(b=>b.id===selected); inspector.hidden = !picked;
    if (picked) inspector.innerHTML = `<b>PARCEL ${picked.id}</b><br>${picked.count} original lot(s)<br>${picked.floors} floors / ${picked.h} m<br>${fmt(picked.land)} m² land<br>${fmt(picked.footprint)} m² footprint`;
  }
  document.addEventListener('simulation:update', e => { policies = e.detail.policies; draw(); });
  document.getElementById('geometry-baseline').onclick = e => { baseline = !baseline; e.currentTarget.setAttribute('aria-pressed',String(baseline)); e.currentTarget.textContent = baseline ? 'View scenario' : 'View baseline'; draw(); };
  const rotate = d => { angle += d; draw(); }, magnify = d => { zoom = Math.max(.5,Math.min(2.5,zoom*d)); draw(); };
  document.getElementById('rotate-left').onclick = ()=>rotate(-.25); document.getElementById('rotate-right').onclick = ()=>rotate(.25);
  document.getElementById('zoom-in').onclick = ()=>magnify(1.15); document.getElementById('zoom-out').onclick = ()=>magnify(1/1.15);
  document.getElementById('reset-view').onclick = ()=>{angle=-.65;zoom=1;selected=null;draw();};
  let drag = null;
  canvas.onpointerdown = e => { if(e.button!==0)return; drag={x:e.clientX,y:e.clientY,last:e.clientX,moved:false}; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = e => { if(!drag)return; drag.moved ||= Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5; angle+=(e.clientX-drag.last)*.008;drag.last=e.clientX;draw(); };
  const inside = (p,vs) => { let yes=false;for(let i=0,j=vs.length-1;i<vs.length;j=i++){const a=vs[i],b=vs[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes; };
  canvas.onpointerup = e => { if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(); selected=[...hits].reverse().find(f=>inside([e.clientX-r.left,e.clientY-r.top],f.points))?.b.id??null;draw();}drag=null; };
  canvas.onpointercancel = canvas.onlostpointercapture = ()=>{drag=null;};
  canvas.addEventListener('wheel',e=>{e.preventDefault();magnify(Math.exp(-e.deltaY*.001));},{passive:false});
  canvas.onkeydown = e => { if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();if(e.key.startsWith('Arrow'))rotate(e.key==='ArrowLeft'?-.15:.15);else magnify(e.key==='+'?1.1:1/1.1);} };
  new ResizeObserver(draw).observe(canvas); draw();
})();
