// Eşlik grubu: davul (ya da darbuka), bas ve akor kalıpları. Sol Klarnet uygulamasındaki eşlik grubunun gitar sürümü:
// Batı kalıpları (rock, pop, balad, shuffle, vals, 6/8, marş) ve Türk ritimleri (kasap, çiftetelli, karşılama, Roman havası,
// aksak, Türk aksağı, Rumeli 7/8, zeybek). Akorlar şarkının ya da parçanın akorlarından gelir; bas kökü ve beşliyi çalar.
// Tarayıcıda <script> ile sırayla yüklenir (… chords → rhythm → band …); Node testleri vm ile aynı sırada yükler.

// ---- Kalıplar ----
// Bir ölçü `cells` eşit hücreye bölünür; ölçünün süresi `beats` dörtlük (9/8 = 4,5). Her dizi `cells` uzunluğundadır.
// kit: davul seti — kick (K), snare (S), hat (h kapalı, o açık); darbuka: D düm, T tek, k hafif tek (ka).
// bass: 1 kök, 5 beşli, 8 oktav, 3 üçlü, . boş (önceki nota sürer, ölçü başında yeni nota yoksa susar).
// chord: x akor vuruşu (kısa), . boş. fill: cümlenin (4 ölçü) son ölçüsünde davul/darbuka dolgusu.
// Türk ritimlerinin darbuka kalıpları Sol Klarnet'teki (band.js) elle yazılmış kalıplardır; ölçü grupları:
// Karşılama, Roman havası ve aksak 9/8 = 2+2+2+3, Rumeli 7/8 = 3+2+2, Türk aksağı 5/8 = 2+3, çiftetelli 8/8 = 3+3+2.
const GROOVES = [
  { id:"rock", family:"west", name:"Rock", name_en:"Rock", meter:"4/4", beats:4, cells:8, bpm:100,
    kick:"K...K.K.", snare:"..S...S.", hat:"hhhhhhhh", fillSnare:"..S.SSSS",
    bass:"1...1.5.", chord:"x...x..." },
  { id:"pop", family:"west", name:"Pop", name_en:"Pop", meter:"4/4", beats:4, cells:16, bpm:96,
    kick:"K.....K...K.....", snare:"....S.......S...", hat:"h.h.h.h.h.h.h.h.", fillSnare:"....S.......SSSS",
    bass:"1.....1...5.....", chord:"x.....x...x....." },
  { id:"ballad", family:"west", name:"Balad", name_en:"Ballad", meter:"4/4", beats:4, cells:8, bpm:72,
    kick:"K....K..", snare:"..S...S.", hat:"h.h.h.h.", fillSnare:"..S...SS",
    bass:"1.....5.", chord:"x...x..." },
  { id:"shuffle", family:"west", name:"Shuffle / blues", name_en:"Shuffle / blues", meter:"4/4", beats:4, cells:12, bpm:92,
    kick:"K.....K.....", snare:"...S.....S..", hat:"h.hh.hh.hh.h", fillSnare:"...S.....SSS",
    bass:"1.31.55.68.5", chord:"..x..x..x..x" },
  { id:"waltz", family:"west", name:"Vals", name_en:"Waltz", meter:"3/4", beats:3, cells:6, bpm:90,
    kick:"K.....", snare:"..S.S.", hat:"h.h.h.", fillSnare:"..SSSS",
    bass:"1.....", chord:"..x.x." },
  { id:"six8", family:"west", name:"6/8 balad", name_en:"6/8 ballad", meter:"6/8", beats:3, cells:6, bpm:60,
    kick:"K.....", snare:"...S..", hat:"hhhhhh", fillSnare:"...SSS",
    bass:"1..5..", chord:"x..x.." },
  { id:"march", family:"west", name:"Marş / polka", name_en:"March / polka", meter:"2/4", beats:2, cells:4, bpm:104,
    kick:"K.K.", snare:".S.S", hat:"h.h.", fillSnare:".SSS",
    bass:"1.5.", chord:".x.x" },
  { id:"march44", family:"west", name:"Marş (4/4)", name_en:"March (4/4)", meter:"4/4", beats:4, cells:8, bpm:112,
    kick:"K...K...", snare:"..S...S.", hat:"h.h.h.h.", fillSnare:"..S.SSSS",
    bass:"1...5...", chord:"..x...x." },
  { id:"folk", family:"west", name:"Folk (bum-çak)", name_en:"Folk (boom-chick)", meter:"4/4", beats:4, cells:8, bpm:100,
    kick:"K...K...", snare:"..S...S.", hat:"........", fillSnare:"..S..SSS",
    bass:"1...5...", chord:"..x...x." },
  { id:"classic34", family:"west", name:"Klasik 3/4 (davulsuz)", name_en:"Classical 3/4 (no drums)", meter:"3/4", beats:3, cells:6, bpm:96,
    kick:"......", snare:"......", hat:"......", bass:"1.....", chord:"..x.x." },
  { id:"classic38", family:"west", name:"Klasik 3/8 (davulsuz)", name_en:"Classical 3/8 (no drums)", meter:"3/8", beats:1.5, cells:6, bpm:66,
    kick:"......", snare:"......", hat:"......", bass:"1.....", chord:"......" },
  { id:"kasap", family:"tr", name:"Kasap havası", name_en:"Kasap havası", meter:"2/4", beats:2, cells:8, bpm:112,
    darbuka:"D.kTD.Tk", fill:"D.kTTkTk", bass:"1...5...", chord:"..x...x." },
  { id:"ciftetelli", family:"tr", name:"Çiftetelli", name_en:"Çiftetelli", meter:"8/8", beats:4, cells:16, bpm:88,
    darbuka:"D.T.k.T.D.D.T.k.", fill:"D.T.k.T.TkTkTkTk", bass:"1.......5.1.....", chord:"..x...x.....x..." },
  { id:"karsilama", family:"tr", name:"Karşılama", name_en:"Karşılama", meter:"9/8", beats:4.5, cells:18, bpm:104,
    darbuka:"D.k.T.k.D.k.T.k.k.", fill:"D.k.T.k.D.k.TkTkTk", bass:"1.......5.........", chord:"....x.......x....." },
  { id:"roman", family:"tr", name:"Roman havası", name_en:"Roman havası", meter:"9/8", beats:4.5, cells:18, bpm:100,
    darbuka:"D.k.T.k.T.k.D.T.k.", fill:"D.k.T.k.T.k.TkTkTk", bass:"1...........5.....", chord:"....x...x.....x..." },
  { id:"aksak", family:"tr", name:"Aksak (9/8)", name_en:"Aksak (9/8)", meter:"9/8", beats:4.5, cells:18, bpm:100,
    darbuka:"D.k.T.T.D.k.T.k.T.", fill:"D.k.T.T.D.k.TkTkTk", bass:"1.......5.........", chord:"....x.x.....x...x." },
  { id:"turkaksagi", family:"tr", name:"Türk aksağı", name_en:"Türk aksağı", meter:"5/8", beats:2.5, cells:10, bpm:88,
    darbuka:"D...T.k.T.", fill:"D...TkTkTk", bass:"1...5.....", chord:"....x...x." },
  { id:"rumeli", family:"tr", name:"Rumeli (7/8)", name_en:"Rumeli (7/8)", meter:"7/8", beats:3.5, cells:14, bpm:112,
    darbuka:"D.k.T.k.T.k.k.", fill:"D.k.T.k.TkTkTk", bass:"1.......5.....", chord:"....x...x....." },
  { id:"zeybek", family:"tr", name:"Zeybek (9/4)", name_en:"Zeybek (9/4)", meter:"9/4", beats:9, cells:18, bpm:96,
    darbuka:"D...T.T.D...T...T.", fill:"D...T.T.D...TkTkTk", bass:"1.......5.........", chord:"....x.x.....x...x." }
];
function grooveById(id){
  if(typeof id === "string" && id.startsWith("auto:")){ const [n, d] = id.slice(5).split("/").map(Number); return n > 0 && d > 0 ? autoGroove(n, d) : null; }
  return GROOVES.find(g => g.id === id) || null;
}
// Usulü elle yazılmamış ölçüler için darbuka kalıbı (Sol Klarnet band.js stylesFromStrokes): ölçü vuruş gruplarına
// bölünür, ilk grup düm, diğerleri tek; uzun grupların ortasına ka. Bas ilk dümde kök, sonraki gruplarda beşli.
const METER_GROUPS = { "2/4":[1,1], "3/4":[1,1,1], "4/4":[2,1,1], "3/8":[1,1,1], "5/8":[2,3], "6/8":[3,3], "6/4":[3,3], "7/8":[3,2,2],
  "8/8":[3,3,2], "9/8":[2,2,2,3], "10/8":[3,2,2,3], "12/8":[3,3,3,3], "5/4":[2,3], "7/4":[3,2,2], "9/4":[2,2,2,3], "8/4":[2,2,2,2],
  "2/2":[1,1], "4/2":[2,2], "1/4":[1], "2/8":[2], "4/8":[2,2] };
