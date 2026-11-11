// Testler: js/core/*.js dosyaları tarayıcıdaki sırayla bir vm bağlamına yüklenir ve oradaki adlar kullanılır.
const fs = require('fs'), path = require('path'), vm = require('vm');
const CORE = ['i18n', 'music', 'guitar', 'chords', 'rhythm', 'songs', 'band', 'follow', 'pieces', 'archive', 'transcribe', 'progress', 'reading', 'ear', 'lessons'];
const ctx = vm.createContext({ console });
for(const f of CORE) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/core', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const core = new Proxy({}, { get: (_, k) => vm.runInContext(String(k), ctx) });
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html');
const { GUITAR_TRANSPOSE: T, INSTRUMENTS, setInstrument, getInstrument, getFrets, TUNINGS, setTuning, getTuning, stringOpen, writtenRange, positionsFor, positionNote,
        analyze, detectPitch, midiToFreq, writtenFreq, describePosition, tabFor,
        setA4, getA4, sensitivityToRms, NoteStabilizer, noteKey, staffPos,
        CHORDS, CHORD_TYPES, CHORD_GROUPS, chordBySymbol, chordPcs, chordStrings, chordBaseFret, chroma, chordCheck, matchChords,
        RHYTHMS, rhythmById, slotDur, rhythmBar, scoreTiming, median, OnsetDetector } = core;
const FRETS = getFrets();

let fail = 0;
const ok = (c,msg,extra='') => { console.log((c?'  OK  ':'  FAIL') + ' ' + msg + (extra?'   '+extra:'')); if(!c) fail++; };

console.log('\n[1] Akortlar ve aralik');
ok(TUNINGS.standart.strings.join()==='40,45,50,55,59,64', 'standart akort: Mi2 La2 Re3 Sol3 Si3 Mi4');
ok(stringOpen(6)===40 && stringOpen(1)===64, '6. tel kalin Mi2, 1. tel ince Mi4');
let r = writtenRange();
ok(r.low===52 && r.high===96, 'standart akortta yazili Mi3 – Do7 (duyulan Mi2 – Do6)', r.low+'–'+r.high);
setTuning('dropd');
ok(stringOpen(6)===38 && writtenRange().low===50, 'Drop D: 6. tel Re2');
let threw=false; try{ setTuning('yok'); }catch(e){ threw=true; }
ok(threw && getTuning()==='dropd', 'bilinmeyen akort reddediliyor');
setTuning('standart');
let tunErr=[];
for(const k in TUNINGS){
  const s = TUNINGS[k].strings;
  if(s.length!==6) tunErr.push(k+': 6 tel degil');
  for(let i=1;i<6;i++) if(s[i]<=s[i-1]) tunErr.push(k+': teller kalindan inceye siralanmamis');
}
ok(tunErr.length===0, 'tum akortlar 6 telli ve kalindan inceye', tunErr.join(' | '));

console.log('\n[2] Sapta konumlar');
const g4 = positionsFor(67);                       // yazili Sol4 = duyulan Sol3
ok(g4[0].string===3 && g4[0].fret===0, 'yazili Sol4: temel konum acik 3. tel');
ok(g4.map(p=>p.string+'/'+p.fret).join(' ')==='3/0 4/5 5/10 6/15', 'Sol4: 3/0, 4/5, 5/10, 6/15', g4.map(p=>p.string+'/'+p.fret).join(' '));
ok(positionsFor(52).length===1 && positionsFor(52)[0].string===6 && positionsFor(52)[0].fret===0, 'en pes Mi3 yalniz acik 6. tel');
ok(positionsFor(96).length===1 && positionsFor(96)[0].string===1 && positionsFor(96)[0].fret===20, 'en tiz Do7 yalniz 1. tel 20. perde');
ok(positionsFor(51).length===0 && positionsFor(97).length===0, 'aralik disi notalarda konum yok');
let posErr=[], total=0;
for(let w=r.low; w<=r.high; w++){
  const ps = positionsFor(w);
  total += ps.length;
  if(!ps.length) posErr.push(w+': konum yok');
  for(const p of ps){
    if(positionNote(p.string,p.fret)!==w) posErr.push(w+': '+p.string+'/'+p.fret+' baska nota');
    if(p.fret<0 || p.fret>FRETS) posErr.push(w+': perde disi');
  }
  for(let i=1;i<ps.length;i++) if(ps[i].fret<ps[i-1].fret) posErr.push(w+': perdeye gore sirali degil');
}
ok(posErr.length===0, `aralikta her nota calinabiliyor, ${total} konumun hepsi dogru nota`, posErr.join(' | '));
ok(total===6*(FRETS+1), 'toplam konum = 6 tel x 21 (acik + 20 perde)');
setTuning('dropd');
ok(positionsFor(50)[0].string===6 && positionsFor(50)[0].fret===0, 'Drop D: yazili Re3 acik 6. tel');
ok(positionsFor(52)[0].fret===2 && positionsFor(52)[0].string===6, 'Drop D: Mi3 6. telde 2. perde');
setTuning('standart');

console.log('\n[3] Frekans -> yazili / duyulan nota ve sent (gitar oktav pes duyulur)');
const cases = [
  [midiToFreq(55), 'G4', 'G3'],             // acik 3. tel
  [midiToFreq(40), 'E3', 'E2'],             // acik 6. tel
  [midiToFreq(45), 'A3', 'A2'],             // acik 5. tel
  [midiToFreq(57), 'A4', 'A3'],
  [midiToFreq(62), 'D5', 'D4'],
];
for(const [f,w,s] of cases){
  const a = analyze(f, T);
  ok(a.writtenName.en===w && a.soundingName.en===s && a.cents===0,
     `${f.toFixed(1)} Hz -> yazili ${w} / duyulan ${s}`, `(gelen: ${a.writtenName.en} / ${a.soundingName.en})`);
}
const sharp = analyze(midiToFreq(55)*Math.pow(2, 23/1200), T);
ok(sharp.written===67 && sharp.cents===23 && Math.abs(sharp.pitch-67.23)<1e-6, 'Sol3 +23 sent: yazili Sol4, +23 sent, pitch 67,23');
ok(analyze(midiToFreq(55)*Math.pow(2, 60/1200), T).written===68, '+60 sent bir ust notaya yuvarlaniyor');
const e2 = analyze(82.41, T);
ok(e2.openString===6 && e2.inRange, '82,41 Hz -> acik 6. tel olarak taniniyor');
ok(analyze(midiToFreq(59), T).openString===2 && analyze(midiToFreq(60), T).openString===null, 'Si3 acik 2. tel; Do4 acik tel degil');
ok(analyze(midiToFreq(37), T).inRange===false, 'Do♯2 standart akortta aralik disi');

console.log('\n[5] Perde bulucu: sentetik tel sesi (tum harmonikler, guclu 2. harmonik, sonumlenen)');
const sr = 48000;
for(const f0 of [73.42, 82.41, 110.0, 146.83, 196.0, 246.94, 329.63, 440.0, 659.26, 880.0, 1046.5]){
  const n = 4096, buf = new Float32Array(n);
  for(let i=0;i<n;i++){
    const t = i/sr, env = Math.exp(-t*3);
    let v = 0;
    for(let k=1;k<=10;k++) v += (k===2 ? 0.9 : 1/k) * Math.sin(2*Math.PI*k*f0*t + k*0.5);
    buf[i] = 0.4*env*v + 0.004*(Math.random()-0.5);
  }
  const d = detectPitch(buf, sr);
  const cents = 1200*Math.log2(d.freq/f0);
  ok(Math.abs(cents) < 5, `${f0} Hz -> ${d.freq.toFixed(2)} Hz`, `(${cents.toFixed(2)} sent, clarity ${d.clarity.toFixed(2)})`);
}

