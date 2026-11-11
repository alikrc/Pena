// Okuma: deşifre ezgisi, nota okuma sorusu, ezgi ve ritim diktesi (Sol Klarnet'teki reading.js'in gitar sürümü).
// Ezgiler her seferinde yeniden üretilir (ezberlenemesin). Seviyeler gitarın 1. pozisyonuna göre: önce ince teller,
// sonra bütün teller, sonra donanım ve değiştiriciler, en sonda komasız makam dizileri ve aksak ölçüler.
// Tarayıcıda <script> ile yüklenir; Node testleri aynı kodu kullanır. rng: 0–1 üreten işlev (testte tohumlu).

// Seviyeler. pool: yazılı notalar (gitar yazımı), meters, key (donanım), bpm, leap (en büyük adım, havuz sırasıyla)
const READ_LEVELS = [
  { id:1, name:"1. ve 2. tel", name_en:"Strings 1 and 2", pool:[71,72,74,76,77,79], meters:["4/4"], key:"C", bpm:66, leap:2, durs:1 },
  { id:2, name:"İlk üç tel", name_en:"First three strings", pool:[67,69,71,72,74,76,77,79], meters:["4/4","3/4"], key:"C", bpm:72, leap:2, durs:2 },
  { id:3, name:"1. pozisyon, bütün teller", name_en:"First position, all strings", pool:[52,53,55,57,59,60,62,64,65,67,69,71,72,74,76,77,79], meters:["4/4","3/4"], key:"C", bpm:72, leap:3, durs:2 },
  { id:4, name:"Donanım: Sol ve Fa majör", name_en:"Key signatures: G and F major", keys:{ G:[55,57,59,60,62,64,66,67,69,71,72,74,76,78,79], F:[53,55,57,58,60,62,64,65,67,69,70,72,74,76,77] }, meters:["4/4","3/4","6/8"], bpm:76, leap:3, durs:3 },
  { id:5, name:"Komasız makam ve aksak", name_en:"Makam scales without commas, odd meters", makams:{
      "Hicaz (La)":[57,58,61,62,64,65,67,69,70,73,74,76], "Nihâvent (Sol)":[55,57,58,60,62,63,66,67,69,70,72,74],
      "Kürdî (La)":[57,58,60,62,64,65,67,69,70,72,74,76], "Uşşak (La, Segâh = Si)":[57,59,60,62,64,65,67,69,71,72,74,76] },
    meters:["9/8","7/8","2/4","4/4"], bpm:80, leap:2, durs:3 }
];
// Ölçü vuruş grupları (dörtlük)
const READ_GROUPS = { "4/4":[1,1,1,1], "3/4":[1,1,1], "2/4":[1,1], "6/8":[1.5,1.5], "9/8":[1,1,1,1.5], "7/8":[1.5,1,1] };
const READ_SPLITS = { 1:[[1],[1],[0.5,0.5]], 1.5:[[1.5],[1,0.5],[0.5,1],[0.5,0.5,0.5]] };
// Bir ölçünün süreleri. durs 1: dörtlük ve ikilik; 2: + sekizlik; 3: + noktalı dörtlük, on altılık çiftleri
function readBar(meter, durs, rng){
  const g = READ_GROUPS[meter] || READ_GROUPS["4/4"], out = [];
  for(let i = 0; i < g.length; i++){
    if(g[i] === 1 && g[i + 1] === 1 && rng() < (durs <= 1 ? 0.35 : 0.2)){
      if(durs >= 3 && rng() < 0.4) out.push(1.5, 0.5); else out.push(2);
      i++; continue;
    }
    if(durs <= 1){ out.push(g[i]); continue; }
    let opts = READ_SPLITS[g[i]] || [[g[i]]];
    if(durs >= 3 && g[i] === 1) opts = [...opts, [0.5,0.25,0.25], [0.75,0.25]];
    out.push(...opts[Math.floor(rng()*opts.length)]);
  }
  return out;
}
const READ_NAMES = ["C","C#","D","Eb","E","F","F#","G","G#","A","Bb","B"];
// Notayı donanıma uygun yazar (Fa majörde Si♭, makamlarda bemol tercihi)
function readName(w, flats){
  const pc = ((w % 12) + 12) % 12, sharp = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"], flat = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  return (flats ? flat : (pc === 10 ? flat : sharp))[pc] + (Math.floor(w/12) - 1);
}
// Deşifre ezgisi: { title, meter, key, bpm, groove, text } — Parçalar yazımında, akorlu (birinci derece ve beşinci derece)
function sightPiece(lv, rng = Math.random){
  const L0 = READ_LEVELS[Math.max(1, Math.min(READ_LEVELS.length, lv)) - 1];
  const meter = L0.meters[Math.floor(rng()*L0.meters.length)];
  let pool = L0.pool, key = L0.key || "C", label = "", flats = false;
  if(L0.keys){ key = Object.keys(L0.keys)[Math.floor(rng()*2)]; pool = L0.keys[key]; flats = key === "F"; }
  if(L0.makams){ const ks = Object.keys(L0.makams); label = ks[Math.floor(rng()*ks.length)]; pool = L0.makams[label]; flats = true; }
  const tonic = L0.keys ? (key === "G" ? 7 : 5) : L0.makams ? pool[0] % 12 : pool.includes(72) ? 0 : 7;
  const home = pool.findIndex(w => w % 12 === tonic && w >= 60) >= 0 ? pool.findIndex(w => w % 12 === tonic && w >= 60) : pool.findIndex(w => w % 12 === tonic);
  const bars = 4, barLen = (READ_GROUPS[meter] || [1,1,1,1]).reduce((a, b) => a + b, 0);
  const durs = []; for(let b = 0; b < bars; b++) durs.push(readBar(meter, L0.durs, rng));
  // Son ölçü: tek uzun nota (9/8, 7/8 gibi süresi tek notayla yazılamayan ölçülerde vuruş grubu başına bir nota)
  durs[bars - 1] = PIECE_DURS.includes(barLen) ? [barLen] : [...READ_GROUPS[meter]];
  let i = Math.max(0, home), seq = [];
  const flat = durs.flat();
  flat.forEach((d, k) => {
    if(k === flat.length - 1){ seq.push(home); return; }
    seq.push(i);
    const r = rng(), step = r < 0.65 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 1 : -1)*(2 + Math.floor(rng()*(L0.leap - 1)));
    let j = i + step;
    if(j < 0 || j >= pool.length || Math.abs(j - home) > 7) j = i - step;
    i = Math.max(0, Math.min(pool.length - 1, j));
  });
  if(seq.length > 2){ const h = seq[seq.length - 1], p = seq[seq.length - 2]; if(Math.abs(p - h) > 2) seq[seq.length - 2] = Math.max(0, Math.min(pool.length - 1, h + (p > h ? 1 : -1))); }
  // Akorlar: tonik ve beşli majör (makamlarda tonik minör/majör sadeleştirilmiş: Hicaz La → A, Nihâvent Sol → Gm …)
  const CH = { 0:["C","G"], 7:["G","D"], 5:["F","C"], 9:["Am","E"] };
  const mkCh = { "Hicaz (La)":["A","Gm"], "Nihâvent (Sol)":["Gm","D"], "Kürdî (La)":["Am","Gm"], "Uşşak (La, Segâh = Si)":["Am","G"] };
  const [I, V] = L0.makams ? mkCh[label] : CH[tonic] || ["C","G"];
  let n = 0;
  const text = durs.map((bar, b) => (b === 0 || b === bars - 1 ? "[" + I + "] " : b % 2 ? "[" + V + "] " : "[" + I + "] ") +
    bar.map(d => readName(pool[seq[n++]], flats) + (d === 1 ? "" : ":" + d)).join(" ")).join(" | ");
  const GR = { "4/4":"ballad", "3/4":"waltz", "6/8":"six8", "2/4":"march", "9/8":"aksak", "7/8":"rumeli" };
  return { title: L0.makams ? label : L0.name, title_en: L0.makams ? label : L0.name_en, meter, key, bpm: L0.bpm, groove: GR[meter], text, level: L0.id };
}

