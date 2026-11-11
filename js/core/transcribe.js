// Kulaktan çıkar: kaydı perdesini bozmadan yavaşlatma (WSOLA), perde kaydırma ve perde izi. Sol Klarnet'teki
// transcribe.js'in gitar sürümü (perde izi yazılı gitar notası olarak). Tarayıcıda ve Node testlerinde aynı kod.

// ---- WSOLA ----
// x: tek kanal; speed: 0,25–1,5 (0,5 = yarı hız, çıkış iki kat uzun). Pencere ≈ 46 ms, örtüşme %50; her yeni pencere,
// önceki pencerenin doğal devamına en çok benzeyen yerden (±12 ms içinde) alınır. Benzerlik 4'te bir örnekle kabaca
// aranıp tam örnekle ±4 inceltilir. Üreteç: her 400 pencerede ilerlemeyi (0–1) verir, sonunda çıkışı döndürür.
function* wsolaGen(x, speed, sr){
  const N = 1 << Math.round(Math.log2(sr*0.046)), Ha = N >> 1, Hs = Ha*speed;
  const delta = Math.round(sr*0.012), D = 4, cl = N >> 1;
  const win = new Float32Array(N);
  for(let i=0;i<N;i++) win[i] = 0.5 - 0.5*Math.cos(2*Math.PI*i/N);
  const frames = Math.max(1, Math.ceil((x.length - N)/Hs) + 1), outLen = (frames - 1)*Ha + N;
  const y = new Float32Array(outLen), w = new Float32Array(outLen);
  const at = i => i >= 0 && i < x.length ? x[i] : 0;
  const corr = (a, b, len, step) => {
    let s = 0;
    if(a >= 0 && b >= 0 && a + len <= x.length && b + len <= x.length){ for(let i=0;i<len;i+=step) s += x[a + i]*x[b + i]; return s; }
    for(let i=0;i<len;i+=step) s += at(a + i)*at(b + i);
    return s;
  };
  let prev = 0;
  for(let k=0;k<frames;k++){
    const ideal = Math.round(k*Hs);
    let best = ideal;
    if(k > 0){
      const nat = prev + Ha;
      let bc = -Infinity;
      for(let d=-delta; d<=delta; d+=D){ const c = corr(ideal + d, nat, cl, D); if(c > bc){ bc = c; best = ideal + d; } }
      const coarse = best; bc = -Infinity;
      for(let d=-D; d<=D; d++){ const c = corr(coarse + d, nat, cl, 1); if(c > bc){ bc = c; best = coarse + d; } }
    }
    const o = k*Ha;
    for(let i=0;i<N;i++){ y[o + i] += at(best + i)*win[i]; w[o + i] += win[i]; }
    prev = best;
    if(k % 400 === 399) yield k/frames;
  }
  for(let i=0;i<outLen;i++) if(w[i] > 1e-3) y[i] /= w[i];
  return y.subarray(0, Math.min(outLen, Math.round(x.length/speed)));
}
function wsola(x, speed, sr){ return runGen(wsolaGen(x, speed, sr)); }
// Doğrusal yeniden örnekleme: ratio > 1 kısaltır (perde ratio kadar tizleşir)
function resampleLinear(x, ratio){
  const n = Math.max(1, Math.floor(x.length/ratio)), y = new Float32Array(n);
  for(let i=0;i<n;i++){ const p = i*ratio, j = Math.floor(p), f = p - j; y[i] = (x[j] || 0)*(1 - f) + (x[j + 1] || 0)*f; }
  return y;
}
// Hız ve perde birlikte: önce speed/p ile uzat, sonra p ile yeniden örnekle (p = 2^(sent/1200)). Üreteç (ilerleme 0–1).
function* stretchShiftGen(x, sr, speed, cents){
  const p = Math.pow(2, cents/1200);
  if(Math.abs(speed - 1) < 1e-6 && Math.abs(cents) < 0.5) return x.slice();
  const st = yield* wsolaGen(x, speed/p, sr);
  return Math.abs(p - 1) < 1e-6 ? st : resampleLinear(st, p);
}
// Perde izi: 20 ms'de bir detectPitch. Döner [{ t (sn), w (yazılı gitar notası, ondalıklı MIDI) | null, rms }]
function* pitchTraceGen(x, sr, opts = {}){
  const hop = Math.round(sr*(opts.hopMs || 20)/1000), win = 2048, out = [];
  for(let s=0, k=0; s + win <= x.length; s += hop, k++){
    const d = detectPitch(x.subarray(s, s + win), sr, opts.minHz || 70, opts.maxHz || 1400, opts.minRms || 0.006);
    out.push({ t: (s + win/2)/sr, w: d.freq > 0 && (d.clarity == null || d.clarity > 0.8) ? freqToMidi(d.freq) + GUITAR_TRANSPOSE : null, rms: d.rms });
    if(k % 500 === 499) yield s/x.length;
  }
  return out;
}
const runGen = g => { let r = g.next(); while(!r.done) r = g.next(); return r.value; };