console.log('\n[6] Sessizlik ve gurultu reddi');
const quiet = new Float32Array(4096); for(let i=0;i<4096;i++) quiet[i]=0.0005*(Math.random()-0.5);
ok(detectPitch(quiet, sr).freq === -1, 'sessizlikte nota gostermiyor');
const noise = new Float32Array(4096); for(let i=0;i<4096;i++) noise[i]=0.3*(Math.random()-0.5);
ok(detectPitch(noise, sr).freq === -1, 'beyaz gurultuyu reddediyor');

console.log('\n[7] Nota seridi: tampere frekanslar ve klavye eslemesi');
let stripErr = [];
for(let w=r.low; w<=r.high; w++){
  const a = analyze(writtenFreq(w, T), T);
  if(a.written !== w || a.cents !== 0) stripErr.push(`${w}: geri okumada ${a.written} ${a.cents} sent`);
}
ok(stripErr.length===0, `${r.high-r.low+1} notanin tamami tam tampere yukseklikte geri okunuyor`, stripErr.join(' | '));
ok(Math.abs(writtenFreq(67,T) - 196) < 0.01, 'yazili Sol4 = duyulan Sol3 = 196,00 Hz', writtenFreq(67,T).toFixed(2)+' Hz');
const uiSrc = read('js/app/sap.js').split('const KEYCODES = [')[1];
const codes = uiSrc.split('];')[0].match(/"[^"]+"/g).map(x=>x.slice(1,-1));
const labels = uiSrc.split('const KEYLABEL = [')[1].split('];')[0].match(/"[^"]+"/g).map(x=>x.slice(1,-1));
ok(codes.length===labels.length && codes.length===r.high-r.low+1, `standart akortta ${codes.length} notanin hepsi klavyede`, `${codes.length} kod / ${labels.length} etiket`);
ok(new Set(codes).size===codes.length, 'ayni tus iki notaya baglanmamis');

console.log('\n[8] Talimat ve tab');
const d0 = describePosition({string:3, fret:0});
ok(d0[0].text==='3. tel (Sol teli)' && d0[1].text.includes('açık') && !d0[2].active, 'acik 3. tel: perdeye basma, sol el bosta', JSON.stringify(d0.map(x=>x.text)));
const d3 = describePosition({string:5, fret:3});
ok(d3[1].text==='3. perdeye bas' && d3[2].text.startsWith('yüzük'), '5. tel 3. perde: yuzuk parmagi', JSON.stringify(d3.map(x=>x.text)));
ok(describePosition({string:1, fret:12})[2].text.includes('12. pozisyon'), '12. perde: pozisyon kaydirma');
const tab = tabFor({string:5, fret:3}).split('\n');
ok(tab.length===6 && tab[0].startsWith('e ') && tab[5].startsWith('E ') && tab[4]==='A |--3--|' && tab[0]==='e |-----|', 'tab: ustte e, altta E, 5. telde 3', JSON.stringify(tab));
ok(tabFor({string:1, fret:12}).split('\n')[0]==='e |--12--|', 'iki haneli perde tab\'da hizali');
setTuning('dadgad');
ok(tabFor({string:2, fret:0}).split('\n').map(l=>l.slice(0,2).trim()).join('')==='dAGDAD', 'DADGAD tab etiketleri (ustten 1. tel)');
setTuning('standart');

console.log('\n[9] Diyapazon ayari');
setA4(442);
ok(Math.abs(midiToFreq(69)-442)<1e-9, 'La = 442 Hz');
const r442 = analyze(writtenFreq(67,T), T);
ok(r442.written===67 && r442.cents===0 && analyze(196, T).cents < -5, '442 Hz\'de Sol3 tam; 440 akortlu Sol3 pes gorunuyor');
threw=false; try{ setA4(1000); }catch(e){ threw=true; }
ok(threw && getA4()===442, 'gecersiz diyapazon reddediliyor');
setA4(440);

console.log('\n[10] Hassasiyet ve titreme onleyici');
ok(sensitivityToRms(1) > sensitivityToRms(5) && sensitivityToRms(5) > sensitivityToRms(10), 'hassasiyet arttikca esik dusuyor');
const soft = new Float32Array(4096); for(let i=0;i<4096;i++) soft[i]=0.006*Math.sin(2*Math.PI*196*i/sr);
ok(detectPitch(soft, sr, 60, 1400, sensitivityToRms(1)).freq===-1, 'kisik ses dusuk hassasiyette yok sayiliyor');
ok(Math.abs(detectPitch(soft, sr, 60, 1400, sensitivityToRms(10)).freq-196)<1, 'ayni ses yuksek hassasiyette algilaniyor');
const st = new NoteStabilizer(3);
ok(!st.push('a') && !st.push('a') && st.push('a'), 'yeni nota 3 olcumden sonra kabul ediliyor');
ok(!st.push('b') && st.push('a'), 'tek olcumluk sicrama gosterilen notayi degistirmiyor');
ok(noteKey(analyze(writtenFreq(76,T),T)) !== noteKey(analyze(writtenFreq(75,T),T)), 'komsu notalar farkli anahtar');

console.log('\n[11] Dizekteki yer');
ok(staffPos(64).step===0 && staffPos(77).step===8, 'Mi4 alt cizgi, Fa5 ust cizgi');
let maxStep=-99, minStep=99;
for(const k in TUNINGS){ setTuning(k); const rr=writtenRange();
  for(let w=rr.low; w<=rr.high; w++){ const s=staffPos(w).step; maxStep=Math.max(maxStep,s); minStep=Math.min(minStep,s); } }
setTuning('standart');
ok(minStep===-8 && maxStep===16, 'tum akortlarda aralik -8…16 adim (sabit yukseklikli dizek)', minStep+'…'+maxStep);
ok(staffPos(96).ottava && staffPos(96).step===12, 'Do7 8va ile bir oktav asagi');

console.log('\n[12] Calgi turu: perde sayisi');
ok(getInstrument()==='akustik' && getFrets()===20, 'varsayilan akustik, 20 perde');
setInstrument('klasik');
ok(getFrets()===19 && writtenRange().high===64+19+T && positionsFor(64+20+T).length===0, 'klasik: 19 perde, 20. perde sesi yok');
setInstrument('elektro24');
ok(getFrets()===24 && writtenRange().high===100 && positionsFor(100)[0].fret===24, 'elektro 24 perde: en tiz Mi6 (yazili Mi7), 1. tel 24. perde');
ok(positionsFor(67).length===4 && positionsFor(76).length===6, 'elektro 24: yazili Mi5 (duyulan Mi4) 6 telin hepsinde var');
let maxS=-99; for(let w=writtenRange().low; w<=writtenRange().high; w++) maxS=Math.max(maxS, staffPos(w).step);
ok(maxS<=16, '24 perdede de dizek yuksekligi yetiyor', String(maxS));
threw=false; try{ setInstrument('bas'); }catch(e){ threw=true; }
ok(threw && getInstrument()==='elektro24', 'bilinmeyen calgi reddediliyor');
ok(Object.keys(INSTRUMENTS).every(k=>{ setInstrument(k); return positionsFor(52).length===1; }), 'her calgida en pes Mi3 calinabiliyor');
setInstrument('akustik');