// Nota okuma sorusu: seviyenin havuzundan, zorlanılan notalar daha sık (weights: { w: ağırlık })
function readQuizNote(lv, rng = Math.random, weights = {}, avoid = null){
  const L0 = READ_LEVELS[Math.max(1, Math.min(3, lv)) - 1], pool = L0.pool.filter(w => w !== avoid);
  const ws = pool.map(w => 1 + (weights[w] || 0)), sum = ws.reduce((a, b) => a + b, 0);
  let r = rng()*sum;
  for(let k = 0; k < pool.length; k++){ r -= ws[k]; if(r <= 0) return pool[k]; }
  return pool[pool.length - 1];
}

// Ezgi diktesi: n notalık kısa ezgi (dörtlük), ilk nota verilir. Döner [yazılı MIDI]
function dictMelody(lv, n = 4, rng = Math.random){
  const L0 = READ_LEVELS[Math.max(1, Math.min(3, lv)) - 1], pool = L0.pool;
  let i = Math.floor(pool.length/2);
  const out = [pool[i]];
  while(out.length < n){
    const step = (rng() < 0.6 ? 1 : 2)*(rng() < 0.5 ? 1 : -1);
    let j = i + step; if(j < 0 || j >= pool.length) j = i - step;
    i = Math.max(0, Math.min(pool.length - 1, j)); out.push(pool[i]);
  }
  return out;
}
// Ritim diktesi: doğru ölçü ve ondan farklı üç seçenek (süre dizileri)
function rhythmChoices(meter, lv, rng = Math.random){
  const key = d => d.join(","), seen = new Set(), out = [];
  let guard = 0;
  while(out.length < 4 && guard++ < 200){
    const b = readBar(meter, Math.max(1, Math.min(3, lv)), rng);
    if(!seen.has(key(b))){ seen.add(key(b)); out.push(b); }
  }
  return { answer: 0, choices: out };
}