const autoCache = {};
function autoGroove(num, den){
  const key = num + "/" + den;
  if(autoCache[key]) return autoCache[key];
  let g = METER_GROUPS[key];
  if(!g){ g = []; let r = num; while(r > 0){ const x = r === 3 || r === 5 ? 3 : Math.min(2, r); g.push(x); r -= x; } }
  let drum = "", bass = "", chord = "";
  g.forEach((u, i) => {
    const n = u*2;
    drum += (i === 0 ? "D" : "T") + (n > 2 ? ".k".padEnd(n - 1, ".").slice(0, n - 1) : ".".repeat(n - 1));
    bass += (i === 0 ? "1" : i === Math.floor(g.length/2) ? "5" : ".") + ".".repeat(n - 1);
    chord += (i > 0 ? "x" : ".") + ".".repeat(n - 1);
  });
  const k = Math.max(2, Math.round(drum.length/4));
  const fill = drum.slice(0, drum.length - k) + Array.from({ length:k }, (_, i) => i % 2 ? "k" : "T").join("");
  return autoCache[key] = { id: "auto:" + key, family:"tr", name:"Usul " + key, name_en:"Usul " + key, meter: key, beats: num*4/den,
    cells: drum.length, bpm: 90, darbuka: drum, fill, bass, chord };
}
// Şarkılar sekmesindeki vuruş kalıbına uyan grup kalıbı (ölçü süresi aynı olmalı)
const RHYTHM_GROOVE = { dortluk:"ballad", sekizlik:"rock", pop:"pop", vals:"waltz", turkaksagi:"turkaksagi", aksak:"aksak" };
// Bir ölçünün darbuka/davul çalışı: cümlenin (4 ölçü; 2 dörtlükten kısa ölçülerde 8) son ölçüsü dolgu
function grooveIsFill(g, bar){ const len = g.beats <= 2 ? 8 : 4; return bar % len === len - 1; }