console.log('\n[13] Akor sekilleri (standart akort): her sekil gercekten o akoru veriyor mu');
let chordErr=[];
for(const c of CHORDS){
  const s = chordStrings(c).filter(r=>!r.muted), pcs = chordPcs(c), omit = CHORD_TYPES[c.type].omit;
  if(c.frets.length!==6 || c.fingers.length!==6) chordErr.push(c.symbol+': 6 tel degil');
  for(const r of s) if(!pcs.includes(r.midi%12)) chordErr.push(c.symbol+': '+r.string+'. tel akorda olmayan ses');
  CHORD_TYPES[c.type].iv.forEach((iv,i)=>{ if(iv!==omit && !s.some(r=>r.midi%12===pcs[i])) chordErr.push(c.symbol+': '+iv+' eksik'); });
  if(s[0].midi%12 !== c.root) chordErr.push(c.symbol+': en pes ses kok degil');
  c.frets.forEach((f,i)=>{ if((f>0) !== (c.fingers[i]>0)) chordErr.push(c.symbol+': '+(6-i)+'. telde perde/parmak uyumsuz'); });
  if(c.barre){ const b=c.barre; for(let st=b.to; st<=b.from; st++){ const f=c.frets[6-st]; if(f>=0 && f<b.fret) chordErr.push(c.symbol+': barre altinda daha pes perde'); } }
  for(let i=1;i<s.length;i++) if(s[i].midi%12===s[i-1].midi%12) chordErr.push(c.symbol+': komsu iki tel ayni ses (tel tel kontrol ayirt edemez)');
  if(c.group<0 || c.group>=CHORD_GROUPS.length) chordErr.push(c.symbol+': grup yok');
}
ok(chordErr.length===0, `${CHORDS.length} akorun hepsi dogru seslerden olusuyor, en pes ses kok`, chordErr.join(' | '));
ok(new Set(CHORDS.map(c=>c.symbol)).size===CHORDS.length, 'akor sembolleri tekil');
const am = chordBySymbol('Am');
ok(am.frets.join()==='-1,0,2,2,1,0' && am.name==='La minör', 'Am = x02210, La minor');
ok(chordStrings(am).map(r=>r.muted?'x':r.role).join('|')==='x|kök|beşli|kök|küçük üçlü|beşli', 'Am tel gorevleri: kok, besli, kok, kucuk uclu, besli');
ok(chordBySymbol('C').frets.join()==='-1,3,2,0,1,0' && chordBySymbol('G').frets.join()==='3,2,0,0,0,3' && chordBySymbol('D').frets.join()==='-1,-1,0,2,3,2',
   'C x32010, G 320003, D xx0232 (Wikipedia: Guitar chord)');
ok(chordBaseFret(chordBySymbol('F'))===1 && chordBaseFret(chordBySymbol('Gm'))===3 && chordBaseFret(chordBySymbol('Cm'))===3, 'kutu semasi: F 1. perdeden, Gm ve Cm 3. perdeden');

console.log('\n[14] Akor dinleme (kromagram): sentetik tel sesleriyle');
function strum(sym, extraMidi){
  const n = 8192, buf = new Float32Array(n);
  const notes = chordStrings(chordBySymbol(sym)).filter(r=>!r.muted).map(r=>r.midi);
  if(extraMidi) notes.push(extraMidi);
  notes.forEach((m, j) => {
    const f0 = midiToFreq(m);
    for(let i=0;i<n;i++){
      const t = i/sr; let v = 0;
      for(let k=1;k<=8;k++) v += Math.sin(2*Math.PI*k*f0*t + j + k) / Math.pow(k, 1.2);
      buf[i] += 0.08*v;
    }
  });
  for(let i=0;i<n;i++) buf[i] += 0.003*(Math.random()-0.5);
  return chroma(buf, sr);
}
let chkErr=[];
for(const sym of ['Am','C','G','D','E','Em','Dm','A','F','E7','Bm','Cmaj7']){
  const ch = strum(sym), res = chordCheck(ch, chordBySymbol(sym)), best = matchChords(ch)[0].chord.symbol;
  if(!res.ok) chkErr.push(sym+': kontrol gecmedi (eksik '+res.tones.filter(t=>!t.heard&&!t.optional).map(t=>t.pc)+', fazla '+res.extra+')');
  if(best!==sym) chkErr.push(sym+': en benzer '+best);
}
ok(chkErr.length===0, '12 akor kendi seklinden calininca dogru taniniyor', chkErr.join(' | '));
const wrong = chordCheck(strum('C'), am);
ok(!wrong.ok && wrong.tones.find(t=>t.pc===9).heard===false, 'C calinip Am kontrol edilince eksik La bulunuyor');
const extra = chordCheck(strum('Am', 54+12), am);                    // Am + akorda olmayan Fa♯4
ok(!extra.ok && extra.extra.includes(6), 'akorda olmayan ses (Fa♯) fazla diye bildiriliyor', JSON.stringify(extra.extra));
ok(matchChords(strum('Em'))[0].chord.symbol!=='E' && matchChords(strum('E'))[0].chord.symbol!=='Em', 'majör ve minör birbirine karismiyor');

console.log('\n[15] Ritim kaliplari ve zamanlama');
let rhyErr=[];
for(const r of RHYTHMS){
  if(!/^[DU-]+$/.test(r.slots)) rhyErr.push(r.id+': gecersiz hucre');
  if(r.counts.length!==r.slots.length) rhyErr.push(r.id+': sayim uzunlugu');
  if(r.beats[0]!==0 || r.beats.some(b=>b>=r.slots.length)) rhyErr.push(r.id+': metronom vuruslari');
  if(r.slots[0]!=='D' || r.accents[0]!==2) rhyErr.push(r.id+': olcu kuvvetli asagi vurusla baslamiyor');
  for(const k in r.accents) if(r.slots[k]==='-') rhyErr.push(r.id+': bos hucrede vurgu');
}
ok(rhyErr.length===0, `${RHYTHMS.length} kalibin hepsi tutarli`, rhyErr.join(' | '));
ok(rhythmById('aksak').slots.length===9 && rhythmById('turkaksagi').slots.length===5, 'Aksak 9 zaman (2+2+2+3), Turk aksagi 5 zaman (2+3)');
ok(rhythmById('pop').slots==='D-DU-UDU', 'pop kalibi: asagi, asagi-yukari, yukari-asagi-yukari');
ok(Math.abs(slotDur(120)-0.25)<1e-12, '120 BPM: sekizlik 250 ms');
const bar = rhythmBar(rhythmById('pop'), 120, 10);
ok(bar.length===6 && bar[0].t===10 && bar[1].t===10.5 && bar[1].dir==='down' && bar[2].dir==='up' && Math.abs(bar[3].t-11.25)<1e-9,
   'pop olcusunun vurus zamanlari ve yonleri', JSON.stringify(bar.map(b=>b.t+b.dir[0])));
const sc = scoreTiming(bar, [10.01, 10.47, 10.82, 11.25, 11.5, 11.9], 0.25, 0.04);
ok(sc.hits.map(h=>h.verdict).join()==='ok,ok,late,ok,ok,miss' && sc.extra===1, 'erken/gec/kacan/fazla vurus siniflaniyor',
   JSON.stringify(sc.hits.map(h=>h.verdict))+' fazla '+sc.extra);
