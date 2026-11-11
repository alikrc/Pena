// Ritim: vuruş kalıbı çalma motoru (Ritim ve Şarkılar sekmeleri ortak kullanır) ve Ritim sekmesinin arayüzü.
// Motor: metronom ve vuruşları ses saatine göre ileriye dönük zamanlar; "play" modunda mikrofondan vuruşları
// yakalar, her ölçüyü puanlar. Gecikme ölçümü ve ayarı da burada.
const Rhythm = (() => {
  defStr({
    "rhy.srcSel":    { tr:"Seçili akor (Akorlar sekmesi)", en:"Selected chord (Chords tab)" },
    "rhy.srcProg":   { tr:"Diziliş: {p} (ölçü başına bir akor)", en:"Progression: {p} (one chord per bar)" },
    "rhy.gridAria":  { tr:"{name} kalıbı: {cells}", en:"{name} pattern: {cells}" },
    "rhy.down":      { tr:"aşağı", en:"down" }, "rhy.up": { tr:"yukarı", en:"up" }, "rhy.rest": { tr:"boş", en:"rest" },
    "rhy.countIn":   { tr:"Bir ölçü sayıyorum, sonra çal.", en:"I'll count one bar, then you play." },
    "rhy.noLatency": { tr:"Gecikme ölçülmedi; sonuçlarda sabit bir kayma olabilir. Önce Ayarlar’dan “Gecikmeyi ölç”.",
                       en:"Latency not measured; results may be shifted. Use “Measure latency” in Settings first." },
    "rhy.latNone":   { tr:"ölçülmedi", en:"not measured" },
    "rhy.latVal":    { tr:"şu an: {ms} ms", en:"current: {ms} ms" },
    "rhy.noMic":     { tr:"Mikrofon açılamadı; birlikte çalmak için mikrofon izni gerekir.", en:"Microphone failed; playing along needs microphone permission." },
    "rhy.ready":     { tr:"Hazır… {n}", en:"Ready… {n}" },
    "rhy.chord":     { tr:"Akor: {c}", en:"Chord: {c}" },
    "rhy.nowNext":   { tr:"Şimdi: {now} · sonra: {next}", en:"Now: {now} · next: {next}" },
    "rhy.extra":     { tr:"fazla", en:"extra" },
    "rhy.lastBars":  { tr:"Son {n} ölçü: ", en:"Last {n} bars: " },
    "rhy.estLatency":{ tr:"Gecikme ölçülmedi; tahmini değer kullanılıyor.", en:"Latency not measured; using an estimate." },
    "rhy.legend":    { tr:"Hücre altı: ✓ zamanında · −erken / +geç (ms) · ✗ kaçan. Yön (aşağı/yukarı) mikrofonla ayırt edilmez.",
                       en:"Under each cell: ✓ on time · −early / +late (ms) · ✗ missed. Direction (down/up) can't be told by the microphone." },
    "rhy.tipLate":   { tr:"Geride kalıyorsun: vuruşu tıkı duyunca değil, tıkla aynı anda yap.", en:"You're behind: strum with the click, not after you hear it." },
    "rhy.tipEarly":  { tr:"Acele ediyorsun: tıkı bekle, el sarkaç gibi eşit sallansın.", en:"You're rushing: wait for the click and keep the hand swinging evenly." },
    "rhy.tipMiss":   { tr:"Kaçan vuruşlar var: boş hücrelerde de el sallanmaya devam etsin, yalnızca tele değmesin.",
                       en:"Missed strokes: keep the hand swinging on empty cells too, just don't touch the strings." },
    "rhy.tipExtra":  { tr:"Fazla vuruşlar var: boş hücrelerde el teli geçmeli, değmemeli.", en:"Extra strokes: on empty cells the hand should pass the strings without touching." },
    "rhy.tipGreat":  { tr:"Çok iyi! Tempoyu 5 BPM artırmayı dene.", en:"Very good! Try 5 BPM faster." },
    "rhy.summary":   { tr:"<b>%{pct}</b> zamanında · ortalama {avg} · {miss} kaçan · {extra} fazla",
                       en:"<b>{pct}%</b> on time · average {avg} · {miss} missed · {extra} extra" },
    "rhy.onBeat":    { tr:"tam üstünde", en:"right on the beat" },
    "rhy.late":      { tr:"{ms} ms geç", en:"{ms} ms late" },
    "rhy.early":     { tr:"{ms} ms erken", en:"{ms} ms early" },
    "rhy.calNoMic":  { tr:"Mikrofon açılamadı; gecikme ölçümü mikrofon ister.", en:"Microphone failed; latency measurement needs the microphone." },
    "rhy.calStart":  { tr:"Gecikme ölçülüyor: 4 tık say, sonraki 8 tıkın her birinde akoru bir kez aşağı çal.",
                       en:"Measuring latency: count 4 clicks, then strum down once on each of the next 8 clicks." },
    "rhy.calReady":  { tr:"Hazır…", en:"Ready…" },
    "rhy.calCount":  { tr:"Say: {n}", en:"Count: {n}" },
    "rhy.calPlay":   { tr:"Çal! {n}/8", en:"Play! {n}/8" },
    "rhy.calWait":   { tr:"Hesaplanıyor…", en:"Calculating…" },
    "rhy.calFew":    { tr:"Yeterli vuruş duyulmadı ({n}/8). Mikrofon hassasiyetini artırıp yeniden dene.",
                       en:"Not enough strokes heard ({n}/8). Raise the microphone sensitivity and try again." },
    "rhy.calDone":   { tr:"Gecikme: <b>{ms} ms</b> ({n}/8 vuruş, yayılım {spread} ms). Birlikte çalarken bu gecikme düşülür. Kulaklık ya da hoparlör değişirse yeniden ölç.",
                       en:"Latency: <b>{ms} ms</b> ({n}/8 strokes, spread {spread} ms). It is subtracted when you play along. Measure again if you change headphones or speakers." }
  });
  // ---- Gecikme: mikrofon + hoparlör. Ölçülmediyse kaba tahmin ----
  let latency = store.get("latency", null);
  const estLatency = () => { const a = Snd.ctx(); return (a.outputLatency || 0) + (a.baseLatency || 0) + 0.02; };
  const curLatency = () => latency !== null ? latency : estLatency();

  // ---- Motor ----
  let rs = null;
  // opts: { mode: "demo" | "play", rhythm, bpm, chordAt(bar), maxBars?, click (bool), onSlot(k), onBar(bar),
  //         onEval(res, bar), onEnd(), countIn (bool) }
  async function start(opts){
    Bus.emit("stopall", { all:true });     // metronom da dursun: burada kendi tıkları var
    if(opts.mode === "play" && !Mic.running && !(await Mic.start())) return false;
    const a = Snd.ctx(), r = opts.rhythm, n = r.slots.length, dt = slotDur(opts.bpm);
    const countIn = opts.mode === "play" || opts.countIn ? n : 0;
    rs = { ...opts, n, dt, t0: a.currentTime + 0.12 + countIn*dt, next: -countIn, timeouts: [], onsets: [],
           evalBar: 0, voices: [], ended: false };
    if(opts.mode === "play") rs.unsub = Mic.onOnset(t => rs && rs.onsets.push(t));
    rs.timer = setInterval(schedule, 25); schedule();
    rs.raf = requestAnimationFrame(frame);
    return true;
  }
  function stop(){
    if(!rs) return;
    const s = rs; rs = null;
    clearInterval(s.timer); cancelAnimationFrame(s.raf); s.timeouts.forEach(clearTimeout);
    s.voices.forEach(v => Snd.fadeOut(v));
    if(s.unsub) s.unsub();
    if(s.onBarAudio) Band.songStop();
    if(s.onStop) s.onStop();
  }
  // Vuruş: aşağı = kalından inceye tüm çalınan teller, yukarı = inceden kalına ince 4 tel, daha hafif.
  // Yeni vuruş önceki vuruşun tellerini susturur (gerçekte de pena teli yeniden başlatır).
  function strumAt(t, down, accent, c){
    rs.voices.forEach(v => Snd.fadeOut(v, t));
    const strs = Chords.voicing(c).filter(x => !x.muted).map(x => x.midi);
    const list = down ? strs : strs.slice(-4).reverse();
    const amp = (down ? 0.12 : 0.075) * (accent === 2 ? 1.35 : accent === 1 ? 1.15 : 1);
    rs.voices = Snd.strum(list, t, down ? 0.012 : 0.009, amp);
  }
  // İleriye dönük zamanlama: 150 ms içindeki hücreler ses saatine göre şimdiden kurulur
  function schedule(){
    const a = Snd.ctx(), { n, dt } = rs, r = rs.rhythm;
    while(rs.t0 + rs.next*dt < a.currentTime + 0.15){
      const k = rs.next, t = rs.t0 + k*dt, i = ((k % n) + n) % n, bar = Math.floor(k / n);
      if(rs.maxBars && bar >= rs.maxBars){
        if(!rs.ended){
          rs.ended = true;
          const s = rs;
          rs.timeouts.push(setTimeout(() => { if(rs === s){ finishEval(); const f = s.onEnd; stop(); if(f) f(); } },
            (t - a.currentTime + curLatency() + 0.4)*1000));
        }
        break;
      }
      if(r.beats.includes(i) && (rs.click || bar < 0)) Snd.click(t, i === 0);
      if(bar >= 0 && r.slots[i] !== "-" && rs.mode === "demo") strumAt(t, r.slots[i] === "D", r.accents[i] || 0, rs.chordAt(bar));
      if(bar >= 0 && i === 0 && rs.onBarAudio) rs.onBarAudio(bar, t, n*dt);   // grup eşliği: ölçü ses saatinde önceden kurulur
      if(bar >= 0 && i === 0 && rs.onBar){
        const s = rs, b = bar;
        rs.timeouts.push(setTimeout(() => { if(rs === s) s.onBar(b); }, Math.max(0, (t - a.currentTime)*1000)));
      }
      rs.next++;
    }
  }
  function frame(){
    if(!rs) return;
    rs.raf = requestAnimationFrame(frame);
    const a = Snd.ctx(), { n, dt } = rs;
    const k = Math.floor((a.currentTime - (a.outputLatency || 0) - rs.t0) / dt);
    if(rs.onSlot) rs.onSlot(k);
    if(rs.mode === "play"){
      const lat = curLatency();
      while(a.currentTime > rs.t0 + (rs.evalBar + 1)*n*dt + dt/2 + lat + 0.05 && (!rs.maxBars || rs.evalBar < rs.maxBars))
        evalBar(rs.evalBar++, lat);
    }
  }
  function finishEval(){
    if(!rs || rs.mode !== "play") return;
    const lat = curLatency();
    while(rs.evalBar < rs.maxBars) evalBar(rs.evalBar++, lat);
  }
  // Bir ölçüyü puanla: yakalanan vuruşlardan gecikme çıkarılır, beklenen vuruşlarla eşlenir
  function evalBar(b, lat){
    const { n, dt } = rs, start = rs.t0 + b*n*dt;
    const expected = rhythmBar(rs.rhythm, rs.bpm, start);
    const ons = rs.onsets.map(t => t - lat).filter(t => t >= start - dt/2 && t < start + n*dt - dt/2);
    const res = scoreTiming(expected, ons, dt, Math.min(0.04, dt*0.3));
    if(rs.onEval) rs.onEval(res, b, start);
  }

  // ---- Ritim sekmesi arayüzü ----
  const rlistEl=$("rlist"), rgridEl=$("rgrid"), rnameEl=$("rname"), rmeterEl=$("rmeter"), rdescEl=$("rdesc"),
        bpmIn=$("bpm"), bpmVal=$("bpmv"), rclickIn=$("rclick"), rsrcSel=$("rsrc"), rresEl=$("rresult"), rnowEl=$("rnow"),
        rstopBtn=$("rstop");
  const RRES_HINT = () => "";               // açıklama "Nasıl çalışır?" bölümünde
  const ARROW = { D:"↓", U:"↑", "-":"·" };
  let rhythm = rhythmById(store.get("rhythm", "pop")) || rhythmById("pop");
  let bpm = Math.round(Math.min(160, Math.max(40, +store.get("bpm", 80) || 80)));
  let mine = false, results = [], calib = null;       // mine: motor şu an bu sekme için mi çalışıyor
  rclickIn.checked = store.get("rclick", true);
  bpmIn.value = bpm; bpmVal.textContent = bpm;

  function fillSrc(){
    rsrcSel.replaceChildren(new Option(t("rhy.srcSel"), "sel"),
      ...Chords.PROGS.map((p, i) => new Option(t("rhy.srcProg", { p: p.join(" – ") }), "p" + i)));
  }
  fillSrc();
  rsrcSel.value = store.get("rsrc", "sel");
  if(rsrcSel.selectedIndex < 0) rsrcSel.value = "sel";
  rsrcSel.addEventListener("change", () => { store.set("rsrc", rsrcSel.value); restartIfPlaying(); });
  const chordForBar = b => {
    if(rsrcSel.value === "sel") return Chords.current;
    const p = Chords.PROGS[+rsrcSel.value.slice(1)];
    return chordBySymbol(p[((b % p.length) + p.length) % p.length]);
  };

  function buildRhythmList(){
    rlistEl.replaceChildren(...RHYTHMS.map(r => {
      const b = radioBtn(L(r, "name") + " · " + r.meter.split(" ")[0], r === rhythm, () => selectRhythm(r));
      b.setAttribute("aria-label", L(r, "name") + ", " + r.meter);
      return b;
    }));
  }
  radioArrows(rlistEl);
  function selectRhythm(r){
    rhythm = r; store.set("rhythm", r.id);
    buildRhythmList(); drawRhythm(); restartIfPlaying();
  }
  function drawRhythm(){
    const r = rhythm;
    rnameEl.textContent = L(r, "name"); rmeterEl.textContent = r.meter;
    rdescEl.textContent = L(r, "desc");
    rgridEl.style.gridTemplateColumns = "repeat(" + r.slots.length + ", minmax(0, 1fr))";
    rgridEl.replaceChildren(...[...r.slots].map((ch, i) => {
      const c = document.createElement("div");
      c.className = "rcell" + (ch === "-" ? " rest" : "") + (r.accents[i] ? " acc" + r.accents[i] : "") +
                    (i > 0 && r.beats.includes(i) ? " gstart" : "");
      c.innerHTML = '<span class="rcount">' + r.counts[i] + '</span><span class="rarrow">' + ARROW[ch] + '</span><span class="rmark"></span>';
      return c;
    }));
    rgridEl.setAttribute("aria-label", t("rhy.gridAria", { name: L(r, "name"), cells: [...r.slots].map((ch, i) =>
      r.counts[i] + " " + t(ch === "D" ? "rhy.down" : ch === "U" ? "rhy.up" : "rhy.rest")).join(", ") }));
  }
  function setBpm(v){
    bpm = Math.round(Math.min(160, Math.max(40, v)));
    bpmIn.value = bpm; bpmVal.textContent = bpm; store.set("bpm", bpm);
  }
  bpmIn.addEventListener("input", () => setBpm(+bpmIn.value));
  bpmIn.addEventListener("change", restartIfPlaying);
  $("bpmdn").addEventListener("click", () => { setBpm(bpm - 5); restartIfPlaying(); });
  $("bpmup").addEventListener("click", () => { setBpm(bpm + 5); restartIfPlaying(); });
  rclickIn.addEventListener("change", () => store.set("rclick", rclickIn.checked));

  function clearMarks(){ [...rgridEl.children].forEach(c => { c.classList.remove("now"); const m = c.querySelector(".rmark"); m.textContent = ""; m.className = "rmark"; }); }
  function restartIfPlaying(){ if(mine && rs) cardStart(rs.mode); }
  async function cardStart(mode){
    clearMarks(); results = [];
    if(mode === "play") rresEl.innerHTML = t("rhy.countIn") + (latency === null ? ' <span class="warn">' + t("rhy.noLatency") + '</span>' : "");
    else rresEl.innerHTML = RRES_HINT();
    const ok = await start({ mode, rhythm, bpm, chordAt: chordForBar, click: rclickIn.checked,
      onSlot: cardSlot, onBar: b => { if(rsrcSel.value !== "sel") Chords.select(chordForBar(b)); }, onEval: cardEval,
      onStop: () => { mine = false; rstopBtn.disabled = true; clearNow(); } });
    if(!ok){ rresEl.textContent = t("rhy.noMic"); return; }
    mine = true; rstopBtn.disabled = false;
  }
  function clearNow(){ [...rgridEl.children].forEach(c => c.classList.remove("now")); rnowEl.textContent = ""; }
  function cardSlot(k){
    const n = rhythm.slots.length, cells = rgridEl.children;
    for(let i = 0; i < cells.length; i++) cells[i].classList.toggle("now", k >= 0 && i === k % n);
    if(k < 0) rnowEl.textContent = t("rhy.ready", { n: rhythm.beats.filter(b => b <= k + n).map((_, j) => j+1).join(" ") });
    else{
      const bar = Math.floor(k / n);
      rnowEl.textContent = rsrcSel.value === "sel" ? t("rhy.chord", { c: Chords.current.symbol })
        : t("rhy.nowNext", { now: chordForBar(bar).symbol, next: chordForBar(bar+1).symbol });
    }
  }
  function cardEval(res, b, start){
    const n = rhythm.slots.length, dt = slotDur(bpm), cells = rgridEl.children;
    results.push(res); if(results.length > 4) results.shift();
    for(let i = 0; i < n; i++){ const m = cells[i].querySelector(".rmark"); m.textContent = ""; m.className = "rmark"; }
    for(const h of res.hits){
      const m = cells[h.slot].querySelector(".rmark");
      m.className = "rmark " + h.verdict;
      m.textContent = h.verdict === "ok" ? "✓" : h.verdict === "miss" ? "✗" : (h.offset < 0 ? "−" : "+") + Math.round(Math.abs(h.offset)*1000);
    }
    for(const tx of res.extraTimes){
      const i = Math.round((tx - start)/dt);
      if(i >= 0 && i < n && !cells[i].querySelector(".rmark").textContent){
        const m = cells[i].querySelector(".rmark"); m.className = "rmark extra"; m.textContent = t("rhy.extra");
      }
    }
    const s = summarize(results);
    rresEl.innerHTML = t("rhy.lastBars", { n: results.length }) + s.html + (latency === null ? '<br><span class="warn">' + t("rhy.estLatency") + '</span>' : "") +
      '<br><small>' + t("rhy.legend") + '</small>';
    if(results.length >= 4) Bus.emit("achieve", { type:"rhythm", id: rhythm.id, bpm, pct: s.pct, bars: results.length });
  }
  rstopBtn.addEventListener("click", () => { stop(); stopCal(); });
  $("rdemo").addEventListener("click", () => cardStart("demo"));
  $("rplay").addEventListener("click", () => cardStart("play"));
  // Gecikme ölçümü Ayarlar panelinde: sonuç ve sayım orada gösterilir
  const calMsg = $("calmsg"), calNow = $("calnow"), latStat = $("latstat");
  const showLat = () => { latStat.textContent = latency === null ? t("rhy.latNone") : t("rhy.latVal", { ms: Math.round(latency*1000) }); };
  showLat();
  $("rcal").addEventListener("click", calStart);

  // Ölçü sonuçlarının özeti: zamanında yüzdesi, ortalama kayma, kaçan, fazla ve bir ipucu
  function summarize(list){
    const all = list.flatMap(r => r.hits), matched = all.filter(h => h.offset !== null);
    const okN = all.filter(h => h.verdict === "ok").length, miss = all.length - matched.length;
    const extra = list.reduce((s, r) => s + r.extra, 0);
    const mean = matched.length ? matched.reduce((s, h) => s + h.offset, 0) / matched.length : 0;
    const ms = Math.round(Math.abs(mean)*1000), pct = all.length ? Math.round(100*okN/all.length) : 0;
    let tip = "";
    if(matched.length >= 3 && mean > 0.025) tip = t("rhy.tipLate");
    else if(matched.length >= 3 && mean < -0.025) tip = t("rhy.tipEarly");
    else if(miss > all.length/4) tip = t("rhy.tipMiss");
    else if(extra > 1) tip = t("rhy.tipExtra");
    else if(all.length && okN === all.length) tip = t("rhy.tipGreat");
    const avg = ms < 5 ? t("rhy.onBeat") : t(mean > 0 ? "rhy.late" : "rhy.early", { ms });
    return { pct, html: t("rhy.summary", { pct, avg, miss, extra }) + (tip ? "<br>" + tip : "") };
  }

  // Gecikme ölçümü: 4 tık say, sonraki 8 tıkın her birinde bir kez aşağı çal; ortanca sapma gecikme olur.
  async function calStart(){
    Bus.emit("stopall", { all:true });     // metronom da dursun: burada kendi tıkları var
    if(!Mic.running && !(await Mic.start())){ calMsg.textContent = t("rhy.calNoMic"); return; }
    const a = Snd.ctx(), dt = 0.75, t0 = a.currentTime + 0.3, targets = [], onsets = [];
    for(let i = 0; i < 12; i++){ Snd.click(t0 + i*dt, i % 4 === 0); if(i >= 4) targets.push(t0 + i*dt); }
    calib = { unsub: Mic.onOnset(t => onsets.push(t)), raf: 0, timer: 0 };
    calMsg.textContent = t("rhy.calStart");
    const tick = () => {
      if(!calib) return;
      const k = Math.floor((a.currentTime - t0) / dt);
      calNow.textContent = k < 0 ? t("rhy.calReady") : k < 4 ? t("rhy.calCount", { n: k+1 }) : k < 12 ? t("rhy.calPlay", { n: k-3 }) : t("rhy.calWait");
      calib.raf = requestAnimationFrame(tick);
    };
    calib.raf = requestAnimationFrame(tick);
    calib.timer = setTimeout(() => {
      const offs = targets.map(tg => { const m = onsets.filter(o => o > tg - 0.2 && o < tg + 0.45);
                                      return m.length ? m.reduce((x, y) => Math.abs(x-tg) < Math.abs(y-tg) ? x : y) - tg : null; })
                          .filter(x => x !== null);
      stopCal();
      if(offs.length < 5){
        calMsg.textContent = t("rhy.calFew", { n: offs.length });
        return;
      }
      latency = Math.min(0.4, Math.max(0, median(offs)));
      store.set("latency", latency); showLat();
      const spread = Math.round((Math.max(...offs) - Math.min(...offs))*1000);
      calMsg.innerHTML = t("rhy.calDone", { ms: Math.round(latency*1000), n: offs.length, spread });
    }, (t0 + 12*dt + 0.6 - a.currentTime)*1000);
  }
  function stopCal(){
    if(!calib) return;
    calib.unsub(); cancelAnimationFrame(calib.raf); clearTimeout(calib.timer); calib = null;
    calNow.textContent = "";
  }

  Bus.on("stopall", () => { stop(); stopCal(); });
  Bus.on("mic", on => { if(!on && rs && rs.mode === "play") stop(); });
  Bus.on("lang", () => { const v = rsrcSel.value; fillSrc(); rsrcSel.value = v; buildRhythmList(); drawRhythm(); showLat(); if(!rs) rresEl.innerHTML = RRES_HINT(); });
  buildRhythmList(); drawRhythm();
  return {
    start, stop, summarize,
    get latencyMeasured(){ return latency !== null; },
    get latency(){ return curLatency(); },
    open(id, b){ const r = rhythmById(id); if(r) selectRhythm(r); if(b) setBpm(b); }
  };
})();
