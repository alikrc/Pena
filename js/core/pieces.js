// Parçalar: notası (ezgi), akorları ve eşlik kalıbı olan çalma parçaları. Parçayı dinle, grupla birlikte çal ya da
// grup seni izlesin (Benimle çal). Tarayıcıda <script> ile sırayla yüklenir (… songs → band → follow → pieces …).

// ---- Yazım ----
// Ölçüler "|" ile ayrılır. Nota: ad + oktav (gitar yazımı, Türkçe ya da harf: "Mi5", "E5", "F#4", "Sib4") ve isteğe bağlı
// ":süre" (dörtlük cinsinden, varsayılan 1). Sus: "r:süre". Akor: köşeli parantezde, o andan itibaren geçerli: "[Am]".
// Süreler: 4 birlik, 3 noktalı ikilik, 2 ikilik, 1,5 noktalı dörtlük, 1 dörtlük, 0,75 noktalı sekizlik, 0,5 sekizlik, 0,25 on altılık.
// İlk ölçü kısa olabilir (ön vuruş), son ölçü de; aradaki her ölçü ölçü süresine eşit olmalı.
const PIECE_DURS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
// Donanım (dizi işaretleri): pozitif diyez, negatif bemol sayısı
const KEY_SIG = { C:0, G:1, D:2, A:3, E:4, F:-1, Bb:-2, Am:0, Em:1, Bm:2, "F#m":3, Dm:-1, Gm:-2 };
function parsePiece(text, meter = "4/4"){
  const [num, den] = String(meter).split("/").map(Number), barBeats = num*4/den;
  const notes = [], chords = [], bars = [], errors = [];
  let beat = 0;
  const raw = String(text || "").split("|").map(s => s.trim()).filter(Boolean);
  raw.forEach((src, bi) => {
    const start = beat, first = notes.length;
    for(const tok of src.split(/\s+/).filter(Boolean)){
      const cm = /^\[([^\]]+)\]$/.exec(tok);
      if(cm){
        const c = chordBySymbol(cm[1]);
        if(!c) errors.push(tok); else chords.push({ beat, sym: c.symbol });
        continue;
      }
      const [n, d] = tok.split(":"), dur = d === undefined ? 1 : parseFloat(d.replace(",", "."));
      const w = /^r$/i.test(n) ? null : parseNoteName(n);
      if((w === null && !/^r$/i.test(n)) || !PIECE_DURS.includes(dur)){ errors.push(tok); continue; }
      notes.push({ i: notes.length, beat, dur, w, bar: bi, sp: w === null ? null : spellToken(n, w) });
      beat += dur;
    }
    const len = Math.round((beat - start)*1000)/1000;
    bars.push({ start, len, full: Math.abs(len - barBeats) < 1e-6, first });
    if(len > barBeats + 1e-6 || (len < barBeats - 1e-6 && bi > 0 && bi < raw.length - 1))
      errors.push((bi + 1) + ". ölçü " + len + "/" + barBeats);
  });
  // Akor, o vuruşta ya da öncesinde yazılan son akor; ilk akordan önce akor yok
  const chordAt = b => { let s = null; for(const c of chords){ if(c.beat <= b + 1e-9) s = c.sym; else break; } return s; };
  return { num, den, barBeats, notes, chords, bars, errors, total: beat, chordAt };
}
// Notanın yazıldığı gibi dizekteki yeri: l harf (0 Do … 6 Si), a değiştirici (−1 bemol, 0, 1 diyez), step (alt çizgi Mi4 = 0)
const SPELL_TR = { do:0, re:1, mi:2, fa:3, sol:4, la:5, si:6 }, SPELL_EN = { c:0, d:1, e:2, f:3, g:4, a:5, b:6 };
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
function spellToken(n, w){
  const m = /^(do|re|mi|fa|sol|la|si|[a-g])([#♯b♭]?)(-?\d)$/i.exec(String(n).trim());
  const name = m[1].toLowerCase(), l = name.length > 1 || !(name in SPELL_EN) ? SPELL_TR[name] : SPELL_EN[name];
  const a = m[2] === "#" || m[2] === "♯" ? 1 : m[2] ? -1 : 0;
  const oct = Math.floor((w - a - LETTER_PC[l])/12) - 1;
  return { l, a, step: oct*7 + l - 30 };
}
// Donanımdaki değiştiriciler: harf → −1/0/1
function keyAccidentals(key){
  const n = KEY_SIG[key] || 0, out = [0,0,0,0,0,0,0];
  const sharps = [3,0,4,1,5,2,6], flats = [6,2,5,1,4,0,3];
  for(let i = 0; i < Math.abs(n); i++) out[n > 0 ? sharps[i] : flats[i]] = n > 0 ? 1 : -1;
  return out;
}
// Takipçinin beklediği notalar: susların dışındakiler
function pieceTargets(p){ return p.notes.filter(n => n.w !== null).map(n => ({ i: n.i, beat: n.beat, w: n.w })); }

// ---- Hazır parçalar ----
// group: "west" Batı (telif süresi dolmuş, kamu malı), "tr" Türkçe bilinen ezgiler (anonim halk ezgileri),
// "etude" Pena için yazılmış özgün çalışma parçaları (Türk ve Batı ritimleri). Telifli şarkıların ezgisi eklenmedi:
// onların akorları Şarkılar sekmesinde, grup eşliğiyle çalınır.
// key: donanım (KEY_SIG), groove: eşlik kalıbı (GROOVES), bpm: dörtlük/dk.
const PIECES = [
  { id:"ode", group:"west", title:"Neşeye Övgü", title_en:"Ode to Joy", by:"Beethoven (1824)", meter:"4/4", key:"C", groove:"pop", bpm:96,
    text:"[C] E5 E5 F5 G5 | [G] G5 F5 E5 D5 | [C] C5 C5 D5 E5 | [G] E5:1.5 D5:0.5 D5:2 | [C] E5 E5 F5 G5 | [G] G5 F5 E5 D5 | [C] C5 C5 D5 E5 | [G] D5:1.5 C5:0.5 [C] C5:2 |" +
         " [G] D5 D5 E5 C5 | D5 E5:0.5 F5:0.5 [C] E5 C5 | [G] D5 E5:0.5 F5:0.5 E5 D5 | [C] C5 [G] D5 G4:2 | [C] E5 E5 F5 G5 | [G] G5 F5 E5 D5 | [C] C5 C5 D5 E5 | [G] D5:1.5 C5:0.5 [C] C5:2" },
  { id:"jingle", group:"west", title:"Jingle Bells", by:"J. Pierpont (1857)", meter:"4/4", key:"C", groove:"march44", bpm:112,
    text:"[C] E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:0.5 | E5:4 | [F] F5 F5 F5:1.5 F5:0.5 | [C] F5 E5 E5 E5:0.5 E5:0.5 | [D7] E5 D5 D5 E5 | [G7] D5:2 G5:2 |" +
         " [C] E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:0.5 | E5:4 | [F] F5 F5 F5 F5 | [C] F5 E5 E5 E5:0.5 E5:0.5 | [G7] G5 G5 F5 D5 | [C] C5:4" },
  { id:"saints", group:"west", title:"When the Saints Go Marching In", by:"Geleneksel", by_en:"Traditional", meter:"4/4", key:"C", groove:"march44", bpm:112,
    text:"C5 E5 F5 | [C] G5:4 | r C5 E5 F5 | G5:4 | r C5 E5 F5 | G5:2 E5:2 | C5:2 E5:2 | [G] D5:4 | r E5 E5 D5 | [C] C5:3 C5 | E5:2 G5:2 | [F] G5 F5:3 | [C] r E5 F5 G5 | E5:2 C5:2 | [G] D5:2 [C] C5:2" },
  { id:"susanna", group:"west", title:"Oh! Susanna", by:"S. Foster (1848)", meter:"4/4", key:"C", groove:"folk", bpm:100,
    text:"C4:0.5 D4:0.5 | [C] E4 G4 G4:1.5 A4:0.5 | G4 E4 C4:1.5 D4:0.5 | E4 E4 D4 C4 | [G] D4:3 C4:0.5 D4:0.5 | [C] E4 G4 G4:1.5 A4:0.5 | G4 E4 C4:1.5 D4:0.5 | E4 E4 [G] D4 D4 | [C] C4:3" },
  { id:"amazing", group:"west", title:"Amazing Grace", by:"Geleneksel ilahi (1779)", by_en:"Traditional hymn (1779)", meter:"3/4", key:"G", groove:"waltz", bpm:84,
    text:"D4 | [G] G4:2 B4:0.5 G4:0.5 | B4:2 A4 | [C] G4:2 E4 | [G] D4:2 D4 | G4:2 B4:0.5 G4:0.5 | B4:2 A4 | [D] D5:3 | [G] D5:2 B4 |" +
         " D5:2 B4:0.5 G4:0.5 | B4:2 A4 | [C] G4:2 E4 | [G] D4:2 D4 | G4:2 B4:0.5 G4:0.5 | [D] B4:2 A4 | [G] G4:2" },
  { id:"greensleeves", group:"west", title:"Greensleeves", by:"Geleneksel İngiliz ezgisi", by_en:"Traditional English tune", meter:"3/4", key:"Am", groove:"classic34", bpm:96,
    text:"A4 | [Am] C5:2 D5 | E5:1.5 F5:0.5 E5 | [G] D5:2 B4 | [Em] G4:1.5 A4:0.5 B4 | [Am] C5:2 A4 | [E] A4:1.5 G#4:0.5 A4 | B4:2 G#4 | [Am] E4:2 A4 |" +
         " C5:2 D5 | E5:1.5 F5:0.5 E5 | [G] D5:2 B4 | [Em] G4:1.5 A4:0.5 B4 | [Am] C5:1.5 B4:0.5 A4 | [E] G#4:1.5 F#4:0.5 G#4 | [Am] A4:2" },
  { id:"birthday", group:"west", title:"Happy Birthday to You", by:"Geleneksel", by_en:"Traditional", meter:"3/4", key:"C", groove:"waltz", bpm:100,
    text:"G4:0.75 G4:0.25 | [C] A4 G4 C5 | [G] B4:2 G4:0.75 G4:0.25 | A4 G4 D5 | [C] C5:2 G4:0.75 G4:0.25 | G5 E5 C5 | [F] B4 A4 F5:0.75 F5:0.25 | [C] E5 C5 [G] D5 | [C] C5:2" },
  { id:"elise", group:"west", title:"Für Elise", by:"Beethoven (1810)", meter:"3/8", key:"Am", groove:"classic38", bpm:66,
    text:"E5:0.25 D#5:0.25 | [E] E5:0.25 D#5:0.25 E5:0.25 B4:0.25 D5:0.25 C5:0.25 | [Am] A4:0.5 r:0.25 C4:0.25 E4:0.25 A4:0.25 | [E] B4:0.5 r:0.25 E4:0.25 G#4:0.25 B4:0.25 | [Am] C5:0.5 r:0.25 E4:0.25 E5:0.25 D#5:0.25 |" +
         " [E] E5:0.25 D#5:0.25 E5:0.25 B4:0.25 D5:0.25 C5:0.25 | [Am] A4:0.5 r:0.25 C4:0.25 E4:0.25 A4:0.25 | [E] B4:0.5 r:0.25 E4:0.25 C5:0.25 B4:0.25 | [Am] A4:1" },
  { id:"minuet", group:"west", title:"Minuet in G", by:"C. Petzold (1725)", meter:"3/4", key:"G", groove:"classic34", bpm:100,
    text:"[G] D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5 G4 G4 | [C] E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | [G] G5 G4 G4 | [C] C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | [G] B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | [D] F#4 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4:3 |" +
         " [G] D5 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5 G4 G4 | [C] E5 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | [G] G5 G4 G4 | [C] C5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | [G] B4 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | [D] A4 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 | [G] G4:3" },
  { id:"auld", group:"west", title:"Auld Lang Syne", by:"Geleneksel İskoç ezgisi", by_en:"Traditional Scottish tune", meter:"4/4", key:"C", groove:"ballad", bpm:76,
    text:"G3 | [C] C4:1.5 C4:0.5 C4 E4 | [G] D4:1.5 C4:0.5 D4 E4 | [C] C4:1.5 C4:0.5 E4 G4 | [F] A4:3 A4 | [C] G4:1.5 E4:0.5 E4 C4 | [G] D4:1.5 C4:0.5 D4 E4 | [F] C4:1.5 A3:0.5 A3 [G] G3 | [C] C4:3" },
  { id:"frere", group:"west", title:"Frère Jacques", by:"Geleneksel Fransız ezgisi", by_en:"Traditional French tune", meter:"4/4", key:"C", groove:"folk", bpm:100,
    text:"[C] C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | C4 [G] G3 [C] C4:2 | C4 [G] G3 [C] C4:2" },
  { id:"twinkle", group:"west", title:"Twinkle Twinkle Little Star", by:"Geleneksel Fransız ezgisi", by_en:"Traditional French tune", meter:"4/4", key:"C", groove:"ballad", bpm:92,
    text:"[C] C4 C4 G4 G4 | [F] A4 A4 [C] G4:2 | [F] F4 F4 [C] E4 E4 | [G] D4 D4 [C] C4:2 | G4 G4 [F] F4 F4 | [C] E4 E4 [G] D4:2 | [C] G4 G4 [F] F4 F4 | [C] E4 E4 [G] D4:2 |" +
         " [C] C4 C4 G4 G4 | [F] A4 A4 [C] G4:2 | [F] F4 F4 [C] E4 E4 | [G] D4 D4 [C] C4:2" },
  { id:"daha-dun", group:"tr", title:"Daha Dün Annemizin", title_en:"Daha Dün Annemizin (Hänschen klein)", by:"Alman halk ezgisi (Hänschen klein)", by_en:"German folk tune (Hänschen klein)", meter:"4/4", key:"C", groove:"folk", bpm:104,
    text:"[C] G4 E4 E4:2 | [G] F4 D4 D4:2 | [C] C4 D4 E4 F4 | G4 G4 G4:2 | G4 E4 E4:2 | [G] F4 D4 D4:2 | [C] C4 E4 G4 G4 | C4:4 |" +
         " [G] D4 D4 D4 D4 | D4 E4 F4:2 | [C] E4 E4 E4 E4 | E4 F4 G4:2 | G4 E4 E4:2 | [G] F4 D4 D4:2 | [C] C4 E4 G4 G4 | C4:4" },
  { id:"ali-baba", group:"tr", title:"Ali Baba'nın Çiftliği", title_en:"Ali Baba'nın Çiftliği (Old MacDonald)", by:"Geleneksel ezgi (Old MacDonald)", by_en:"Traditional tune (Old MacDonald)", meter:"4/4", key:"G", groove:"folk", bpm:112,
    text:"[G] G4 G4 G4 D4 | [C] E4 E4 [G] D4:2 | B4 B4 [D] A4 A4 | [G] G4:3 D4 | G4 G4 G4 D4 | [C] E4 E4 [G] D4:2 | B4 B4 [D] A4 A4 | [G] G4:4 |" +
         " D4:0.5 D4:0.5 G4 G4 G4 | D4:0.5 D4:0.5 G4 G4:2 | G4:0.5 G4:0.5 G4 G4:0.5 G4:0.5 G4 | G4:0.5 G4:0.5 G4:0.5 G4:0.5 G4 G4 | G4 G4 G4 D4 | [C] E4 E4 [G] D4:2 | B4 B4 [D] A4 A4 | [G] G4:4" },
  { id:"karsilama-etut", group:"etude", title:"Karşılama etüdü", title_en:"Karşılama study", by:"Pena · 9/8 (2+2+2+3) · La Hicaz", by_en:"Pena · 9/8 (2+2+2+3) · Hicaz on A", meter:"9/8", key:"C", groove:"karsilama", bpm:92,
    text:"[A] A4:0.5 Bb4:0.5 C#5 D5 E5:1.5 | F5:0.5 E5:0.5 D5 C#5 Bb4:0.5 A4 | [Gm] G4 Bb4 D5 C#5:0.5 Bb4:0.5 A4:0.5 | [A] A4 Bb4:0.5 A4:0.5 G4 A4:1.5 |" +
         " A4:0.5 Bb4:0.5 C#5 D5 E5:1.5 | [Dm] F5 E5 D5 E5:0.5 F5:0.5 D5:0.5 | [A] E5:0.5 D5:0.5 C#5 Bb4 C#5:1.5 | A4:3 r:1.5" },
  { id:"ciftetelli-etut", group:"etude", title:"Çiftetelli etüdü", title_en:"Çiftetelli study", by:"Pena · 8/8 (3+3+2) · Re Hicaz", by_en:"Pena · 8/8 (3+3+2) · Hicaz on D", meter:"8/8", key:"C", groove:"ciftetelli", bpm:84,
    text:"[D] D5:1.5 Eb5:1.5 F#5 | G5:0.5 F#5:0.5 Eb5:0.5 D5 C5:0.5 D5 | [Cm] C5:1.5 Eb5:1.5 G5 | [D] F#5:0.5 Eb5:0.5 D5:0.5 Eb5:0.5 D5:2 |" +
         " A4:1.5 D5:1.5 Eb5 | [Gm] D5:0.5 C5:0.5 Bb4:0.5 A4:0.5 G4:2 | [D] A4:0.5 Bb4:0.5 C5:0.5 D5:0.5 Eb5:0.5 F#5:0.5 Eb5 | D5:4" },
  { id:"kasap-etut", group:"etude", title:"Kasap havası etüdü", title_en:"Kasap havası study", by:"Pena · 2/4 · La minör", by_en:"Pena · 2/4 · A minor", meter:"2/4", key:"Am", groove:"kasap", bpm:100,
    text:"[Am] A4:0.5 B4:0.5 C5:0.5 D5:0.5 | E5 E5 | [Dm] F5:0.5 E5:0.5 D5:0.5 C5:0.5 | [E] B4 E4 | [Am] A4:0.5 B4:0.5 C5:0.5 D5:0.5 | E5:0.5 F5:0.5 E5 | [E] D5:0.5 C5:0.5 B4:0.5 G#4:0.5 | [Am] A4:2" },
  { id:"rock-etut", group:"etude", title:"Rock riff etüdü", title_en:"Rock riff study", by:"Pena · 4/4 · Mi minör pentatonik", by_en:"Pena · 4/4 · E minor pentatonic", meter:"4/4", key:"Em", groove:"rock", bpm:96,
    text:"[E] E4:0.5 E4:0.5 G4:0.5 E4:0.5 A4 G4 | E4:0.5 E4:0.5 G4:0.5 E4:0.5 B4:2 | [A] A4:0.5 A4:0.5 C5:0.5 A4:0.5 D5 C5 | [E] B4:0.5 A4:0.5 G4:0.5 E4:0.5 E4:2 |" +
         " E4:0.5 E4:0.5 G4:0.5 E4:0.5 A4 G4 | E4:0.5 E4:0.5 G4:0.5 E4:0.5 B4:2 | [B] B4:0.5 B4:0.5 D5:0.5 B4:0.5 [A] A4 G4 | [E] E4:4" },
  { id:"blues-etut", group:"etude", title:"12 ölçülük blues", title_en:"12-bar blues", by:"Pena · shuffle · La", by_en:"Pena · shuffle · A", meter:"4/4", key:"C", groove:"shuffle", bpm:88,
    text:"[A7] A4 C5 D5 C5 | A4:3 r | A4 C5 D5 E5 | G5:0.5 E5:0.5 D5 C5 A4 | [D7] D5 C5 A4 C5 | D5:3 r | [A7] A4 C5 D5 C5 | A4:3 r |" +
         " [E7] E5:2 D5 C5 | [D7] D5:2 C5 A4 | [A7] A4 C5 E5 C5 | [E7] B4:2 E5:2" }
];
function pieceById(id){ return PIECES.find(p => p.id === id) || null; }