ok(median([5,1,100,3,2])===3 && median([1,2,3,4])===2.5, 'ortanca');

console.log('\n[16] Mikrofondan vurus yakalama: sentetik tel vuruslari + metronom tiki');
// Gercege yakin sentetik vurus: tel yeniden calininca onceki titresimi biter; yukari vurus yalniz ince 4 tel;
// pena/tirnak kisa bir surtunme gurultusu cikarir. Metronom tiki tarayicidaki gibi 25 ms Hann pencereli 4 kHz.
// Sabit tohumlu gurultu: test her calistirmada ayni sonucu versin (sonuc rastgele gurultuye baglanmasin)
let seed = 12345;
const rand = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
function strumSignal(events, dur, sym, clicks=[]){
  const n = Math.round(dur*sr), buf = new Float32Array(n);
  const strs = chordStrings(chordBySymbol(sym)).filter(r => !r.muted), voices = [];
  events.forEach(([t0, amp, dir]) => {
    const list = dir === 'up' ? strs.slice(-4).reverse() : strs;
    list.forEach((r, j) => voices.push({ s: r.string, f: midiToFreq(r.midi), t: t0 + j*(dir==='up'?0.006:0.009), amp }));
  });
  voices.sort((a, b) => a.t - b.t);
  voices.forEach((v, k) => {
    const next = voices.slice(k+1).find(w => w.s === v.s);
    const s0 = Math.round(v.t*sr), s1 = Math.min(n, next ? Math.round(next.t*sr) : n);
    for(let i = s0; i < s1; i++){
      const t = (i-s0)/sr, env = v.amp*Math.min(1, t/0.002)*Math.exp(-t*2.5);
      buf[i] += 0.05*env*(Math.sin(2*Math.PI*v.f*t) + 0.5*Math.sin(4*Math.PI*v.f*t) + 0.25*Math.sin(6*Math.PI*v.f*t));
    }
    for(let i = s0; i < Math.min(n, s0 + 0.004*sr); i++) buf[i] += 0.02*v.amp*(rand()-0.5)*Math.exp(-(i-s0)/sr/0.0015);
  });
  clicks.forEach(t0 => { const s0 = Math.round(t0*sr), L = Math.round(0.025*sr);
    for(let i = 0; i < L && s0+i < n; i++) buf[s0+i] += 0.5*(0.5 - 0.5*Math.cos(2*Math.PI*i/L))*Math.sin(2*Math.PI*4000*i/sr); });
  for(let i = 0; i < n; i++) buf[i] += 0.002*(rand()-0.5);
  return buf;
}
function detectAll(buf){
  const d = new OnsetDetector(sr), out = [];
  for(let i = 0; i < buf.length; i += 800) out.push(...d.push(buf.subarray(i, i+800), i/sr));   // parca parca, tarayicidaki gibi
  return out;
}
let tot = 0, got = 0, extraOn = 0, worst = 0, offSum = 0;
for(const sym of ['G','Am','E']) for(const bpm of [70, 110, 150]) for(const { id } of RHYTHMS){
  const r = rhythmById(id), dt = slotDur(bpm), ev = [], clicks = [];
  for(let b = 0; b < 2; b++){
    rhythmBar(r, bpm, 0.5 + b*r.slots.length*dt).forEach(e => ev.push([e.t, e.dir==='down' ? 1 : 0.5, e.dir]));
    r.beats.forEach(k => clicks.push(0.5 + (b*r.slots.length + k)*dt));
  }
  const f = detectAll(strumSignal(ev, 0.5 + 2*r.slots.length*dt + 1, sym, clicks));
  const sc = scoreTiming(ev.map(([t]) => ({ t })), f, dt, 0.02);
  for(const h of sc.hits){ tot++; if(h.offset !== null){ got++; worst = Math.max(worst, Math.abs(h.offset)); offSum += h.offset; } }
  extraOn += sc.extra;
}
ok(got === tot && extraOn === 0 && worst < 0.025, `${tot} vurusun hepsi 25 ms icinde yakalandi (3 akor x 3 tempo x ${RHYTHMS.length} kalip, tikli), fazla vurus yok`,
   `${got}/${tot}, fazla ${extraOn}, en buyuk sapma ${(worst*1000).toFixed(1)} ms, ortalama ${(offSum/got*1000).toFixed(1)} ms`);
const ck = []; for(let i = 0; i < 12; i++) ck.push(0.3 + i*0.4);
ok(detectAll(strumSignal([], 5.5, 'G', ck)).length === 0, 'yalniz metronom tiki vurus sayilmiyor');
const tooQuiet = strumSignal([[0.5, 0.02, 'down'], [1.0, 0.02, 'down']], 2, 'G');
ok(detectAll(tooQuiet).length === 0, 'esigin altindaki cok kisik ses vurus sayilmiyor');

console.log('\n[17] Ezgi icin parmak plani');
const { planFingering, tunerReading, normalizeSymbol, soundingSymbol, ChangeCounter, parseSong, SONGS, parseMelody, MELODIES,
        parseNoteName, earQuestion, EAR_MODES, makeRng, LESSONS, goalMet, lessonStatus, lessonCompletedBy } = core;
const ode = parseMelody(MELODIES.find(m=>m.id==='nese').text).notes.map(n=>n.written);
const odePlan = planFingering(ode);
ok(odePlan.every(p => p.pos===1), 'Neseye Ovgu tamamen 1. pozisyonda');
ok(odePlan.slice(0,9).map(p=>p.string+'/'+p.fret+'/'+p.finger).join(' ')==='4/2/2 4/2/2 4/3/3 3/0/0 3/0/0 4/3/3 4/2/2 4/0/0 5/3/3',
   'Mi4 Mi4 Fa4 Sol4 Sol4 Fa4 Mi4 Re4 Do4: 4. tel 2 (orta), 3 (yuzuk), acik Sol, acik Re, 5. tel 3 (yuzuk)', odePlan.slice(0,9).map(p=>p.string+'/'+p.fret+'/'+p.finger).join(' '));
let planErr = [];
for(const m of MELODIES){
  const ns = parseMelody(m.text).notes.map(n=>n.written), pl = planFingering(ns);
  pl.forEach((p,i) => {
    if(p.string===null) planErr.push(m.id+' '+i+': calinamadi');
    else if(positionNote(p.string,p.fret)!==ns[i]) planErr.push(m.id+' '+i+': yanlis nota');
    else if(p.fret>0 && (p.finger<1 || p.finger>4 || p.fret!==p.pos+p.finger-1)) planErr.push(m.id+' '+i+': parmak/pozisyon tutarsiz');
  });
}
ok(planErr.length===0, 'butun hazir ezgilerin plani tutarli (dogru nota, parmak = perde - pozisyon + 1)', planErr.join(' | '));
const high = planFingering([76, 77, 79, 81, 83, 84]);       // yazili Mi5'ten Do6'ya: 1. pozisyon disina cikar
ok(high.every(p => p.fret===0 || (p.finger>=1 && p.finger<=4)) && new Set(high.filter(p=>p.fret>0).map(p=>p.pos)).size===1,
   'tiz dizi tek pozisyonda, her perdeye bir parmak', high.map(p=>p.string+'/'+p.fret+'f'+p.finger+'p'+p.pos).join(' '));
