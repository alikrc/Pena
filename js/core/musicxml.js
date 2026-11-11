// MusicXML / .mxl içe aktarma (Sol Klarnet repertoire.js'teki ayrıştırıcının gitar sürümü). İlk bölüm okunur; akor
// notalarının en tizi ezgi sayılır, bağlı notalar birleşir, süs notaları atlanır. Gitar partisi (adı "guitar/gitar" ya da
// <transpose> oktav değişimi −1) yazıldığı gibi alınır; başka çalgılar duyulan sesi yazdığı için bir oktav tizleştirilir,
// gerekirse gitar aralığına (yazılı Mi3–Do6) en çok sığan oktava kaydırılır. Kesirli <alter> (çeyrek ses, SymbTr) en yakın
// yarım sese yuvarlanır. <harmony> akorları uygulamadaki akorlara çevrilir (bilinmeyen tür üçlüye sadeleşir).
// Çıktı "pdata": { title, num, den, key, bpm, notes: [[w|null, d, l, a]], bars: [[start, len]], chords: [[beat, sym]] }
// ve pdataParse(pdata) Parçalar'ın kullandığı yapıyı verir.
function xmlTag(s, tag){ const m = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">").exec(s); return m ? m[1].trim() : null; }
const XML_STEP = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }, XML_LETTER = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
const FIFTHS_KEY = { "0":"C", "1":"G", "2":"D", "3":"A", "4":"E", "-1":"F", "-2":"Bb" };
const XML_KIND = { major:"", minor:"m", dominant:"7", "major-seventh":"maj7", "minor-seventh":"m7", "suspended-fourth":"sus4", "suspended-second":"sus2" };
function parseMusicXML(xml){
  const title = xmlTag(xml, "work-title") || xmlTag(xml, "movement-title") || null;
  const pname = (xmlTag(xml, "part-name") || "") + " " + (xmlTag(xml, "instrument-name") || "");
  const part = (/<part\s[^>]*>([\s\S]*?)<\/part>/.exec(xml) || [, xml])[1];
  const guitar = /guitar|gitar/i.test(pname) || /<octave-change>\s*-1\s*<\/octave-change>/.test(part);
  let divisions = 1, num = null, den = null, fifths = 0, bpm = null, beat = 0;
  const notes = [], bars = [], chords = [];
  for(const mm of part.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)){
    const meas = mm[1], start = beat;
    const dv = xmlTag(meas, "divisions"); if(dv) divisions = +dv;
    const tm = xmlTag(meas, "time"); if(tm && num === null){ num = +xmlTag(tm, "beats") || 4; den = +xmlTag(tm, "beat-type") || 4; }
    const ky = xmlTag(meas, "key"); if(ky && notes.length === 0){ fifths = +(xmlTag(ky, "fifths") || 0); }
    const sp = /<sound[^>]*\btempo="([\d.]+)"/.exec(meas); if(sp && bpm === null) bpm = Math.round(+sp[1]);
    // Ölçü içindeki olaylar sırayla: nota, sus, harmony, backup/forward (yalnız ilk sesin zamanı izlenir)
    let pos = beat, voice1 = null, end = beat;
    for(const em of meas.matchAll(/<(note|harmony|backup|forward)\b[^>]*>([\s\S]*?)<\/\1>/g)){
      const [, kind, n] = em;
      if(kind === "backup"){ pos -= +(xmlTag(n, "duration") || 0)/divisions; continue; }
      if(kind === "forward"){ pos += +(xmlTag(n, "duration") || 0)/divisions; continue; }
      if(kind === "harmony"){
        const rs = xmlTag(n, "root-step"), ra = +(xmlTag(n, "root-alter") || 0), kd = (/<kind[^>]*>([^<]*)</.exec(n) || [, "major"])[1].trim();
        if(rs){
          const root = ((XML_STEP[rs] + ra) % 12 + 12) % 12, ty = XML_KIND[kd] != null ? XML_KIND[kd] : /minor/.test(kd) ? "m" : "";
          let c = chordBySymbol(ROOT_SYM[root] + ty) || chordBySymbol(ROOT_SYM[root] + (ty.startsWith("m") && ty !== "maj7" ? "m" : ""));
          if(c && !(chords.length && chords[chords.length-1][1] === c.symbol)) chords.push([pos, c.symbol]);
        }
        continue;
      }
      const v = xmlTag(n, "voice") || "1";
      if(voice1 === null) voice1 = v;
      if(/<grace\b/.test(n) || /<cue\s*\/>/.test(n)) continue;
      const dur = +(xmlTag(n, "duration") || 0)/divisions;
      const isChord = /<chord\s*\/>/.test(n);
      if(v !== voice1) continue;                 // ikinci ses atlanır (zamanı backup ile gelir)
      if(isChord){
        // Akor notası: en tizi ezgi olsun
        const p = xmlTag(n, "pitch"), last = notes[notes.length-1];
        if(p && last && last[0] !== null){ const w = pitchW(p); if(w > last[0]){ const s = spell(p); last[0] = w; last[2] = s.l; last[3] = s.a; } }
        continue;
      }
      if(!(dur > 0)) continue;
      const p = xmlTag(n, "pitch"), prev = notes[notes.length-1];
      if(/<rest\b/.test(n) || !p) notes.push([null, dur, 0, 0, pos]);
      else{
        const w = pitchW(p), s = spell(p);
        if(/<tie[^>]*type="stop"/.test(n) && prev && prev[0] === w && Math.abs(prev[4] + prev[1] - pos) < 1e-6) prev[1] += dur;
        else notes.push([w, dur, s.l, s.a, pos]);
      }
      pos += dur; end = Math.max(end, pos);
    }
    // Ölçü süresi: ilk sesin vardığı en ileri yer (ikinci ses backup ile geri sarar)
    beat = Math.max(end, start);
    bars.push([start, beat - start]);
  }
  // Yazılı gitar perdesi: gitar partisi olduğu gibi; değilse +12, sonra aralığa en çok sığan oktav
  const ps = notes.filter(n => n[0] !== null);
  let shift = guitar ? 0 : 12;
  const fit = s => ps.filter(n => n[0] + s >= 52 && n[0] + s <= 84).length;
  for(const s of [shift - 12, shift + 12]) if(fit(s) > fit(shift)) shift = s;
  notes.forEach(n => { if(n[0] !== null) n[0] += shift; });
  return { title, num: num || 4, den: den || 4, key: FIFTHS_KEY[String(fifths)] || "C", bpm: bpm || 90,
           notes: notes.map(n => [n[0], Math.round(n[1]*1e4)/1e4, n[2], n[3]]), bars: bars.filter(b => b[1] > 0).map(b => [Math.round(b[0]*1e4)/1e4, Math.round(b[1]*1e4)/1e4]),
           chords: chords.map(c => [Math.round(c[0]*1e4)/1e4, c[1]]) };
  function pitchW(p){ return Math.round(XML_STEP[xmlTag(p, "step")] + (+(xmlTag(p, "alter") || 0)) + (+xmlTag(p, "octave") + 1)*12); }
  function spell(p){ return { l: XML_LETTER[xmlTag(p, "step")], a: Math.max(-1, Math.min(1, Math.round(+(xmlTag(p, "alter") || 0)))) }; }
}
// pdata → Parçalar yapısı (parsePiece ile aynı alanlar)
function pdataParse(d){
  const notes = [], bars = d.bars.map(([start, len], i) => ({ start, len, full: Math.abs(len - d.num*4/d.den) < 1e-6, first: 0 }));
  let beat = 0, bi = 0;
  d.notes.forEach(([w, dur, l, a], i) => {
    while(bi + 1 < bars.length && beat >= bars[bi + 1].start - 1e-6) bi++;
    let sp = null;
    if(w !== null){ const oct = Math.floor((w - a - LETTER_PC[l])/12) - 1; sp = { l, a, step: oct*7 + l - 30 }; }
    notes.push({ i, beat, dur, w, bar: bi, sp });
    beat += dur;
  });
  bars.forEach((bar, k) => { const j = notes.findIndex(n => n.bar === k); bar.first = j < 0 ? notes.length : j; });
  const chords = d.chords.map(([b, sym]) => ({ beat: b, sym }));
  const chordAt = b => { let s = null; for(const c of chords){ if(c.beat <= b + 1e-9) s = c.sym; else break; } return s; };
  return { num: d.num, den: d.den, barBeats: d.num*4/d.den, notes, chords, bars, errors: [], total: beat, chordAt };
}
// .mxl (sıkıştırılmış MusicXML): zip içinden kök dosyayı çıkarır (DecompressionStream gerekir)
async function unzipFirstScore(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const files = new Map();
  let eocd = -1;
  for(let i = u8.length - 22; i >= 0 && i >= u8.length - 70000; i--) if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if(eocd < 0) throw new Error("zip");
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for(let k = 0; k < n; k++){
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    files.set(dec.decode(u8.subarray(p + 46, p + 46 + nlen)), { method, csize, off });
    p += 46 + nlen + xlen + clen;
  }
  const read = async name => {
    const f = files.get(name); if(!f) return null;
    const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = u8.subarray(start, start + f.csize);
    if(f.method === 0) return dec.decode(data);
    return dec.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  };
  const cont = await read("META-INF/container.xml");
  const root = cont && (/full-path="([^"]+)"/.exec(cont) || [])[1];
  const name = root || [...files.keys()].find(k => !k.startsWith("META-INF") && /\.(xml|musicxml)$/i.test(k));
  if(!name) throw new Error("zip");
  return read(name);
}
