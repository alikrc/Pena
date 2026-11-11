// TSM nota arşivi (SymbTr, notalar/): eser dosyasını Parçalar sekmesinin kullandığı yapıya çevirir.
// Perdeler 53 koma cinsindendir (Rast = 0 = yazılı Sol4). Gitarda koma yok: her perde en yakın yarım sese yuvarlanır
// ("komasız"); yazımı (diyez mi bemol mü) perdenin koma değerinden seçilir: doğal sesin altındaysa bemol, üstündeyse diyez.
// Tarayıcıda <script> ile yüklenir (… band → follow → pieces → archive …); Node testleri de aynı kodu kullanır.

// Sol'dan başlayarak doğal seslerin koma ve yarım ses değerleri (Sol La Si Do Re Mi Fa)
const ARCH_NAT = [{ l:4, c:0, s:0 }, { l:5, c:9, s:2 }, { l:6, c:18, s:4 }, { l:0, c:22, s:5 }, { l:1, c:31, s:7 }, { l:2, c:40, s:9 }, { l:3, c:44, s:10 }];
// Koma → { semi (Sol4'ten yarım ses), l (harf 0 Do … 6 Si), a (−1, 0, 1), oct (Sol4'e göre oktav kayması) }
function commaSpell(c){
  const semi = Math.round(c*12/53), o = Math.floor(c/53), r = c - o*53, rs = semi - o*12;
  // Aynı yarım seste doğal ses varsa doğal
  for(const n of ARCH_NAT) if(n.s === rs) return { semi, l: n.l, a: 0 };
  if(rs === 12) return { semi, l: 4, a: 0 };
  // Yoksa TSM yazımındaki yaygın adı: Sol♯/La♭ → La♭ (Zirgüle), Si♭ (Kürdî, Acem), Do♯ (Nim hicaz), Mi♭ (Hisar–Kürdî), Fa♯ (Eviç, Irak)
  return { semi, ...ARCH_BLACK[rs] };
}
const ARCH_BLACK = { 1:{ l:5, a:-1 }, 3:{ l:6, a:-1 }, 6:{ l:0, a:1 }, 8:{ l:2, a:-1 }, 11:{ l:3, a:1 } };
// Eserin oktav kayması: tizi Do6'yı (84) geçiyorsa ve bir oktav pesi gitarda çalınabiliyorsa bir oktav pes yazılır
function archOctave(lo, hi){ return hi > 84 && lo - 12 >= 52 ? -12 : lo < 52 ? 12 : 0; }

// j: eser dosyası { notes: [[koma|null, süre (dörtlük)]], meters: [[nota sırası, pay, payda]], tempo }
// Döner: parsePiece ile aynı yapı (notes, bars, chords: [], num, den, barBeats, chordAt) + koma bilgisi.
// Usul değişirse yeni ölçü o notadan başlar; ölçü çizgisini aşan nota başladığı ölçüde kalır.
function archParse(j){
  const pitched = j.notes.filter(n => n[0] !== null).map(n => 67 + Math.round(n[0]*12/53));
  const shift = pitched.length ? archOctave(Math.min(...pitched), Math.max(...pitched)) : 0;
  const meters = j.meters && j.meters.length ? j.meters : [[0, 4, 4]];
  const notes = [], bars = [];
  let beat = 0, mi = 0, num = meters[0][1], den = meters[0][2], barStart = 0, len = num*4/den;
  const openBar = () => { bars.push({ start: barStart, len: 0, full: false, first: notes.length, num, den }); };
  openBar();
  j.notes.forEach((n, i) => {
    if(mi + 1 < meters.length && meters[mi + 1][0] === i){
      mi++; num = meters[mi][1]; den = meters[mi][2]; len = num*4/den;
      if(beat > barStart + 1e-6){ const b = bars[bars.length-1]; b.len = beat - b.start; barStart = beat; openBar(); }
      else Object.assign(bars[bars.length-1], { num, den });
    }
    while(beat >= barStart + len - 1e-6){ const b = bars[bars.length-1]; b.len = len; b.full = true; barStart += len; openBar(); }
    const d = n[1];
    if(n[0] === null) notes.push({ i: notes.length, beat, dur: d, w: null, bar: bars.length - 1, sp: null });
    else{
      const s = commaSpell(n[0]), w = 67 + s.semi + shift;
      const oct = Math.floor((w - s.a - LETTER_PC[s.l])/12) - 1;
      notes.push({ i: notes.length, beat, dur: d, w, bar: bars.length - 1, c: n[0], sp: { l: s.l, a: s.a, step: oct*7 + s.l - 30 } });
    }
    beat += d;
  });
  const last = bars[bars.length-1];
  last.len = beat - last.start;
  last.full = Math.abs(last.len - last.num*4/last.den) < 1e-6;
  if(last.first >= notes.length) bars.pop();
  bars.forEach(b => { b.full = Math.abs(b.len - b.num*4/b.den) < 1e-6; });
  const n0 = meters[0][1], d0 = meters[0][2];
  return { num: n0, den: d0, barBeats: n0*4/d0, notes, chords: [], bars, errors: [], total: beat, shift, chordAt: () => null };
}
// Donanım tahmini: eserde sık geçen (en az %4) değiştirilmiş seslerden en çok iki bemol (Si♭, Mi♭) ya da iki diyez (Fa♯, Do♯)
function archKey(p){
  const ns = p.notes.filter(n => n.w !== null), cnt = {};
  for(const n of ns) if(n.sp.a) cnt[n.sp.l + ":" + n.sp.a] = (cnt[n.sp.l + ":" + n.sp.a] || 0) + 1;
  const often = k => (cnt[k] || 0) >= Math.max(3, ns.length*0.04);
  const flats = often("6:-1") ? (often("2:-1") ? 2 : 1) : 0, sharps = often("3:1") ? (often("0:1") ? 2 : 1) : 0;
  const fl = (cnt["6:-1"] || 0) + (cnt["2:-1"] || 0), sh = (cnt["3:1"] || 0) + (cnt["0:1"] || 0);
  if(flats && fl >= sh) return flats === 2 ? "Bb" : "F";
  if(sharps) return sharps === 2 ? "D" : "G";
  return "C";
}
// Ortalama koma sapması (yarım sesin kesri): 0 = gitarda birebir, 0,5 = çeyrek seslerle dolu
function archCommaError(p){
  const ns = p.notes.filter(n => n.w !== null);
  return ns.length ? ns.reduce((s, n) => { const x = n.c*12/53; return s + Math.abs(x - Math.round(x)); }, 0)/ns.length : 0;
}
// Eşlik için dem: karar perdesi (eserin son notası) kök, beşlisiyle
function archDrone(p){
  const last = [...p.notes].reverse().find(n => n.w !== null);
  return last ? { root: ((last.w - GUITAR_TRANSPOSE) % 12 + 12) % 12, iv: [0, 7] } : null;
}