ok(describePosition({string:1, fret:7})[2].text.includes('serçe'), 'tek notada 5. perde ustu: isaret ya da serce secenegi yaziliyor');

console.log('\n[18] Akort olcumu');
const tr6 = tunerReading(midiToFreq(40) * Math.pow(2, -20/1200));
ok(tr6.string===6 && tr6.cents===-20 && tr6.advice==='sık', '6. tel 20 sent pes: sik', JSON.stringify(tr6));
const tr2 = tunerReading(midiToFreq(59) * Math.pow(2, 4/1200));
ok(tr2.string===2 && tr2.advice==='tamam', '2. tel +4 sent: tamam', JSON.stringify(tr2));
ok(tunerReading(midiToFreq(45)*1.02, 5).advice==='gevşet', 'secili telde tiz: gevset');
setTuning('dropd'); ok(tunerReading(midiToFreq(38)).string===6, 'Drop D: Re2 6. tel'); setTuning('standart');

console.log('\n[19] Akor yazimi, capo, akor degistirme sayaci');
ok(normalizeSymbol('F#m')==='F♯m' && normalizeSymbol('bb')==='B♭' && chordBySymbol('A#')?.symbol==='B♭' && chordBySymbol('Gb')?.symbol==='F♯' && chordBySymbol('G#')===null,
   'klavye yazimi ve enharmonik (A# = B♭, G♭ = F♯; G♯ majör akoru yok)');
const gCh = chordBySymbol('G');
ok(soundingSymbol(gCh, 2)==='A' && chordStrings(gCh, 2)[0].midi===45 && chordPcs(gCh, 2).join()==='9,1,4', 'capo 2: G sekli A olarak duyulur');
ok(chordCheck(strum('A'), gCh, 2).ok && !chordCheck(strum('A'), gCh, 0).ok, 'capo hesaba katilarak akor kontrolu');
const cc = new ChangeCounter(chordBySymbol('Em'), chordBySymbol('Am'));
const emF = strum('Em'), amF = strum('Am'), cF = strum('C');
const seq = [emF, emF, emF, null, amF, amF, emF, emF, amF, emF, emF, cF, cF, amF, amF];
seq.forEach(f => cc.push(f));
ok(cc.changes===3, 'Em→Am→Em→Am: 3 gecis (tek karelik Am ve araya giren C sayilmaz)', 'sayilan '+cc.changes);

console.log('\n[20] Sarkilar ve ezgiler');
const ag = parseSong(SONGS.find(s=>s.id==='amazing-grace').text);
ok(ag.errors.length===0 && ag.bars.length===16 && ag.bars.slice(0,5).join()==='G,G,C,G,G', 'Amazing Grace: 16 olcu, G G C G G …', ag.bars.join(','));
const pick = parseSong('A[G*2]mazing grace');
ok(pick.lines[0][0].lyric==='A' && pick.lines[0][1].chord==='G' && pick.lines[0][1].bar===0 && pick.lines[0][1].lyric.startsWith('mazing'), 'on vurus sozu akorsuz parca');
ok(SONGS.filter(s => s.group!=='ex').every(s => s.lyricsNote && !/[a-zçğıöşü]{3,}/i.test(s.text.replace(/\[[^\]]*\]/g,'').replace(/(Giriş|Kıta|Nakarat|Ön nakarat|Köprü|Ara|Bitiş|Solo|bölüm|satır)/g,''))),
   'hazir sarkilarda soz yok, her birinde soz notu var');
ok(SONGS.filter(s => s.group==='tr').every(s => s.lyricsNote.includes('telif')), 'Turkce pop/rock sarkilarda “telifli oldugu icin” notu');
const { mergeLyrics } = core;
const merged = mergeLyrics('Kıta: [Am] [Dm]\n[G*2]\nNakarat: [C]', 'bir iki uc dort\nbes alti\nyedi\nsekiz');
ok(merged === 'Kıta: [Am]bir iki [Dm]uc dort\n[G*2]bes alti\nNakarat: [C]yedi\nsekiz', 'sozler akor satirlarina dagitiliyor, etiket korunuyor, artan satir sona ekleniyor', JSON.stringify(merged));
ok(parseSong(merged).bars.join()==='Am,Dm,G,G,C', 'eslesmis metin ayni olculeri veriyor');
ok(mergeLyrics('[Am] [F] [C] [G]', 'tek') === '[Am][F][C][G]tek' && mergeLyrics('[Am]\n[F]', 'x') === '[Am]x\n[F]', 'sozcukten cok akor ve sozun bitmesi');
let songErr = [];
for(const s of SONGS){ const p = parseSong(s.text); if(p.errors.length || !p.bars.length || !rhythmById(s.rhythm)) songErr.push(s.id); }
ok(songErr.length===0, 'butun hazir sarkilar ayristiriliyor, akorlari ve ritimleri var', songErr.join(','));
const bad = parseSong('[F#m]bir [Xyz]iki [Bb*3]uc');
ok(bad.errors.join()==='Xyz' && bad.bars.join()==='F♯m,B♭,B♭,B♭', 'taninmayan akor hata, klavye yazimi ve *3 calisiyor');
ok(parseNoteName('Mi4')===64 && parseNoteName('Fa#4')===66 && parseNoteName('Sib3')===58 && parseNoteName('sol3')===55 && parseNoteName('Xx4')===null, 'nota adi ayristirma');
const pm = parseMelody('Do4 Re4:2 Mi4:0,5 Foo4');
ok(pm.notes.length===3 && pm.notes[1].beats===2 && pm.notes[2].beats===0.5 && pm.errors.join()==='Foo4', 'ezgi metni: sure ve hata');
ok(MELODIES.every(m => parseMelody(m.text).errors.length===0), 'butun hazir ezgiler hatasiz');

console.log('\n[21] Kulak egitimi');
const rng = makeRng(42), seen = {};
let earErr = [];
for(const mode in EAR_MODES) for(let i=0;i<200;i++){
  const q = earQuestion(mode, rng);
  seen[mode+':'+q.answer] = 1;
  if(!EAR_MODES[mode].answers.some(a=>a[0]===q.answer)) earErr.push(mode+' gecersiz cevap');
  if(mode.startsWith('kalite') && q.notes.join() !== CHORD_TYPES[q.answer].iv.map(v=>q.notes[0]+v).join()) earErr.push(mode+' akor sesleri');
  if(mode==='aralik' && q.notes[1]-q.notes[0]!==q.answer) earErr.push('aralik');
  if(mode==='tel' && q.notes[0]!==TUNINGS.standart.strings[6-q.answer]) earErr.push('tel');
}
ok(earErr.length===0, 'sorular dogru sesleri ve cevabi uretiyor', earErr.slice(0,3).join(','));
ok(Object.keys(EAR_MODES).every(m => EAR_MODES[m].answers.every(a => seen[m+':'+a[0]])), '200 soruda her cevap en az bir kez cikiyor');