// Perde izinden notalar: aynı yarım seste en az minMs süren kesintisiz parçalar; aradaki kısa boşluk (≤ 40 ms) aynı notayı bölmez.
// Döner [{ t, dur (sn), w (yazılı MIDI) }]
function traceNotes(trace, minMs = 80){
  const out = [];
  let cur = null, gap = 0;
  const close = () => { if(cur && (cur.end - cur.t)*1000 >= minMs) out.push({ t: cur.t, dur: cur.end - cur.t, w: Math.round(median(cur.ws)) }); cur = null; };
  for(const p of trace){
    const w = p.w == null ? null : Math.round(p.w);
    if(w !== null && cur && Math.abs(w - Math.round(median(cur.ws))) === 0){ cur.ws.push(p.w); cur.end = p.t; gap = 0; continue; }
    if(w === null && cur && (gap += 20) <= 40) continue;
    close();
    if(w !== null){ cur = { t: p.t, end: p.t, ws: [p.w] }; gap = 0; }
  }
  close();
  return out;
}
// Notaları tempoya oturtur: bpm verilmezse nota başları arasındaki aralıkların ortancası bir sekizlik sayılır.
// Süreler on altılığa yuvarlanır; Parçalar yazımında ölçülere bölünmüş metin döner (4/4).
function notesToPiece(notes, bpm){
  if(!notes.length) return { text: "", bpm: bpm || 90 };
  if(!bpm){
    const iv = notes.slice(1).map((n, i) => n.t - notes[i].t).filter(x => x > 0.08);
    bpm = iv.length ? Math.round(Math.min(180, Math.max(50, 30/median(iv)))) : 90;
  }
  const beat = 60/bpm, q = x => Math.max(0, Math.round(x/beat*4)/4);
  const ev = [];
  let pos = 0;
  const t0 = notes[0].t;
  notes.forEach((n, i) => {
    const st = q(n.t - t0), end = i + 1 < notes.length ? q(notes[i+1].t - t0) : st + Math.max(0.25, q(n.dur));
    if(st > pos) ev.push({ w: null, d: st - pos });
    // Legato: sıradaki nota yarım vuruştan yakın başlıyorsa nota ona kadar sürer
    const d = Math.max(0.25, Math.min(end - st - q(n.dur) <= 0.5 ? end - st : q(n.dur) || 0.25, 4));
    if(end > st){ ev.push({ w: n.w, d }); pos = st + d; }
  });
  // Ölçülere böl; ölçü çizgisini aşan nota ikiye bölünür (bağsız)
  const DURS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  const split = x => { const out = []; let r = Math.round(x*4)/4; while(r > 1e-6){ const d = DURS.find(v => v <= r + 1e-6); out.push(d); r -= d; } return out; };
  const bars = [[]];
  let inBar = 0;
  for(const e of ev){
    let rest = e.d;
    while(rest > 1e-6){
      const take = Math.min(rest, 4 - inBar);
      for(const d of split(take)) bars[bars.length-1].push((e.w === null ? "r" : NOTE_EN_ASCII[(e.w % 12 + 12) % 12] + (Math.floor(e.w/12) - 1)) + (d === 1 ? "" : ":" + d));
      inBar += take; rest -= take;
      if(inBar >= 4 - 1e-6){ bars.push([]); inBar = 0; }
    }
  }
  if(!bars[bars.length-1].length) bars.pop();
  return { text: bars.map(b => b.join(" ")).join(" | "), bpm };
}
const NOTE_EN_ASCII = ["C","C#","D","Eb","E","F","F#","G","G#","A","Bb","B"];
