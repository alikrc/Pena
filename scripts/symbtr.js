// TSM nota arşivi: Sol Klarnet uygulamasının SymbTr'den ürettiği eser dosyalarından (notalar/*.json) Pena'nın arşivini üretir.
// Kullanım: node scripts/symbtr.js [Sol-Klarnet klasörü]   (varsayılan ../Sol-Klarnet)
//
// - Lisans: bestecisi telifli ya da bilinmeyen eserler alınmaz (Sol-Klarnet docs/lisans-disla.csv engel = besteci/ikisi,
//   docs/lisans-belirsiz.csv eksik = besteci). Güfteler hiç alınmadığı için yalnız güftesi telifli eserler sözsüz girer.
// - Süslemeler ve heceler atılır. Perde 53 koma cinsinden kalır (Rast = 0 = yazılı Sol4); gitarda en yakın yarım sese
//   yuvarlanır (js/core/archive.js). Her eserin ortalama koma sapması (ke, yarım sesin binde biri) dizine yazılır.
// - SymbTr: M. K. Karaosmanoğlu; Music Technology Group, Universitat Pompeu Fabra · CC BY-NC-SA 4.0.
//   Türetilen veri (notalar/) de CC BY-NC-SA 4.0'dır.
const fs = require("fs"), path = require("path");
const SRC = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "Sol-Klarnet"));
const OUT = path.join(__dirname, "..", "notalar");

function csv(f){
  return fs.readFileSync(f, "utf8").replace(/^﻿/, "").split(/\r?\n/).slice(1).filter(Boolean)
    .map(l => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map(m => m[2] !== undefined ? m[2] : m[1]).slice(0, -1));
}
const disla = new Set(csv(path.join(SRC, "docs", "lisans-disla.csv")).filter(r => r[11] === "besteci" || r[11] === "ikisi").map(r => r[0]));
const belirsiz = new Set(csv(path.join(SRC, "docs", "lisans-belirsiz.csv")).filter(r => /besteci/.test(r[11])).map(r => r[0]));

// Çok bilinen, gitarda koması az kamu malı eserler (Parçalar sekmesinde "Popüler" olarak öne çıkar)
const POPULAR = [
  "nihavent--turku--nimsofyan--uskudara_gider--", "acemasiran--mars--nimsofyan--korkma_sonmez--ali_rifat_cagatay",
  "acemkurdi--sarki--yuruksemai_ii--fikrimin_ince--muallim_ismail_hakki_bey", "muhayyerkurdi--turku--aksak--bulbulum_altin--",
  "segah--turku--curcuna--cayda_cira--elazig", "hicaz--zeybek--agiraksak--harmandali--ege", "rast--zeybek--agiraksak--kordon_zeybegi--",
  "kurdilihicazkar--longa--nimsofyan----kemani_sebuh", "nikriz--sirto--nimsofyan----tanburi_cemil_bey",
  "nihavent--kasaphavasi--duyek----", "mahur--turku--sofyan--yemenimde_hare_var--",
  "acemkurdi--turku--duyek--ankaranin_yollari--", "mahur--turku--sofyan--su_dere--", "buselik--turku--azeriyuruksemai--daglara_cen--",
  "kurdilihicazkar--sarki--kapali_curcuna--gurub_etti--haci_arif_bey", "hicazkar--sarki--kapali_curcuna--bahar_geldi--muhlis_sabahaddin_ezgi",
  "acemasiran--sarki--yuruksemai_ii--gel_ey--aleko_bacanos", "nihavent--sarki--semai--hatirla_ey_peri--muhlis_sabahaddin_ezgi",
  "hicaz--sarki--nimsofyan--cok_yasa--muhlis_sabahaddin_ezgi", "rehavi--mars--ikizaksak--hos_gelisler--", "karcigar--kocekce--aksak--girdi_gonul--dede_efendi",
  "hicaz--kocekce--aksak--baharin_zamani--dede_efendi", "nikriz--zeybek--aksak--1--tanburi_cemil_bey", "mahur--mars--sofyan--gafil_ne--muallim_ismail_hakki_bey",
  "ferahnuma--turku--sofyan--fidayda--ankara"
];

const idx = JSON.parse(fs.readFileSync(path.join(SRC, "notalar", "index.json"), "utf8"));
fs.rmSync(OUT, { recursive:true, force:true }); fs.mkdirSync(OUT);
const out = [], pop = new Set();
let skipped = 0;
for(const p of idx.pieces){
  if(disla.has(p.id) || belirsiz.has(p.id)){ skipped++; continue; }
  const j = JSON.parse(fs.readFileSync(path.join(SRC, "notalar", p.id + ".json"), "utf8"));
  const notes = j.notes.map(n => [n[0], n[1]]);
  const ns = notes.filter(n => n[0] !== null);
  if(!ns.length){ skipped++; continue; }
  const ke = Math.round(ns.reduce((s, n) => { const x = n[0]*12/53; return s + Math.abs(x - Math.round(x)); }, 0)/ns.length*1000);
  fs.writeFileSync(path.join(OUT, p.id + ".json"), JSON.stringify({ id: p.id, notes, meters: j.meters.map(m => [m[0], m[1], m[2]]), tempo: j.tempo }));
  const semis = ns.map(n => Math.round(n[0]*12/53));
  const isPop = POPULAR.includes(p.id);
  if(isPop) pop.add(p.id);
  out.push({ id: p.id, t: p.t, mk: p.mk, mkn: p.mkn, f: p.f, fn: p.fn, un: p.un, b: p.b, tp: p.tp || 80, n: ns.length, s: p.s,
             lo: 67 + Math.min(...semis), hi: 67 + Math.max(...semis), k: Math.round(p.k*12/53), ke, lv: p.lv || 2, ...(isPop ? { pop: 1 } : {}) });
}
const missing = POPULAR.filter(id => !pop.has(id));
if(missing.length) console.warn("Bulunamayan popüler eserler:", missing.join(", "));
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({
  source: "SymbTr (M. K. Karaosmanoğlu; Music Technology Group, Universitat Pompeu Fabra) · CC BY-NC-SA 4.0 · https://github.com/MTG/SymbTr",
  pieces: out }));
const size = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${out.length} eser yazıldı, ${skipped} eser alınmadı (telif / bilinmeyen besteci), ${pop.size} popüler, ${(size/1e6).toFixed(1)} MB`);