console.log('\n[22] Dersler');
ok(new Set(LESSONS.map(l=>l.id)).size===LESSONS.length, 'ders kimlikleri tekil');
let lesErr = [];
for(const l of LESSONS){
  const g = l.goal;
  if(g.type==='chord' && !chordBySymbol(g.chord)) lesErr.push(l.id+': akor yok');
  if(g.type==='rhythm' && !rhythmById(g.id)) lesErr.push(l.id+': ritim yok');
  if(g.type==='changes' && !g.pair.every(chordBySymbol)) lesErr.push(l.id+': akor yok');
  if(g.type==='ear' && !EAR_MODES[g.mode]) lesErr.push(l.id+': kulak modu yok');
  if(g.type==='melody' && !MELODIES.some(m=>m.id===g.id)) lesErr.push(l.id+': ezgi yok');
  if(g.type==='song' && !SONGS.some(s=>s.id===g.id)) lesErr.push(l.id+': sarki yok');
  if(g.type==='song'){ const song = parseSong(SONGS.find(s=>s.id===g.id).text);
    const learned = LESSONS.slice(0, LESSONS.indexOf(l)).filter(x=>x.goal.type==='chord').map(x=>x.goal.chord);
    if(!song.bars.every(b => learned.includes(b))) lesErr.push(l.id+': sarkida henuz ogretilmemis akor'); }
}
ok(lesErr.length===0, 'her dersin hedefi var olan icerige bagli; sarki dersi yalniz ogretilmis akorlari kullaniyor', lesErr.join(' | '));
ok(lessonStatus({}).join()===['open', ...LESSONS.slice(1).map(()=>'locked')].join(), 'basta yalniz ilk ders acik');
ok(lessonStatus({akort:true})[1]==='open' && lessonStatus({akort:true})[2]==='locked', 'ders bitince sonraki acilir');
ok(lessonCompletedBy({}, {type:'tuned'})==='akort' && lessonCompletedBy({}, {type:'chordClean', chord:'Em'})===null, 'yalniz acik ders tamamlanir');
ok(goalMet({type:'rhythm', id:'pop', bpm:70, pct:80}, {type:'rhythm', id:'pop', bpm:75, pct:85, bars:4}) &&
   !goalMet({type:'rhythm', id:'pop', bpm:70, pct:80}, {type:'rhythm', id:'pop', bpm:65, pct:95, bars:4}) &&
   goalMet({type:'changes', pair:['Em','Am'], min:15}, {type:'changes', pair:['Am','Em'], perMin:16}), 'hedef karsilastirma (tempo alti gecmez, cift sirasi onemsiz)');

console.log('\n[22b] Metronom: dokunarak tempo');
const { tapTempo } = core;
ok(tapTempo([0,500,1000,1500])===120 && tapTempo([0,500,1000,1700,2200])===120, 'esit dokunus 120 BPM; tek kacan dokunus ortancayi bozmuyor');
ok(tapTempo([0])===null && tapTempo([0,500,5000,5600])===100, 'tek dokunus tempo vermez; 2 sn ara yeni dizi baslatir');

console.log('\n[24] Eslik grubu kaliplari');
const { GROOVES, grooveById, grooveBar, bassMidi, chordMidis, RHYTHM_GROOVE, pieceBandEvents } = core;
let grErr = [];
for(const g of GROOVES){
  const lanes = g.darbuka ? [g.darbuka, g.fill] : [g.kick, g.snare, g.hat, g.fillSnare];
  for(const s of [...lanes, g.bass, g.chord]) if(s !== undefined && s.length !== g.cells) grErr.push(g.id + ': dizi uzunlugu');
  const [n, d] = g.meter.split('/').map(Number);
  if(Math.abs(n*4/d - g.beats) > 1e-9) grErr.push(g.id + ': olcu suresi');
  if(!/^[13568.]+$/.test(g.bass)) grErr.push(g.id + ': bas');
}
ok(grErr.length === 0 && GROOVES.length >= 15, GROOVES.length + ' kalip: dizi uzunluklari ve olcu sureleri tutarli', grErr.join(' | '));
ok(Object.entries(RHYTHM_GROOVE).every(([r, g]) => rhythmById(r) && grooveById(g) && Math.abs(rhythmById(r).slots.length/2 - grooveById(g).beats) < 1e-9),
   'her vurus kalibinin grup kalibi ayni olcu suresinde');
ok(bassMidi('Am') === 33 && bassMidi('E') === 28 && bassMidi('Am', '5') === 28 && bassMidi('C', '8') === 48 && bassMidi('Xm') === null,
   'bas: La1 kok, Mi1 kok, La minorun beslisi Mi1, oktav');
let bassOk = true;
for(const c of CHORDS) for(const k of ['1','3','5','6']){ const m = bassMidi(c, k); if(!(m >= 28 && m <= 39)) bassOk = false; }
ok(bassOk, 'bas notalari Mi1–Re#2 arasinda (duyulan Mi2 altinda: mikrofona sizsa da nota sanilmaz)');
ok(chordMidis('Am').join() === '57,60,64' && chordMidis('G7').length === 4, 'akor vurusu: Am = La3 Do4 Mi4', chordMidis('Am').join());
const rk = grooveBar(grooveById('rock'), 0, () => 'Am');
ok(rk.filter(e => e.k === 'S').map(e => e.b).join() === '1,3' && rk.filter(e => e.part === 'bass')[0].m === 33, 'rock: trampet 2 ve 4te, bas La');
const swb = grooveBar(grooveById('pop'), 0, b => b < 2 ? 'C' : 'G').filter(e => e.part === 'bass');
ok(swb.some(e => e.b === 2 && e.m === bassMidi('G')), 'olcu ortasinda akor degisince bas yeni koku caliyor');
ok(grooveBar(grooveById('rock'), 3, () => 'C').filter(e => e.k === 'S').length > grooveBar(grooveById('rock'), 0, () => 'C').filter(e => e.k === 'S').length,
   'cumlenin 4. olcusu dolgu');
ok(grooveBar(grooveById('karsilama'), 0, () => 'A', { drum:false, chord:false }).every(e => e.part === 'bass'), 'partiler kapatilabiliyor');

console.log('\n[25] Parcalar: nota yazimi ve hazir parcalar');
const { PIECES, parsePiece, pieceTargets, KEY_SIG } = core;
let pz = parsePiece('C5:0.5 D5:0.5 | [Am] E5 r:1 F#5:2 | [G] G5:4', '4/4');
ok(pz.errors.length === 0 && pz.bars.length === 3 && !pz.bars[0].full && pz.bars[1].full && pz.notes[3].w === null && pz.notes[4].w === 78,
   'on vuruslu, suslu, diyezli parca ayristiriliyor', pz.errors.join(','));
ok(pz.chordAt(0) === null && pz.chordAt(1) === 'Am' && pz.chordAt(3.5) === 'Am' && pz.chordAt(5) === 'G', 'chordAt: akor yazildigi vurustan itibaren');
ok(parsePiece('C5 C5 | C5 C5 C5 | C5 C5 C5 C5', '4/4').errors.length === 1 && parsePiece('C5:3.5 | C5:4', '4/4').errors.length === 1 &&
   parsePiece('[Xm] C5:4', '4/4').errors.length === 1, 'eksik ara olcu, gecersiz sure ve bilinmeyen akor hata');
