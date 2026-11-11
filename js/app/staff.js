// Dizek çizimi: parçanın notası (gitar anahtarı, donanım, ölçü rakamı), üstte akorlar, altta tab. Sekizlik ve on altılıklar
// vuruş gruplarında kirişlenir. Satırlar kabın genişliğine göre bölünür. Her nota bir <g class="pn" data-i> öğesidir;
// çalarken imleç, doğru/yanlış işaretleri bu öğelere sınıf olarak verilir.
const Staff = (() => {
  const SP = 8;                                   // çizgi aralığı (px)
  const SYS_H = 172, STAFF_Y = 46, TAB_Y = STAFF_Y + 32 + 38, TAB_SP = 9;
  const ACC = { "1":"♯", "-1":"♭" };
  // Vuruş grupları (dörtlük): kiriş bu sınırları geçmez
  function beatGroups(num, den){
    const G = { "6/8":[1.5,1.5], "3/8":[1.5], "9/8":[1,1,1,1.5], "7/8":[1.5,1,1], "5/8":[1,1.5], "8/8":[1.5,1.5,1], "12/8":[1.5,1.5,1.5,1.5] };
    return G[num + "/" + den] || Array(Math.max(1, Math.round(num*4/den))).fill(1);
  }
  const noteW = n => 16 + 13*Math.sqrt(n.dur) + (n.showAcc ? 9 : 0);
  function naturalPath(x, y){ return `M${x-2.5} ${y-9}v13M${x+2.5} ${y-5}v13M${x-2.5} ${y-1}l5 -2M${x-2.5} ${y+4}l5 -2`; }
  function restShape(g, x, sy, dur){
    const d = dur >= 3 ? (dur === 3 ? 2 : 4) : dur;
    if(d === 4) g.appendChild(svgEl("rect", { class:"rest", x: x-5, y: sy(6), width:10, height:4.5 }));
    else if(d === 2 || d === 3) g.appendChild(svgEl("rect", { class:"rest", x: x-5, y: sy(4) - 4.5, width:10, height:4.5 }));
    else if(d >= 1) g.appendChild(svgEl("path", { class:"restp", d:`M${x-2} ${sy(7)}l4 5-4 4 4 5c-3-1-5 0-3 4` }));
    else{
      const y = sy(5);
      g.appendChild(svgEl("path", { class:"restp", d:`M${x+3} ${y}l-5 14` }));
      g.appendChild(svgEl("circle", { class:"rest", cx: x-1, cy: y+1, r:2 }));
      if(d <= 0.25 || dur === 0.375) g.appendChild(svgEl("circle", { class:"rest", cx: x-3, cy: y+7, r:2 }));
    }
    if(dur === 1.5 || dur === 3 || dur === 0.75) g.appendChild(svgEl("circle", { class:"rest", cx: x+7, cy: sy(5), r:1.6 }));
  }

  // p: parsePiece sonucu, o: { key, width, onNote(i), tab: true }
  function draw(box, p, o = {}){
    const key = o.key || "C", kAcc = keyAccidentals(key), nKey = Math.abs(KEY_SIG[key] || 0);
    const width = Math.max(240, o.width || box.clientWidth || 640);
    // Değiştiriciler: ölçü içinde aynı harf ve oktavda bir kez yazılan sonraki notalara da geçer
    let state = {};
    p.notes.forEach((n, i) => {
      if(i === 0 || n.bar !== p.notes[i-1].bar) state = {};
      if(n.w === null){ n.showAcc = null; return; }
      const k = n.sp.l + ":" + n.sp.step, cur = k in state ? state[k] : kAcc[n.sp.l];
      n.showAcc = n.sp.a !== cur ? String(n.sp.a) : null; state[k] = n.sp.a;
    });
    // Satırlara böl
    const head = first => 38 + nKey*8 + (first ? 24 : 0);
    const barW = p.bars.map((b, bi) => 12 + p.notes.filter(n => n.bar === bi).reduce((s, n) => s + noteW(n), 0));
    const systems = [];
    let cur = [], used = head(true);
    barW.forEach((w, bi) => {
      if(cur.length && used + w > width - 6){ systems.push(cur); cur = []; used = head(false); }
      cur.push(bi); used += w;
    });
    if(cur.length) systems.push(cur);
    const H = systems.length*SYS_H + 8;
    const svg = svgEl("svg", { class:"score", viewBox:`0 0 ${width} ${H}`, width, height:H, role:"img" });
    const noteEls = [], noteX = [], plan = planFingering(p.notes.filter(n => n.w !== null).map(n => n.w));
    let pi = 0;
    const planOf = p.notes.map(n => n.w === null ? null : plan[pi++]);
    const groups = beatGroups(p.num, p.den);
    systems.forEach((bars, si) => {
      const y0 = si*SYS_H, top = y0 + STAFF_Y, bot = top + 4*SP, sy = s => bot - s*SP/2, ty = s => y0 + TAB_Y + (s-1)*TAB_SP;
      const natural = bars.reduce((s, bi) => s + barW[bi], 0), x0 = head(si === 0), stretch = bars === systems[systems.length-1] && natural < (width - x0)*0.7 ? 1 : (width - 6 - x0)/natural;
      for(let l = 0; l < 5; l++) svg.appendChild(svgEl("line", { class:"sl", x1:4, x2: width - 4, y1: top + l*SP, y2: top + l*SP }));
      for(let s = 1; s <= 6; s++) svg.appendChild(svgEl("line", { class:"tl", x1:4, x2: width - 4, y1: ty(s), y2: ty(s) }));
      svg.appendChild(svgEl("text", { class:"clef", x:6, y: sy(-1.6) }, "𝄞"));
      svg.appendChild(svgEl("text", { class:"c8", x:16, y: sy(-6.5) }, "8"));
      svg.appendChild(svgEl("text", { class:"tabl", x:7, y: ty(3.5) + 4 }, "TAB"));
      const sharps = [8,5,9,6,3,7,4], flats = [4,7,3,6,2,5,1];           // donanım: Fa5 Do5 Sol5 … / Si4 Mi5 La4 …
      for(let i = 0; i < nKey; i++){
        const st = (KEY_SIG[key] > 0 ? sharps : flats)[i];
        svg.appendChild(svgEl("text", { class:"acc", x: 36 + i*8, y: sy(st) + 5 }, KEY_SIG[key] > 0 ? "♯" : "♭"));
      }
      if(si === 0){
        const tx = 46 + nKey*8;
        svg.appendChild(svgEl("text", { class:"tsig", x: tx, y: sy(6) + 6 }, String(p.num)));
        svg.appendChild(svgEl("text", { class:"tsig", x: tx, y: sy(2) + 6 }, String(p.den)));
      }
      let x = x0;
      for(const bi of bars){
        const bar = p.bars[bi], ns = p.notes.filter(n => n.bar === bi);
        let nx = x + 10*stretch;
        const pos = ns.map(n => { const c = nx + 6; nx += noteW(n)*stretch; return c; });
        // Akorlar: akorun yazıldığı vuruştaki (ya da sonraki) notanın üstünde
        for(const c of p.chords.filter(c => c.beat >= bar.start - 1e-9 && c.beat < bar.start + Math.max(bar.len, 1e-6) - 1e-9)){
          const j = ns.findIndex(n => n.beat >= c.beat - 1e-9), cx = j < 0 ? x + 8 : pos[j] - 4;
          svg.appendChild(svgEl("text", { class:"chs", x: cx, y: y0 + 18 }, c.sym));
        }
        // Kirişler: vuruş grubundaki ardışık kısa notalar
        const beams = [];
        let run = [];
        const off = bi === 0 && !bar.full ? p.barBeats - bar.len : 0;      // ön vuruş ölçünün sonuna hizalanır
        const groupOf = b => { const pos = b - bar.start + off; let acc = 0; for(let k = 0; k < 64; k++){ acc += groups[k % groups.length]; if(pos < acc - 1e-9) return k; } return 64; };
        ns.forEach((n, j) => {
          const g = groupOf(n.beat), beamable = n.w !== null && n.dur < 1;
          if(run.length && (!beamable || groupOf(ns[run[run.length-1]].beat) !== g)){ if(run.length > 1) beams.push(run); run = []; }
          if(beamable) run.push(j);
        });
        if(run.length > 1) beams.push(run);
        const inBeam = new Map();
        beams.forEach(b => b.forEach(j => inBeam.set(j, b)));
        const stemUp = new Map();
        beams.forEach(b => { const up = b.reduce((s, j) => s + ns[j].sp.step, 0)/b.length < 4; b.forEach(j => stemUp.set(j, up)); });
        ns.forEach((n, j) => {
          const g = svgEl("g", { class:"pn", "data-i": n.i }), cx = pos[j];
          noteX[n.i] = { x: cx, y0, sys: si };
          if(n.w === null){ restShape(g, cx, sy, n.dur); svg.appendChild(g); noteEls[n.i] = g; return; }
          const st = n.sp.step;
          for(let s = -2; s >= st; s -= 2) g.appendChild(svgEl("line", { class:"ledger", x1: cx-9, x2: cx+9, y1: sy(s), y2: sy(s) }));
          for(let s = 10; s <= st; s += 2) g.appendChild(svgEl("line", { class:"ledger", x1: cx-9, x2: cx+9, y1: sy(s), y2: sy(s) }));
          const hollow = n.dur >= 2;
          g.appendChild(svgEl("ellipse", { class: hollow ? "head hol" : "head", cx, cy: sy(st), rx:5.4, ry:3.9, transform:`rotate(-20 ${cx} ${sy(st)})` }));
          if(n.showAcc === "0") g.appendChild(svgEl("path", { class:"nat", d: naturalPath(cx - 13, sy(st)) }));
          else if(n.showAcc) g.appendChild(svgEl("text", { class:"acc", x: cx - 13, y: sy(st) + 5 }, ACC[n.showAcc]));
          if([6, 3, 1.5, 0.75, 0.375].includes(n.dur)) g.appendChild(svgEl("circle", { class:"dot", cx: cx + 9, cy: sy(st % 2 ? st : st + 1), r:1.7 }));
          if(n.dur < 4){
            const up = stemUp.has(j) ? stemUp.get(j) : st < 4, sxp = up ? cx + 5 : cx - 5;
            let ye = up ? sy(st) - 27 : sy(st) + 27;
            const b = inBeam.get(j);
            if(b){
              const steps = b.map(k => ns[k].sp.step);
              ye = up ? sy(Math.max(...steps)) - 27 : sy(Math.min(...steps)) + 27;
            }
            g.appendChild(svgEl("line", { class:"stem", x1: sxp, x2: sxp, y1: sy(st), y2: ye }));
            if(!b && n.dur < 1){
              const fl = n.dur <= 0.125 ? 3 : n.dur <= 0.375 && n.dur !== 0.5 ? 2 : 1;
              for(let f = 0; f < fl; f++){
                const yy = ye + (up ? f*6 : -f*6);
                g.appendChild(svgEl("path", { class:"flag", d: up ? `M${sxp} ${yy}c2 6 9 8 6 16` : `M${sxp} ${yy}c2 -6 9 -8 6 -16` }));
              }
            }
            n._stem = { x: sxp, ye, up };
          }
          // Tab
          const pl = planOf[n.i];
          if(pl && pl.string !== null){
            g.appendChild(svgEl("rect", { class:"tbg", x: cx - 6, y: ty(pl.string) - 5, width:12, height:10 }));
            g.appendChild(svgEl("text", { class:"tabn", x: cx, y: ty(pl.string) + 3.5 }, String(pl.fret)));
          }
          svg.appendChild(g); noteEls[n.i] = g;
        });
        // Kiriş çizgileri
        for(const b of beams){
          const a = ns[b[0]]._stem, z = ns[b[b.length-1]]._stem;
          svg.appendChild(svgEl("line", { class:"beam", x1: a.x, x2: z.x, y1: a.ye, y2: a.ye }));
          const off = a.up ? 6 : -6;
          for(let k = 0; k < b.length; k++){
            const n = ns[b[k]];
            if(n.dur > 0.25) continue;
            const s = n._stem, nb = b[k+1] !== undefined && ns[b[k+1]].dur <= 0.25, pb = b[k-1] !== undefined && ns[b[k-1]].dur <= 0.25;
            if(nb) svg.appendChild(svgEl("line", { class:"beam", x1: s.x, x2: ns[b[k+1]]._stem.x, y1: a.ye + off, y2: a.ye + off }));
            else if(!pb) svg.appendChild(svgEl("line", { class:"beam", x1: s.x, x2: s.x + (k ? -7 : 7), y1: a.ye + off, y2: a.ye + off }));
          }
        }
        x += barW[bi]*stretch;
        const last = bi === p.bars.length - 1;
        svg.appendChild(svgEl("line", { class: last ? "bl end" : "bl", x1: x - 1, x2: x - 1, y1: top, y2: ty(6) }));
        // Ölçü numarası (dokununca o ölçüden çalmak için)
        const hit = svgEl("rect", { class:"barhit", x: x - barW[bi]*stretch, y: y0 + 24, width: barW[bi]*stretch, height: SYS_H - 30, "data-bar": bi });
        svg.insertBefore(hit, svg.firstChild);
      }
    });
    box.replaceChildren(svg);
    if(o.onBar) svg.addEventListener("click", e => { const g = e.target.closest("[data-i]"), r = e.target.closest("[data-bar]");
      if(g) o.onBar(p.notes[+g.dataset.i].bar); else if(r) o.onBar(+r.dataset.bar); });
    return { svg, noteEls, noteX };
  }
  return { draw };
})();