// Akorun bas notası (duyulan MIDI, Mi1–Re♯2 = 28–39: perde bulucunun ve gitarın en pes sesinin, duyulan Mi2'nin altında;
// hoparlörden mikrofona sızsa da nota sanılmaz). kind: "1" kök, "5" beşli, "8" oktav (kök +12, en çok 45), "3" üçlü, "6" altılı.
function bassMidi(sym, kind = "1"){
  const c = typeof sym === "string" ? chordBySymbol(sym) : sym;
  if(!c) return null;
  const iv = c.iv || CHORD_TYPES[c.type].iv;
  const off = kind === "5" ? (iv.includes(6) ? 6 : 7) : kind === "3" ? iv[1] : kind === "6" ? 9 : 0;
  const pc = (c.root + off) % 12, m = 28 + ((pc - 4 + 12) % 12);
  return kind === "8" ? m + 12 : m;
}
// Akor vuruşunun sesleri: kök konumda, duyulan Sol3 (55) – Sol4 arası sıkı dizilim
function chordMidis(sym){
  const c = typeof sym === "string" ? chordBySymbol(sym) : sym;
  if(!c) return [];
  const pcs = c.iv ? c.iv.map(i => (c.root + i) % 12) : chordPcs(c);
  return pcs.slice(0, 4).map(pc => 55 + ((pc - 7 + 12) % 12)).sort((a, b) => a - b);
}