ok(pieceTargets(pz).length === 5, 'takip edilen notalar suslari icermiyor');
const pzErr = [];
for(const p of PIECES){
  const r = parsePiece(p.text, p.meter), g = grooveById(p.groove);
  if(r.errors.length) pzErr.push(p.id + ': ' + r.errors.join(','));
  if(!g || Math.abs(g.beats - r.barBeats) > 1e-9) pzErr.push(p.id + ': kalip olcusu');
  if(!(p.key in KEY_SIG)) pzErr.push(p.id + ': donanim');
  if(!r.chords.length) pzErr.push(p.id + ': akor yok');
  for(const n of r.notes) if(n.w !== null && !(n.w >= 52 && n.w <= 84)) pzErr.push(p.id + ': aralik disi ' + n.w);
  if(!['west','tr','etude'].includes(p.group) || !p.title || !p.by) pzErr.push(p.id + ': bilgi');
  if(g && pieceBandEvents(r, g).length < r.bars.filter(b => b.full).length) pzErr.push(p.id + ': eslik');
}
ok(pzErr.length === 0 && PIECES.length >= 15, PIECES.length + ' parcanin olculeri, akorlari, kaliplari ve notalari gecerli', pzErr.join(' | '));
ok(new Set(PIECES.map(p => p.id)).size === PIECES.length && ['west','tr','etude'].every(g => PIECES.some(p => p.group === g)), 'kimlikler tekil; Bati, Turkce ve etut gruplari var');

console.log('\n[26] Seni izleyen eslik: tempo haritasi ve takipci');
const { TempoMap, ScoreFollower, followWait, playSummary } = core;
let mp = new TempoMap(500, 0, 0);
for(let b = 0; b <= 8; b++) mp.observe(b*600, b);
ok(Math.abs(mp.beatMs - 600) < 30 && mp.pct() < 90, 'yavas calinca tempo haritasi yavasliyor', Math.round(mp.beatMs) + ' ms, %' + mp.pct());
const tg = [{ i:0, beat:0, w:72 }, { i:1, beat:1, w:74 }, { i:2, beat:2, w:76 }, { i:3, beat:3, w:77 }];
let sf = new ScoreFollower(tg), m0 = new TempoMap(500, 0, 0);
const r1 = sf.push({ t:0, w:72 }, m0), r2 = sf.push({ t:510, w:74 }, m0), r3 = sf.push({ t:1000, w:70 }, m0), r4 = sf.push({ t:1500, w:89 }, m0);
ok(r1.ok && r2.ok && r3 && !r3.ok && r3.j === 2 && r4 && r4.ok && r4.j === 3, 'dogru, dogru, zamaninda yanlis perde, oktav kaymis dogru');
sf = new ScoreFollower(tg); sf.push({ t:0, w:72 }, m0);
ok(sf.push({ t:1000, w:76 }, m0).skip === 1, 'atlanan nota sayiliyor');
sf = new ScoreFollower(tg); sf.push({ t:0, w:72 }, m0);
ok(sf.skipPast(1900, m0).join() === '1,2' && sf.k === 3, 'sabit tempoda zamani gecen notalar kacirildi sayiliyor');
ok(followWait(500) === 550 && followWait(1000) === 850, 'bekleme esigi');
const sm = playSummary([{ ok:true, off:20 }, { ok:true, off:200 }, { ok:false, off:0 }, null], 90);
ok(sm.pct === 50 && sm.timePct === 25 && sm.missed === 1 && sm.wrong === 1, 'calis ozeti: dogru nota ve zamaninda yuzdesi');

console.log('\n[27] TSM nota arsivi (komasiz gitar)');
const { commaSpell, archParse, archCommaError, archDrone, autoGroove } = core;
ok(commaSpell(0).semi === 0 && commaSpell(0).a === 0 && commaSpell(9).l === 5 && commaSpell(22).l === 0, 'Rast Sol, Dugah La, Cargah Do');
ok(commaSpell(13).semi === 3 && commaSpell(13).a === -1 && commaSpell(13).l === 6, 'Kurdi (13 koma) = Si bemol');
ok(commaSpell(17).semi === 4 && commaSpell(17).a === 0, 'Segah (17 koma) gitarda Si');
ok(commaSpell(49).a === 1 && commaSpell(49).l === 3 && commaSpell(-4).semi === -1, 'Eviç Fa diyez, Irak Fa diyez');
const ARCH_DIR = path.join(__dirname, 'notalar');
const aidx = JSON.parse(fs.readFileSync(path.join(ARCH_DIR, 'index.json'), 'utf8'));
ok(aidx.pieces.length > 1000 && /CC BY-NC-SA/.test(aidx.source) && aidx.pieces.filter(x => x.pop).length >= 20, aidx.pieces.length + ' eser, kaynak ve lisans yazili, populer liste');
let arErr = [];
for(const x of aidx.pieces){
  const j = JSON.parse(fs.readFileSync(path.join(ARCH_DIR, x.id + '.json'), 'utf8'));
  if(j.notes.some(n => n.length > 2)) arErr.push(x.id + ': hece/susleme kalmis');
  const p = archParse(j);
  const ws = p.notes.filter(n => n.w !== null).map(n => n.w);
  if(Math.min(...ws) < 52 || Math.max(...ws) > 96) arErr.push(x.id + ': gitar araligi disi');
  const tot = p.bars.reduce((s, b) => s + b.len, 0);
  if(Math.abs(tot - p.total) > 1e-6 || p.bars.some(b => b.first > p.notes.length)) arErr.push(x.id + ': olcu');
  if(p.notes.some(n => n.w !== null && (n.sp.step < -12 || n.sp.step > 24))) arErr.push(x.id + ': dizek yeri');
  if(!autoGroove(p.num, p.den)) arErr.push(x.id + ': usul kalibi');
  if(arErr.length > 5) break;
}
ok(arErr.length === 0, 'butun arsiv eserleri ayristiriliyor: gitar araliginda, olculer tutarli, sozsuz', arErr.join(' | '));
const usk = archParse(JSON.parse(fs.readFileSync(path.join(ARCH_DIR, 'nihavent--turku--nimsofyan--uskudara_gider--.json'), 'utf8')));
ok(usk.bars.filter(b => b.full).length > 8 && archCommaError(usk) < 0.1 && archDrone(usk).iv.join() === '0,7', 'Uskudar\'a Gider Iken: tam olculer, az koma, karar demi');
ok(['5/8','9/8','7/8','10/8','28/8'].every(m => { const [n, d] = m.split('/').map(Number), g = autoGroove(n, d);
  return g.darbuka.length === g.cells && g.bass.length === g.cells && Math.abs(g.beats - n*4/d) < 1e-9 && g.darbuka[0] === 'D'; }), 'olcuden uretilen usul kaliplari');
ok(grooveById('auto:9/8').beats === 4.5 && grooveBar(autoGroove(9, 8), 0, () => archDrone(usk)).some(e => e.part === 'bass'), 'auto: kalibi ve demle bas');


console.log('\n[28] Kulaktan cikar: yavaslatma ve notaya dokme');
const { wsola, stretchShiftGen, runGen, pitchTraceGen, traceNotes, notesToPiece } = core;
const SR = 22050, sine = (f, sec) => Float32Array.from({ length: Math.round(SR*sec) }, (_, i) => 0.3*Math.sin(2*Math.PI*f*i/SR));
const x220 = sine(220, 1), slow = wsola(x220, 0.5, SR);
const fSlow = detectPitch(slow.subarray(10000, 14096), SR, 60, 1400, 0.005).freq;
ok(Math.abs(slow.length - 2*x220.length) < 0.05*x220.length && Math.abs(fSlow - 220) < 3, 'yari hiz: iki kat uzun, perde ayni', slow.length + ' ornek, ' + fSlow.toFixed(1) + ' Hz');
const up = runGen(stretchShiftGen(x220, SR, 1, 1200)), fUp = detectPitch(up.subarray(4000, 8096), SR, 60, 1400, 0.005).freq;
ok(Math.abs(up.length - x220.length) < 400 && Math.abs(fUp - 440) < 6, '+12 yarim ses: ayni sure, bir oktav tiz', fUp.toFixed(1) + ' Hz');
const mel = new Float32Array([...sine(196, 0.5), ...sine(220, 0.5), ...sine(246.94, 1)]);
const tr = runGen(pitchTraceGen(mel, SR)), tn = traceNotes(tr);
ok(tn.map(n => n.w).join() === '67,69,71', 'perde izinden notalar: yazili Sol4 La4 Si4', tn.map(n => n.w).join());
const pcx = notesToPiece(tn, 120), ppz = parsePiece(pcx.text, '4/4');
ok(ppz.errors.length === 0 && [...new Set(ppz.notes.filter(n => n.w !== null).map(n => n.w))].join() === '67,69,71' && !ppz.notes.slice(0, -1).some(n => n.w === null) && pcx.bpm === 120, 'notalar Parcalar yazimina donuyor', pcx.text);

