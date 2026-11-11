// Okuma sekmesi: deşifre (ilk görüşte çalma), nota okuma, ezgi diktesi ve ritim diktesi.
// Deşifre ezgisi her seferinde yeniden üretilir; inceleme süresinden sonra Parçalar'da grupla çalınıp puanlanır.
// Nota okuma: dizekteki notayı gitarda çal (mikrofon) ya da adını seç; zorlanılan notalar daha sık sorulur.
const Okuma = (() => {
  defStr({
    "rd.sight":   { tr:"Deşifre", en:"Sight-reading" }, "rd.quiz": { tr:"Nota oku", en:"Read notes" },
    "rd.mel":     { tr:"Ezgi diktesi", en:"Melodic dictation" }, "rd.rhy": { tr:"Ritim diktesi", en:"Rhythm dictation" },
    "rd.level":   { tr:"Seviye", en:"Level" }, "rd.new": { tr:"Yeni ezgi", en:"New melody" },
    "rd.sightHelp":{ tr:"Ezgiye {s} saniye bak: ölçüyü, ilk notayı ve atlamaları bul. Süre bitince Parçalar'da grupla çal; doğru nota ve zamanlama puanlanır.",
                     en:"Study the melody for {s} seconds: find the time signature, the first note and the leaps. Then play it with the band in Pieces; right notes and timing are scored." },
    "rd.study":   { tr:"İnceleme: {s} sn", en:"Study: {s} s" }, "rd.go": { tr:"Grupla çal", en:"Play with band" },
    "rd.slow":    { tr:"Benimle çal", en:"Follow me" },
    "rd.quizHelp":{ tr:"Dizekteki notayı gitarda çal (mikrofonu aç) ya da adını seç.", en:"Play the note on the guitar (turn on the microphone) or pick its name." },
    "rd.right":   { tr:"Doğru: {note} · {pos}", en:"Right: {note} · {pos}" }, "rd.wrong": { tr:"Bu {heard}; doğrusu {note} ({pos}).", en:"That's {heard}; it's {note} ({pos})." },
    "rd.score":   { tr:"{ok}/{n} doğru · ortalama {s} sn", en:"{ok}/{n} right · average {s} s" },
    "rd.melHelp": { tr:"Kısa bir ezgi çalarım; ilk notası verili. Kalan notaları sırayla seç ya da gitarda çal.", en:"I play a short melody; the first note is given. Pick or play the remaining notes in order." },
    "rd.listen":  { tr:"Dinle", en:"Listen" }, "rd.again": { tr:"Bir daha", en:"Again" }, "rd.next": { tr:"Sıradaki", en:"Next" },
    "rd.melOk":   { tr:"Hepsi doğru ✓", en:"All right ✓" }, "rd.melNo": { tr:"Olmadı; doğrusu: {list}", en:"Not quite; it was: {list}" },
    "rd.rhyHelp": { tr:"Bir ölçü sayarım, sonra bir ölçülük ritim çalarım. Duyduğunu dört seçenekten bul.", en:"I count one bar, then play a one-bar rhythm. Find it among the four choices." },
    "rd.rhyOk":   { tr:"Doğru ✓", en:"Right ✓" }, "rd.rhyNo": { tr:"Yanlış; doğrusu işaretli.", en:"Wrong; the right one is marked." },
    "rd.given":   { tr:"İlk nota: {note}", en:"First note: {note}" }
  });
  const root = $("rdroot");
  let mode = store.get("rdMode", "sight"), lv = store.get("rdLevel", 1), sight = null, studyT = null;
  let quiz = null, qStats = { n:0, ok:0, ms:0 }, mel = null, rhy = null;
  const weights = store.get("rdWeights", {});
  const posText = w => { const p = positionsFor(w)[0]; return p ? t("mel.pos", { s: p.string, f: p.fret === 0 ? t("mel.open") : p.fret }) : ""; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function build(){
    clearInterval(studyT);
    root.innerHTML = `
    <section class="card">
      <div class="rdseg" role="radiogroup">${["sight","quiz","mel","rhy"].map(m => `<button type="button" role="radio" aria-checked="${m === mode}" data-m="${m}">${t("rd." + m)}</button>`).join("")}</div>
      <div class="row"><div class="field"><label class="label" for="rdlv">${t("rd.level")}</label><select id="rdlv">
        ${READ_LEVELS.filter(x => mode === "sight" || x.id <= 3).map(x => `<option value="${x.id}"${x.id === lv ? " selected" : ""}>${x.id}. ${L(x, "name")}</option>`).join("")}</select></div></div>
      <div id="rdbody"></div>
    </section>`;
    root.querySelector(".rdseg").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if(b){ mode = b.dataset.m; store.set("rdMode", mode); build(); } });
    $("rdlv").addEventListener("change", () => { lv = +$("rdlv").value; store.set("rdLevel", lv); build(); });
    if(mode === "sight") buildSight(); else if(mode === "quiz") buildQuiz(); else if(mode === "mel") buildMel(); else buildRhy();
  }
  const body = html => { $("rdbody").innerHTML = html; };
  // Tek satırlık dizek: notalar ve süreler (akorsuz)
  function miniStaff(box, text, meter, key = "C", width){ return Staff.draw(box, parsePiece(text, meter), { key, width: width || box.clientWidth || 360 }); }

  // ---- Deşifre ----
  function buildSight(){
    const secs = lv <= 2 ? 15 : 20;
    body(`<p class="lead">${t("rd.sightHelp", { s: secs })}</p>
      <div class="cbtns"><button type="button" class="primary small" id="rdnew">${t("rd.new")}</button>
        <button type="button" class="stopbtn" id="rdgo" disabled>${t("rd.go")}</button><button type="button" class="stopbtn" id="rdslow" disabled>${t("rd.slow")}</button>
        <span class="reg" id="rdtimer"></span></div>
      <div class="scorebox" id="rdscore"></div>`);
    $("rdnew").addEventListener("click", newSight);
    $("rdgo").addEventListener("click", () => playSight("band"));
    $("rdslow").addEventListener("click", () => playSight("follow"));
    if(sight) showSight(false);
  }
  function newSight(){ sight = sightPiece(lv); showSight(true); }
  function showSight(timer){
    const p = miniStaff($("rdscore"), sight.text, sight.meter, sight.key);
    p.svg.querySelectorAll(".tabn,.tbg,.tl,.tabl").forEach(e => e.remove());       // deşifrede tab gizli: notayı oku
    let s = lv <= 2 ? 15 : 20;
    clearInterval(studyT);
    const tick = () => { $("rdtimer").textContent = s > 0 ? t("rd.study", { s }) : ""; $("rdgo").disabled = $("rdslow").disabled = s > 0; if(s-- <= 0) clearInterval(studyT); };
    if(timer){ tick(); studyT = setInterval(tick, 1000); } else { $("rdgo").disabled = $("rdslow").disabled = false; }
  }
  function playSight(m){
    Pieces.openTemp({ title: sight.title, title_en: sight.title_en, by: t("rd.sight"), meter: sight.meter, key: sight.key, bpm: sight.bpm, groove: sight.groove, text: sight.text }, m);
    Tabs.show("parcalar");
  }

  // ---- Nota okuma ----
  function buildQuiz(){
    const names = [0,2,4,5,7,9,11];
    body(`<p class="lead">${t("rd.quizHelp")}</p><div class="scorebox rdq" id="rdqs"></div>
      <div class="cbtns rdnames">${names.map(pc => `<button type="button" class="stopbtn" data-pc="${pc}">${pcName(pc)}</button>`).join("")}</div>
      <div class="cresult" id="rdqres" aria-live="polite"></div><p class="reg" id="rdqstat"></p>`);
    root.querySelector(".rdnames").addEventListener("click", e => { const b = e.target.closest("[data-pc]"); if(b && quiz) answer(+b.dataset.pc, null); });
    nextQuiz();
  }
  function nextQuiz(){
    const w = readQuizNote(lv, Math.random, weights, quiz && quiz.w);
    quiz = { w, t0: performance.now(), done:false };
    miniStaff($("rdqs"), readName(w) + ":4", "4/4", "C", 200).svg.querySelectorAll(".tabn,.tbg,.tl,.tabl,.bl").forEach(e => e.remove());
  }
  function answer(pc, heard){
    if(!quiz || quiz.done) return;
    const ok = heard !== null ? heard === quiz.w : pc === quiz.w % 12, ms = performance.now() - quiz.t0;
    quiz.done = true; qStats.n++; if(ok) qStats.ok++; qStats.ms += ms;
    weights[quiz.w] = Math.max(0, (weights[quiz.w] || 0) + (ok ? (ms > 4000 ? 0.5 : -0.5) : 2)); store.set("rdWeights", weights);
    $("rdqres").innerHTML = ok ? '<span class="ok">' + t("rd.right", { note: noteLabel(quiz.w), pos: posText(quiz.w) }) + "</span>"
      : '<span class="no">' + t("rd.wrong", { heard: heard !== null ? noteLabel(heard) : pcName(pc), note: noteLabel(quiz.w), pos: posText(quiz.w) }) + "</span>";
    $("rdqstat").textContent = t("rd.score", { ok: qStats.ok, n: qStats.n, s: num(qStats.ms/qStats.n/1000, 1) });
    if(qStats.n % 10 === 0) Bus.emit("achieve", { type:"drill", id:"read" + lv, title: t("rd.quiz") + " " + lv, pct: Math.round(qStats.ok/qStats.n*100) });
    setTimeout(() => { if(mode === "quiz" && $("rdqs")) nextQuiz(); }, ok ? 700 : 1800);
  }
  Bus.on("note", ({ r, isNew }) => {
    if(!isNew || $("panel-okuma").hidden) return;
    if(mode === "quiz" && quiz && !quiz.done) answer(null, r.written);
    else if(mode === "mel" && mel && !mel.done) pickMel(r.written);
  });

  // ---- Ezgi diktesi ----
  function buildMel(){
    const pool = READ_LEVELS[Math.min(3, lv) - 1].pool;
    body(`<p class="lead">${t("rd.melHelp")}</p>
      <div class="cbtns"><button type="button" class="primary small" id="rdmplay">${t("rd.listen")}</button><button type="button" class="stopbtn" id="rdmnext">${t("rd.next")}</button></div>
      <p class="lead" id="rdmgiven"></p><div class="mnotes" id="rdmans"></div>
      <div class="cbtns rdnames">${pool.map(w => `<button type="button" class="stopbtn" data-w="${w}">${noteLabel(w)}</button>`).join("")}</div>
      <div class="cresult" id="rdmres" aria-live="polite"></div>`);
    $("rdmplay").addEventListener("click", playMel);
    $("rdmnext").addEventListener("click", () => { mel = null; newMel(); });
    root.querySelector(".rdnames").addEventListener("click", e => { const b = e.target.closest("[data-w]"); if(b) pickMel(+b.dataset.w); });
    newMel();
  }
  function newMel(){
    if(!mel) mel = { notes: dictMelody(lv, lv <= 1 ? 4 : 5), got: [], done:false };
    mel.got = [mel.notes[0]];
    $("rdmgiven").textContent = t("rd.given", { note: noteLabel(mel.notes[0]) });
    showMel(); $("rdmres").textContent = "";
  }
  function showMel(){ $("rdmans").innerHTML = mel.notes.map((w, i) => `<div class="mnote${i < mel.got.length ? " done" : ""}"><span class="nn">${i < mel.got.length ? noteLabel(mel.got[i]) : "?"}</span></div>`).join(""); }
  async function playMel(){
    Bus.emit("stopall");
    const a = Snd.ctx(); let at = a.currentTime + 0.1;
    for(const w of mel.notes){ Snd.pluck(writtenFreq(w, T), at, 0.3); at += 0.6; }
  }
  function pickMel(w){
    if(!mel || mel.done || mel.got.length >= mel.notes.length) return;
    mel.got.push(w); showMel();
    if(mel.got.length === mel.notes.length){
      mel.done = true;
      const ok = mel.got.every((x, i) => x === mel.notes[i]);
      $("rdmres").innerHTML = ok ? '<span class="ok">' + t("rd.melOk") + "</span>" : '<span class="no">' + t("rd.melNo", { list: mel.notes.map(noteLabel).join(" ") }) + "</span>";
      Bus.emit("achieve", { type:"drill", id:"dict" + lv, title: t("rd.mel") + " " + lv, pct: ok ? 100 : 0 });
    }
  }

  // ---- Ritim diktesi ----
  function buildRhy(){
    body(`<p class="lead">${t("rd.rhyHelp")}</p>
      <div class="cbtns"><button type="button" class="primary small" id="rdrplay">${t("rd.listen")}</button><button type="button" class="stopbtn" id="rdrnext">${t("rd.next")}</button></div>
      <div class="rdchoices" id="rdrch"></div><div class="cresult" id="rdrres" aria-live="polite"></div>`);
    $("rdrplay").addEventListener("click", playRhy);
    $("rdrnext").addEventListener("click", newRhy);
    newRhy();
  }
  function newRhy(){
    const meter = lv >= 3 && Math.random() < 0.4 ? "3/4" : "4/4", c = rhythmChoices(meter, lv);
    const order = [0,1,2,3].sort(() => Math.random() - 0.5);
    rhy = { meter, bars: c.choices, order, done:false };
    $("rdrres").textContent = "";
    $("rdrch").innerHTML = order.map((k, i) => `<button type="button" class="rdch" data-k="${k}"><span class="reg">${i + 1}</span><div class="rdmini"></div></button>`).join("");
    [...$("rdrch").querySelectorAll(".rdch")].forEach(b => {
      const bar = rhy.bars[+b.dataset.k];
      miniStaff(b.querySelector(".rdmini"), bar.map(d => "B4" + (d === 1 ? "" : ":" + d)).join(" "), meter, "C", 260).svg.querySelectorAll(".tabn,.tbg,.tl,.tabl").forEach(e => e.remove());
      b.addEventListener("click", () => pickRhy(+b.dataset.k, b));
    });
  }
  function playRhy(){
    Bus.emit("stopall");
    const a = Snd.ctx(), beat = 60/(lv <= 1 ? 72 : 84), beats = rhy.meter === "3/4" ? 3 : 4;
    let at = a.currentTime + 0.15;
    for(let i = 0; i < beats; i++) Snd.click(at + i*beat, i === 0);
    at += beats*beat;
    for(const d of rhy.bars[0]){ Snd.pluck(writtenFreq(71, T), at, 0.3); at += d*beat; }
  }
  function pickRhy(k, el){
    if(!rhy || rhy.done) return;
    rhy.done = true;
    const ok = k === 0;
    $("rdrch").querySelector('[data-k="0"]').classList.add("right");
    if(!ok) el.classList.add("wrong");
    $("rdrres").innerHTML = ok ? '<span class="ok">' + t("rd.rhyOk") + "</span>" : '<span class="no">' + t("rd.rhyNo") + "</span>";
    Bus.emit("achieve", { type:"drill", id:"rhy" + lv, title: t("rd.rhy") + " " + lv, pct: ok ? 100 : 0 });
  }

  Bus.on("lang", build);
  Bus.on("tab", id => { if(id === "okuma" && mode === "sight" && sight) showSight(false); });
  build();
  return {};
})();
