// Seni izleyen eşlik (Sol Klarnet'teki follow.js'in gitar sürümü): çaldığın notalar parçanın notalarıyla eşlenir
// (ScoreFollower), eşleşmelerden tempo ve konum çıkar (TempoMap); grup bu haritaya göre çalar, sen durunca bekler,
// yeniden girdiğin notadan devam eder. Sabit tempoda çalarken aynı eşleme notaları puanlamak için kullanılır.
// Zamanlar milisaniye (ses saati); vuruş = dörtlük. Tarayıcıda ve Node testlerinde aynı kod.

// ---- Tempo haritası ----
// observe(t, b): b vuruşundaki nota t anında çalındı. Tempo son eşleşmelerin doğrusal uydurmasına yavaşça yaklaşır;
// konum hatanın bir kısmı kadar düzeltilir (grup sıçramadan sana yaklaşır).
const FOLLOW = { phase:0.5, tempo:0.35, histBeats:4, minSpan:1, lo:0.55, hi:1.6 };
class TempoMap{
  constructor(beatMs, t0 = 0, b0 = 0, g = {}){ this.base = beatMs; this.beatMs = beatMs; this.t0 = t0; this.b0 = b0; this.hist = []; this.g = { ...FOLLOW, ...g }; }
  beatAt(t){ return this.b0 + (t - this.t0)/this.beatMs; }
  timeAt(b){ return this.t0 + (b - this.b0)*this.beatMs; }
  anchor(t, b, beatMs = this.beatMs){ this.t0 = t; this.b0 = b; this.beatMs = beatMs; }
  clearHist(){ this.hist = []; }
  observe(t, b){
    this.hist.push({ t, b });
    const g = this.g;
    while(this.hist.length > 2 && b - this.hist[0].b > g.histBeats) this.hist.shift();
    let bm = this.beatMs;
    const h = this.hist, span = h.length > 1 ? h[h.length-1].b - h[0].b : 0;
    if(h.length >= 3 && span >= g.minSpan){
      const mb = h.reduce((s, x) => s + x.b, 0)/h.length, mt = h.reduce((s, x) => s + x.t, 0)/h.length;
      let num = 0, den = 0;
      for(const x of h){ num += (x.b - mb)*(x.t - mt); den += (x.b - mb)**2; }
      if(den > 0){
        const est = Math.max(this.base*g.lo, Math.min(this.base*g.hi, num/den));
        bm += g.tempo*(est - bm);
      }
    }
    const now = this.beatAt(t);
    this.anchor(t, now + g.phase*(b - now), bm);
  }
  pct(){ return Math.round(this.base/this.beatMs*100); }
}

// Gitarda perde bulucu bazen bir oktav yanılır: bir oktav fark aynı nota sayılır
const sameNote = (a, b) => a === b || Math.abs(a - b) === 12;

// ---- Parça takipçisi ----
// notes: [{ i (parçadaki sıra), beat, w (yazılı MIDI) }] (yalnızca çalınan notalar, susların dışında).
// push(start, map) eşleşmeyi döndürür: { j (notes içindeki sıra), i, beat, t, ok (perde doğru mu), skip (atlanan nota) }
// ya da null (fazla nota). paused: grup bekliyor; o zaman zamana bakılmaz, perdesi tutan en yakın nota alınır.
class ScoreFollower{
  constructor(notes, o = {}){ this.notes = notes; this.look = o.look || 2; this.maxSkip = o.maxSkip || 4; this.k = 0; this.started = false; }
  get done(){ return this.k >= this.notes.length; }
  get next(){ return this.notes[this.k]; }
  push(s, map, paused = false){
    if(this.done) return null;
    const N = this.notes, k = this.k;
    const cands = [];
    for(let j = k; j < N.length && j - k <= this.maxSkip && (j === k || N[j].beat - N[k].beat <= this.look || paused); j++) cands.push(j);
    let best = null, bc = Infinity;
    for(const j of cands){
      if(!sameNote(N[j].w, s.w)) continue;
      const c = !this.started || paused ? (j - k) : Math.abs(s.t - map.timeAt(N[j].beat))/map.beatMs + 0.5*(j - k);
      if(c < bc){ bc = c; best = j; }
    }
    let ok = true;
    if(best !== null && this.started && !paused && bc > 1.2) best = null;
    if(best === null){
      // Yanlış perde ama zamanında: sıradaki nota çalınmış (yanlış) sayılır, takip kopmaz
      if(!this.started || paused) return null;
      const d = (s.t - map.timeAt(N[k].beat))/map.beatMs;
      if(d < -0.3 || d > 0.3) return null;
      if(this.lastT != null && s.t - this.lastT < 0.6*(N[k].beat - this.lastBeat)*map.beatMs) return null;
      best = k; ok = false;
    }
    this.started = true; this.k = best + 1; this.lastT = s.t; this.lastBeat = N[best].beat;
    return { j: best, i: N[best].i, beat: N[best].beat, t: s.t, ok, skip: best - k };
  }
  // Sabit tempoda: zamanı tol vuruştan çok geçmiş notalar kaçırıldı sayılır. Döner: atlanan notaların j listesi
  skipPast(now, map, tol = 1){
    const out = [];
    while(!this.done && now - map.timeAt(this.next.beat) > tol*map.beatMs) out.push(this.k++);
    return out;
  }
  // Sıradaki nota beklenenden ne kadar geç (ms); grup bunu aşınca bekler
  late(now, map){ return this.done || !this.started ? 0 : now - map.timeAt(this.next.beat); }
}
// Bekleme eşiği (ms): sıradaki nota bu kadar gecikirse grup durur
const followWait = beatMs => Math.max(550, beatMs*0.85);

// Çalışın özeti. marks: notes sırasıyla { ok, off (ms, gecikme düşülmüş) } ya da null (kaçan).
// Doğru nota: perdesi tutan; zamanında: doğru ve |sapma| ≤ tol. Döner yüzdeler ve sayılar.
function playSummary(marks, tol){
  const n = marks.length, right = marks.filter(m => m && m.ok), timed = right.filter(m => m.off != null && Math.abs(m.off) <= tol);
  const offs = right.filter(m => m.off != null).map(m => m.off);
  return { n, right: right.length, timed: timed.length, missed: marks.filter(m => !m).length, wrong: marks.filter(m => m && !m.ok).length,
           pct: n ? Math.round(right.length/n*100) : 0, timePct: n ? Math.round(timed.length/n*100) : 0,
           avgOff: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0)/offs.length) : 0 };
}