console.log('\n[29] Ilerleme: seri, son gunler, rekorlar');
const { dayKey, addDays, streak, bestStreak, lastDays, records } = core;
ok(addDays('2026-02-28', 1) === '2026-03-01' && addDays('2026-01-01', -1) === '2025-12-31', 'gun ekleme ay ve yil gecisinde');
const dd = { '2026-11-07': 300, '2026-11-08': 90, '2026-11-09': 30, '2026-11-10': 600, '2026-11-11': 120 };
ok(streak(dd, '2026-11-11') === 2 && streak(dd, '2026-11-12') === 2 && streak(dd, '2026-11-13') === 0, 'seri: 1 dakikadan az calisilan gun seriyi bozar; bugun henuz calisilmadiysa dunden sayilir');
ok(bestStreak(dd) === 2 && lastDays(dd, '2026-11-11', 3).map(d => d.sec).join() === '30,600,120', 'en uzun seri ve son gunler');
const rr = records([{ t:1, type:'piece', id:'ode', pct:50 }, { t:2, type:'piece', id:'ode', pct:80, title:'Ode' }, { t:3, type:'changes', pair:['Am','Em'], perMin:22 }, { t:4, type:'ear', mode:'mm', correct:7, total:10 }]);
ok(rr.length === 3 && rr.find(r => r.type === 'piece').best === 80 && rr.find(r => r.type === 'piece').n === 2 && rr.find(r => r.type === 'ear').best === 70 && rr[0].type === 'ear',
   'rekorlar: tur ve kimlik basina en iyi, deneme sayisi, son yapilan basta');

console.log('\n[30] Okuma: desifre ezgisi, nota sorusu, dikte');
const { READ_LEVELS, sightPiece, readQuizNote, dictMelody, rhythmChoices } = core;
let rdSeed = 7; const rnd = () => (rdSeed = (rdSeed*16807) % 2147483647)/2147483647;
const rdErr = [];
for(const L0 of READ_LEVELS) for(let k = 0; k < 60; k++){
  const s = sightPiece(L0.id, rnd), p = parsePiece(s.text, s.meter), g = grooveById(s.groove);
  if(p.errors.length) rdErr.push(L0.id + ': ' + p.errors.join(',') + ' ' + s.text);
  if(p.bars.length !== 4 || !p.bars.every(b => b.full)) rdErr.push(L0.id + ': olcu ' + s.text);
  if(!g || Math.abs(g.beats - p.barBeats) > 1e-9) rdErr.push(L0.id + ': kalip');
  if(!(s.key in KEY_SIG) || !p.chords.length) rdErr.push(L0.id + ': donanim/akor');
  if(p.notes.some(n => n.w < 52 || n.w > 84)) rdErr.push(L0.id + ': aralik');
  if(rdErr.length > 4) break;
}
ok(rdErr.length === 0, 'her seviyede 60 desifre ezgisi: 4 tam olcu, gecerli sure, akor ve eslik kalibi', rdErr.slice(0, 3).join(' | '));
const l1 = Array.from({ length: 200 }, () => readQuizNote(1, rnd));
ok(l1.every(w => READ_LEVELS[0].pool.includes(w)) && new Set(l1).size === READ_LEVELS[0].pool.length, 'nota sorusu seviye havuzundan, hepsi cikiyor');
const hw = Array.from({ length: 400 }, () => readQuizNote(1, rnd, { 71: 20 })).filter(w => w === 71).length;
ok(hw > 150, 'zorlanilan nota daha sik soruluyor', hw + '/400');
const dm = dictMelody(2, 5, rnd), rc = rhythmChoices('4/4', 2, rnd);
ok(dm.length === 5 && dm.every(w => READ_LEVELS[1].pool.includes(w)) && rc.choices.length === 4 && rc.choices.every(c => Math.abs(c.reduce((a, b) => a + b, 0) - 4) < 1e-9) &&
   new Set(rc.choices.map(c => c.join())).size === 4, 'dikte: ezgi havuzdan, dort farkli ritim secenegi');

console.log('\n[23] Uygulama dosyalari');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
ok(scripts.every(f => fs.existsSync(path.join(__dirname, f))), 'index.html\'deki her betik dosyasi var', scripts.filter(f=>!fs.existsSync(path.join(__dirname,f))).join(','));
ok(CORE.every(f => scripts.includes('js/core/'+f+'.js')) && scripts.indexOf('js/core/music.js') < scripts.indexOf('js/core/guitar.js'),
   'cekirdek dosyalar testtekiyle ayni sirada yukleniyor');
// Klasik betikler ayni genel kapsami paylasir: iki dosyada ayni ust duzey ad tanimlanirsa tarayici hata verir
const decl = {};
for(const f of scripts) for(const m of read(f).matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)){
  (decl[m[1]] = decl[m[1]] || []).push(f);
}
const dup = Object.entries(decl).filter(([,fs]) => fs.length > 1).map(([n,fs]) => n+' ('+fs.join(', ')+')');
ok(dup.length===0, 'betikler arasinda ayni ust duzey ad yok', dup.join(' | '));
const sw = read('sw.js'), shell = [...sw.matchAll(/"([^"]+)"/g)].map(m=>m[1]);
const assets = [...scripts, ...[...html.matchAll(/<link rel="stylesheet" href="([^"h][^"]*)"/g)].map(m=>m[1])];
ok(assets.every(a => shell.includes(a)), 'cevrimdisi onbellek butun betik ve stil dosyalarini iceriyor', assets.filter(a=>!shell.includes(a)).join(','));

const fontRefs = [...read('css/fonts.css').matchAll(/url\(\.\.\/(fonts\/[^)]+)\)/g)].map(m=>m[1]);
ok(fontRefs.length > 0 && fontRefs.every(f => fs.existsSync(path.join(__dirname, f)) && shell.includes(f)),
   'fonts.css\'teki her font dosyasi var ve cevrimdisi onbellekte', fontRefs.filter(f => !shell.includes(f)).join(','));
ok(['fraunces','commissioner','ibmplexmono','notomusic'].every(f => fs.existsSync(path.join(__dirname, 'fonts/OFL-'+f+'.txt'))) &&
   !/fonts\.googleapis/.test(html), 'her fontun lisans metni var; sayfa Google Fonts\'a baglanmiyor');

console.log(fail===0 ? '\nTUM TESTLER GECTI\n' : `\n${fail} TEST BASARISIZ\n`);
process.exit(fail?1:0);
