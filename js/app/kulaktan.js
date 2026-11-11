// Kulaktan çıkar sekmesi: ses ya da video dosyasını aç, zor yeri seç, perdesini bozmadan yavaşlat ve döngüye al.
// Çalan yerin notası (gitar yazımı) ve perde izi görünür; seçili bölge notaya dökülüp Parçalar'a eklenebilir.
// Dosya cihazdan çıkmaz. (Sol Klarnet'teki Kulaktan çıkar'ın gitar sürümü.)
const Kulaktan = (() => {
  defStr({
    "kf.desc":   { tr:"Sevdiğin bir kaydı kulakla çıkar. Ses ya da video dosyasını aç; zor yeri sürükleyerek seç, perdesini bozmadan yavaşlat ve döngüye al. Çalan yerin notası altta yazar; seçili bölgeyi notaya döküp Parçalar'a ekleyebilirsin. Dosya cihazından çıkmaz.",
                   en:"Learn a recording by ear. Open an audio or video file; drag to select a hard passage, slow it down without changing the pitch and loop it. The note being played is shown below; you can turn the selection into notes and add it to Pieces. The file never leaves your device." },
    "kf.open":   { tr:"Ses / video dosyası aç", en:"Open an audio / video file" },
    "kf.wave":   { tr:"Dalga biçimi: dokun, konum seç; sürükle, bölge seç", en:"Waveform: tap to seek, drag to select" },
    "kf.play":   { tr:"▶ Çal", en:"▶ Play" }, "kf.stop": { tr:"■ Durdur", en:"■ Stop" },
    "kf.back":   { tr:"2 saniye geri", en:"Back 2 seconds" }, "kf.fwd": { tr:"2 saniye ileri", en:"Forward 2 seconds" },
    "kf.loop":   { tr:"döngü", en:"loop" }, "kf.clear": { tr:"seçimi kaldır", en:"clear selection" },
    "kf.speed":  { tr:"Hız", en:"Speed" }, "kf.pitch": { tr:"Perde", en:"Pitch" }, "kf.fine": { tr:"İnce ayar", en:"Fine" },
    "kf.orig":   { tr:"asıl", en:"original" }, "kf.semis": { tr:" yarım ses", en:" semitones" }, "kf.cents": { tr:" sent", en:" cents" },
    "kf.zoom":   { tr:"bölgeye yakınlaş", en:"zoom to selection" }, "kf.all": { tr:"tümünü göster", en:"show all" },
    "kf.mark":   { tr:"İşaret koy", en:"Add marker" }, "kf.delMark": { tr:"İşareti sil", en:"Delete marker" },
    "kf.toNotes":{ tr:"Seçili bölgeyi notaya dök", en:"Turn the selection into notes" },
    "kf.big":    { tr:"Dosya çok büyük (en çok 120 MB).", en:"The file is too large (120 MB at most)." },
    "kf.opening":{ tr:"Dosya açılıyor…", en:"Opening the file…" },
    "kf.bad":    { tr:"Dosya açılamadı. MP3, M4A, WAV ya da MP4 dene.", en:"Couldn't open the file. Try MP3, M4A, WAV or MP4." },
    "kf.tracing":{ tr:"Perde izi çıkarılıyor… %{n}", en:"Tracing the pitch… {n}%" },
    "kf.slowing":{ tr:"Yavaşlatılıyor… %{n}", en:"Slowing down… {n}%" },
    "kf.sel":    { tr:"Seçim {a}–{b}", en:"Selection {a}–{b}" },
    "kf.noMel":  { tr:"Bu bölgede ezgi bulunamadı.", en:"No melody found in this part." },
    "kf.added":  { tr:"{n} nota Parçalar'a eklendi: “{title}”. Akorları ve süreleri parça düzenleyicisinden düzeltebilirsin.",
                   en:"{n} notes added to Pieces: “{title}”. Fix the chords and durations in the piece editor." },
    "kf.wait":   { tr:"Önce perde izinin bitmesini bekle.", en:"Wait for the pitch trace to finish first." }
  });
  const root = $("kfroot");
  const F = { buf:null, mono:null, sr:44100, dur:0, name:"", key:"", trace:null };
  let head = 0, sel = null, view = null, play = null, rendered = null, renderTok = 0, raf = 0;
  const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + (s < 60 ? "," + Math.floor((s*10) % 10) : "");
  const prog = (txt, cls = "") => { $("kfprog").className = "cresult " + cls; $("kfprog").textContent = txt; };
  const speed = () => +$("kfspeed").value/100;
  const cents = () => +$("kfsemi").value*100 + +$("kffine").value;
  const marks = () => (store.get("kfMarks", {})[F.key] || []);
  const setMarks = m => { const all = store.get("kfMarks", {}); all[F.key] = m; store.set("kfMarks", all); drawMarks(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function build(){
    const opt = (v, txt) => `<option value="${v}">${txt}</option>`;
    root.innerHTML = `
    <section class="card">
      <p class="lead">${t("kf.desc")}</p>
      <div class="cbtns"><button class="primary small" id="kfopen" type="button">${t("kf.open")}</button>
        <input type="file" id="kffile" accept="audio/*,video/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.mp4,.webm" hidden>
        <span class="reg" id="kfname"></span></div>
      <div class="kfwrap" id="kfwrap" hidden>
        <canvas class="kfwave" id="kfwave" height="96" aria-label="${t("kf.wave")}"></canvas>
        <canvas class="kfpitch" id="kfpitch" height="120" aria-hidden="true"></canvas>
        <div class="kfnow"><span id="kftime">0:00</span><b id="kfnote">—</b><span class="reg" id="kfsel"></span></div>
        <div class="cbtns">
          <button class="primary small" id="kfplay" type="button">${t("kf.play")}</button>
          <button class="stopbtn" id="kfback" type="button" aria-label="${t("kf.back")}">−2 s</button>
          <button class="stopbtn" id="kffwd" type="button" aria-label="${t("kf.fwd")}">+2 s</button>
          <button class="stopbtn" id="kfa" type="button">A</button><button class="stopbtn" id="kfb" type="button">B</button>
          <label class="chk"><input type="checkbox" id="kfloop"> ${t("kf.loop")}</label>
          <button class="stopbtn" id="kfclear" type="button">${t("kf.clear")}</button>
        </div>
        <div class="row">
          <div class="field"><label class="label" for="kfspeed">${t("kf.speed")}</label>
            <span class="stepper"><input id="kfspeed" type="range" min="25" max="125" step="5" value="100"><em id="kfspeedv"></em></span></div>
          <div class="field"><label class="label" for="kfsemi">${t("kf.pitch")}</label><select id="kfsemi">${Array.from({ length:25 }, (_, i) => i - 12).map(v => opt(v, v === 0 ? t("kf.orig") : (v > 0 ? "+" : "−") + Math.abs(v) + t("kf.semis"))).join("")}</select></div>
          <div class="field"><label class="label" for="kffine">${t("kf.fine")}</label><select id="kffine">${[-50,-40,-30,-20,-10,0,10,20,30,40,50].map(v => opt(v, v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v) + t("kf.cents"))).join("")}</select></div>
          <div class="field"><label class="label">&nbsp;</label><button class="stopbtn" id="kfzoom" type="button">${t("kf.zoom")}</button></div>
        </div>
        <div class="cbtns"><button class="stopbtn" id="kfmark" type="button">${t("kf.mark")}</button><span class="kfmarks" id="kfmarks"></span></div>
        <div class="cbtns"><button class="stopbtn" id="kfnota" type="button">${t("kf.toNotes")}</button></div>
      </div>
      <div class="cresult" id="kfprog" aria-live="polite"></div>
    </section>`;
    $("kfopen").addEventListener("click", () => $("kffile").click());
    $("kffile").addEventListener("change", openFile);
    $("kfspeed").value = store.get("kfSpeed", 100); speedText();
    $("kfsemi").value = "0"; $("kffine").value = "0";
    $("kfspeed").addEventListener("input", speedText);
    $("kfspeed").addEventListener("change", () => { store.set("kfSpeed", +$("kfspeed").value); rendered = null; if(play) startPlay(); });
    ["kfsemi", "kffine"].forEach(id => $(id).addEventListener("change", () => { rendered = null; draw(); if(play) startPlay(); }));
    $("kfloop").addEventListener("change", () => { if(play) startPlay(); });
    $("kfplay").addEventListener("click", () => { if(!F.mono) return; if(play){ head = curPos(); stopPlay(); draw(); } else startPlay(); });
    $("kfback").addEventListener("click", () => seek(-2));
    $("kffwd").addEventListener("click", () => seek(2));
    $("kfa").addEventListener("click", () => { const x = curPos(); sel = [x, sel && sel[1] > x ? sel[1] : Math.min(F.dur, x + 4)]; rendered = null; draw(); });
    $("kfb").addEventListener("click", () => { const x = curPos(); sel = [sel && sel[0] < x ? sel[0] : Math.max(0, x - 4), x]; $("kfloop").checked = true; rendered = null; draw(); });
    $("kfclear").addEventListener("click", () => { sel = null; view = null; rendered = null; draw(); });
    $("kfzoom").addEventListener("click", () => {
      if(view){ view = null; $("kfzoom").textContent = t("kf.zoom"); }
      else if(sel){ const m = (sel[1] - sel[0])*0.15; view = [Math.max(0, sel[0] - m), Math.min(F.dur, sel[1] + m)]; $("kfzoom").textContent = t("kf.all"); }
      draw();
    });
    $("kfmark").addEventListener("click", () => { setMarks([...marks(), curPos()].sort((a, b) => a - b)); draw(); });
    $("kfmarks").addEventListener("click", e => {
      const g = e.target.closest("[data-go]"), d = e.target.closest("[data-del]"), m = marks();
      if(g){ const i = +g.dataset.go; head = m[i]; if(m[i + 1] != null) sel = [m[i], m[i + 1]]; rendered = null; if(play) startPlay(); else draw(); }
      if(d){ m.splice(+d.dataset.del, 1); setMarks(m); draw(); }
    });
    $("kfnota").addEventListener("click", toNotes);
    // Dalga biçimi: dokun → konum, sürükle → bölge
    let drag = null;
    const tAt = ev => { const r = $("kfwave").getBoundingClientRect(), [v0, v1] = V(); return Math.max(0, Math.min(F.dur, v0 + (ev.clientX - r.left)/r.width*(v1 - v0))); };
    $("kfwave").addEventListener("pointerdown", ev => { if(!F.mono) return; drag = { t0: tAt(ev), moved:false }; try{ $("kfwave").setPointerCapture(ev.pointerId); }catch(e){} });
    $("kfwave").addEventListener("pointermove", ev => {
      if(!drag) return;
      const x = tAt(ev);
      if(Math.abs(x - drag.t0) > (V()[1] - V()[0])*0.01){ drag.moved = true; sel = [Math.min(drag.t0, x), Math.max(drag.t0, x)]; draw(); }
    });
    $("kfwave").addEventListener("pointerup", ev => {
      if(!drag) return;
      const d = drag; drag = null;
      if(d.moved){ head = sel[0]; $("kfloop").checked = true; rendered = null; }
      else head = tAt(ev);
      if(play) startPlay(); else draw();
    });
    if(F.mono){ $("kfwrap").hidden = false; $("kfname").textContent = F.name + " · " + fmt(F.dur); draw(); drawMarks(); }
  }
  const speedText = () => { $("kfspeedv").textContent = t("pc.pct", { n: $("kfspeed").value }); };
  const seek = dt => { head = Math.max(0, Math.min(F.dur, curPos() + dt)); if(play) startPlay(); else draw(); };

  async function openFile(){
    const f = $("kffile").files[0]; $("kffile").value = "";
    if(!f) return;
    if(f.size > 120*1024*1024){ prog(t("kf.big"), "no"); return; }
    stopPlay(); prog(t("kf.opening"));
    try{
      const ab = await f.arrayBuffer(), a = Snd.ctx(), buf = await a.decodeAudioData(ab);
      const n = buf.length, nch = buf.numberOfChannels, mono = new Float32Array(n);
      for(let ch=0;ch<nch;ch++){ const d = buf.getChannelData(ch); for(let i=0;i<n;i++) mono[i] += d[i]/nch; }
      Object.assign(F, { buf, mono, sr: buf.sampleRate, dur: buf.duration, name: f.name, key: f.name + "|" + Math.round(buf.duration), trace:null });
    }catch(e){ prog(t("kf.bad"), "no"); return; }
    head = 0; sel = null; view = null; rendered = null;
    $("kfname").textContent = F.name + " · " + fmt(F.dur);
    $("kfwrap").hidden = false; prog("");
    draw(); drawMarks(); traceAll();
  }
  // Perde izi: arayüz donmasın diye parça parça
  async function traceAll(){
    const key = F.key, g = pitchTraceGen(F.mono, F.sr);
    let r = g.next();
    while(!r.done){ prog(t("kf.tracing", { n: Math.round(r.value*100) })); await sleep(0); if(F.key !== key) return; r = g.next(); }
    F.trace = r.value; prog(""); draw();
  }

  // ---- Çizim ----
  const V = () => view || [0, F.dur];
  const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  function draw(){
    if(!F.mono) return;
    const cv = $("kfwave"), dpr = window.devicePixelRatio || 1, W = cv.width = Math.max(300, (cv.clientWidth || 600)*dpr), H = cv.height = 96*dpr;
    const g = cv.getContext && cv.getContext("2d");
    if(g){
      const [v0, v1] = V(), x = s => (s - v0)/(v1 - v0)*W;
      g.clearRect(0, 0, W, H);
      if(sel){ g.fillStyle = css("--teal") || "#0a8"; g.globalAlpha = 0.18; g.fillRect(x(sel[0]), 0, x(sel[1]) - x(sel[0]), H); g.globalAlpha = 1; }
      g.fillStyle = css("--muted") || "#888";
      const s0 = Math.floor(v0*F.sr), per = Math.max(1, Math.floor((v1 - v0)*F.sr/W));
      for(let px=0; px<W; px++){
        let mn = 0, mx = 0; const a = s0 + px*per;
        for(let i=a; i<a + per && i < F.mono.length; i += Math.max(1, per >> 6)){ const v = F.mono[i]; if(v < mn) mn = v; if(v > mx) mx = v; }
        g.fillRect(px, H/2 - mx*H/2, 1, Math.max(1, (mx - mn)*H/2));
      }
      g.fillStyle = css("--ink") || "#222"; marks().forEach(m => g.fillRect(x(m) - 1, 0, 2, 10*dpr));
      g.fillStyle = css("--accent") || "#a50"; g.fillRect(x(head) - 1, 0, 2*dpr, H);
    }
    drawPitch(); info();
  }
  function drawPitch(){
    const cv = $("kfpitch"), dpr = window.devicePixelRatio || 1, W = cv.width = Math.max(300, (cv.clientWidth || 600)*dpr), H = cv.height = 120*dpr;
    const g = cv.getContext && cv.getContext("2d");
    if(!g) return;
    g.clearRect(0, 0, W, H);
    if(!F.trace) return;
    const [v0, v1] = V(), sh = cents()/100, pts = F.trace.filter(p => p.t >= v0 && p.t <= v1 && p.w !== null).map(p => [p.t, p.w + sh]);
    if(!pts.length) return;
    const ws = pts.map(p => p[1]).sort((a, b) => a - b), lo = ws[Math.floor(ws.length*0.03)] - 1.5, hi = ws[Math.floor(ws.length*0.97)] + 1.5;
    const x = s => (s - v0)/(v1 - v0)*W, y = w => H - (w - lo)/(hi - lo)*H;
    g.font = (10*dpr) + "px sans-serif"; g.fillStyle = css("--muted") || "#888"; g.strokeStyle = css("--line") || "#ddd";
    for(let w = Math.ceil(lo); w <= hi; w++) if([0,2,4,5,7,9,11].includes(((w % 12) + 12) % 12)){
      g.beginPath(); g.moveTo(0, y(w)); g.lineTo(W, y(w)); g.stroke(); g.fillText(noteLabel(w), 3, y(w) - 2);
    }
    g.fillStyle = css("--teal") || "#0a8";
    pts.forEach(([s, w]) => g.fillRect(x(s) - 1, y(w) - 1, 2*dpr, 2*dpr));
    g.fillStyle = css("--accent") || "#a50"; g.fillRect(x(head) - 1, 0, 2*dpr, H);
  }
  // Çalan yerin notası (izin o anki ortancası, kaydırmayla), sapma sent olarak; tel ve perde
  function info(){
    $("kftime").textContent = fmt(head) + " / " + fmt(F.dur);
    $("kfsel").textContent = sel ? t("kf.sel", { a: fmt(sel[0]), b: fmt(sel[1]) }) : "";
    let txt = "—";
    if(F.trace){
      const i = Math.min(F.trace.length - 1, Math.max(0, Math.round(head/0.02))), w = F.trace.slice(Math.max(0, i - 3), i + 4).map(p => p.w).filter(v => v !== null).sort((a, b) => a - b);
      if(w.length >= 3){
        const m = w[Math.floor(w.length/2)] + cents()/100, r = Math.round(m), c = Math.round((m - r)*100), ps = positionsFor(r);
        txt = noteLabel(r) + (Math.abs(c) >= 5 ? " " + (c > 0 ? "+" : "−") + Math.abs(c) + t("kf.cents") : "") + (ps.length ? " · " + t("mel.pos", { s: ps[0].string, f: ps[0].fret === 0 ? t("mel.open") : ps[0].fret }) : "");
      }
    }
    $("kfnote").textContent = txt;
  }
  function drawMarks(){
    $("kfmarks").innerHTML = marks().map((m, i) => `<span class="kfmk"><button type="button" class="stopbtn small" data-go="${i}">${fmt(m)}</button><button type="button" class="stopbtn small" data-del="${i}" aria-label="${t("kf.delMark")}">×</button></span>`).join("");
  }

  // ---- Çalma ----
  // Hız ya da perde değişmişse çalınacak parça (seçim ya da başlangıçtan 60 sn) WSOLA ile işlenir; sonuç saklanır.
  const plainPlay = () => Math.abs(speed() - 1) < 1e-6 && Math.abs(cents()) < 0.5;
  async function renderSpan(a0, a1){
    const tok = ++renderTok, x = F.mono.subarray(Math.floor(a0*F.sr), Math.ceil(a1*F.sr));
    const g = stretchShiftGen(x, F.sr, speed(), cents());
    let r = g.next();
    while(!r.done){ prog(t("kf.slowing", { n: Math.round(r.value*100) })); await sleep(0); if(tok !== renderTok) return null; r = g.next(); }
    prog("");
    const a = Snd.ctx(), b = a.createBuffer(1, r.value.length, F.sr); b.copyToChannel(r.value, 0);
    return { a0, a1, speed: speed(), cents: cents(), buf: b };
  }
  function curPos(){
    if(!play) return head;
    const el = (Snd.ctx().currentTime - play.t0)*play.rate, len = play.a1 - play.a0;
    return play.a0 + (play.loop ? el % len : Math.min(el, len));
  }
  async function startPlay(){
    stopPlay(); Bus.emit("stopall");
    const loop = $("kfloop").checked && !!sel;
    let a0 = loop ? sel[0] : head, a1 = loop ? sel[1] : F.dur;
    if(!loop && head >= F.dur - 0.05) a0 = head = 0;
    const a = Snd.ctx(), src = a.createBufferSource();
    let rate = 1;
    if(plainPlay()) src.buffer = F.buf;
    else{
      if(!loop) a1 = Math.min(F.dur, a0 + 60);
      if(!(rendered && rendered.a0 === a0 && rendered.a1 === a1 && rendered.speed === speed() && rendered.cents === cents())){
        $("kfplay").disabled = true;
        const r = await renderSpan(a0, a1);
        $("kfplay").disabled = false;
        if(!r) return;
        rendered = r;
      }
      src.buffer = rendered.buf; rate = speed();
    }
    const startIn = plainPlay() ? a0 : 0;
    src.loop = loop;
    if(loop){ src.loopStart = plainPlay() ? sel[0] : 0; src.loopEnd = plainPlay() ? sel[1] : src.buffer.duration; }
    src.connect(a.destination);
    const t0 = a.currentTime + 0.03;
    src.start(t0, startIn, loop ? undefined : (plainPlay() ? F.dur - startIn : src.buffer.duration));
    play = { src, t0, a0, a1, loop, rate };
    src.onended = () => { if(play && play.src === src){ head = loop ? sel[0] : a1; stopPlay(); draw(); } };
    $("kfplay").textContent = t("kf.stop");
    const tick = () => { if(!play) return; head = curPos(); draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  function stopPlay(){
    if(play){ const p = play; play = null; try{ p.src.onended = null; p.src.stop(); }catch(e){} p.src.disconnect(); }
    cancelAnimationFrame(raf);
    if($("kfplay")) $("kfplay").textContent = t("kf.play");
  }
  // Seçili bölge (yoksa 30 sn) → perde izinden notalar → Parçalar'da yeni parça
  function toNotes(){
    if(!F.mono) return;
    if(!F.trace){ prog(t("kf.wait")); return; }
    const s = sel || [head, Math.min(F.dur, head + 30)], sh = cents()/100;
    const tr = F.trace.filter(p => p.t >= s[0] && p.t <= s[1]).map(p => ({ ...p, w: p.w === null ? null : p.w + sh }));
    const ns = traceNotes(tr).filter(n => n.w >= writtenRange().low && n.w <= 96);
    if(ns.length < 2){ prog(t("kf.noMel"), "no"); return; }
    const pc = notesToPiece(ns), title = F.name.replace(/\.[^.]+$/, "") + " " + fmt(s[0]);
    stopPlay();
    Pieces.importPiece({ title, text: pc.text, bpm: pc.bpm, meter:"4/4", key:"C" });
    prog(t("kf.added", { n: ns.length, title }), "ok");
  }

  document.addEventListener("keydown", ev => {
    if($("panel-kulaktan").hidden || !F.mono || ev.target.closest("input, select, textarea, button")) return;
    if(ev.key === " "){ ev.preventDefault(); $("kfplay").click(); }
    else if(ev.key === "ArrowLeft"){ ev.preventDefault(); seek(-2); }
    else if(ev.key === "ArrowRight"){ ev.preventDefault(); seek(2); }
  });
  window.addEventListener("resize", () => { if(F.mono && !$("panel-kulaktan").hidden) draw(); });
  Bus.on("tab", id => { if(id === "kulaktan") draw(); else if(play){ head = curPos(); stopPlay(); } });
  Bus.on("lang", () => { stopPlay(); build(); });
  build();
  return { get loaded(){ return !!F.mono; } };
})();