// Bir ölçünün olayları. chordAt(x): ölçü başından x dörtlük sonra çalan akor sembolü. parts: { drum, bass, chord } (varsayılan açık).
// Döner: [{ b (ölçü başından dörtlük), part: "drum"|"bass"|"chord", k (vuruş: K S h o D T k), m (MIDI), ms (MIDI listesi), dur (dörtlük) }]
function grooveBar(g, bar, chordAt, parts = {}){
  const on = p => parts[p] !== false, cell = g.beats/g.cells, out = [], fill = grooveIsFill(g, bar);
  const lanes = g.darbuka ? [["darbuka", fill && g.fill ? g.fill : g.darbuka]]
    : [["kick", g.kick], ["snare", fill && g.fillSnare ? g.fillSnare : g.snare], ["hat", g.hat]];
  for(let i = 0; i < g.cells; i++){
    const b = i*cell;
    if(on("drum")) for(const [, s] of lanes){ const ch = s[i]; if(ch && ch !== ".") out.push({ b, part:"drum", k: ch }); }
    const bc = g.bass[i];
    if(on("bass") && bc && bc !== "."){
      let j = i + 1; while(j < g.cells && g.bass[j] === ".") j++;
      const m = bassMidi(chordAt(b), bc);
      if(m !== null) out.push({ b, part:"bass", m, dur: (j - i)*cell });
    }
    if(on("chord") && g.chord[i] === "x"){
      const ms = chordMidis(chordAt(b));
      if(ms.length) out.push({ b, part:"chord", ms, dur: Math.min(1.5, cell*3) });
    }
  }
  // Ölçü ortasında akor değişirse bas yeni akorun kökünü o anda çalar (kalıpta o hücrede bas yoksa)
  if(on("bass")){
    let prev = chordAt(0);
    for(let i = 1; i < g.cells; i++){
      const c = chordAt(i*cell);
      if(c && c !== prev && g.bass[i] === "." && !out.some(e => e.part === "bass" && Math.abs(e.b - i*cell) < 1e-9)){
        const last = out.filter(e => e.part === "bass" && e.b < i*cell).pop();
        if(last) last.dur = i*cell - last.b;
        let j = i + 1; while(j < g.cells && g.bass[j] === ".") j++;
        out.push({ b: i*cell, part:"bass", m: bassMidi(c, "1"), dur: (j - i)*cell });
      }
      prev = c;
    }
  }
  return out.sort((x, y) => x.b - y.b);
}

// Parçanın bütün eşlik olayları, parça başından dörtlük cinsinden: { t, part, k, m, ms, dur }
// p: parsePiece sonucu (bars: [{ start, len, full }], chordAt(beat)). Ön vuruş (eksik ilk ölçü) eşliksiz kalır.
function pieceBandEvents(p, g, parts = {}){
  const out = [];
  let n = 0;
  for(const bar of p.bars){
    if(!bar.full) continue;
    if(Math.abs(bar.len - g.beats) > 1e-6){ n++; continue; }          // usul değişen ölçü: bu kalıp oturmaz
    const at = p.bandChordAt || p.chordAt;
    for(const e of grooveBar(g, n++, x => at(bar.start + x), parts)) out.push({ ...e, t: bar.start + e.b });
  }
  return out;
}
