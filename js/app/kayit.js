// Kayıt sekmesi: kendini kaydet (en çok 3 dakika), dinle, perde eğrisi ve nota dökümü; entonasyon (notaların tampere
// sesten ortalama sapması, sent) ve en çok kaçan notalar. Kayıtlar cihazda (IndexedDB) tarihle saklanır: son 50,
// ★ ile işaretlenenler silinmez. İki kaydı karşılaştır: üst üste perde eğrileri, ortalama sapma farkı, art arda dinleme.
// (Sol Klarnet'teki Kayıt'ın gitar sürümü.)
const Kayit = (() => {
  defStr({
    "rc.desc":   { tr:"Kendini kaydet ve dinle. Kayıttan sonra perde eğrisi, nota dökümü ve entonasyonun (her notanın tam sese uzaklığı) çıkar; eski bir kayıtla karşılaştırıp ilerlemeni görebilirsin. Kayıtlar yalnız bu cihazda saklanır.",
                   en:"Record yourself and listen back. Afterwards you get the pitch curve, a note list and your intonation (how far each note is from the exact pitch); compare with an older take to see your progress. Recordings stay on this device only." },
    "rc.rec":    { tr:"● Kaydet", en:"● Record" }, "rc.stop": { tr:"■ Bitir", en:"■ Finish" },
    "rc.list":   { tr:"Kayıtlar", en:"Recordings" }, "rc.none": { tr:"Henüz kayıt yok.", en:"No recordings yet." },
    "rc.play":   { tr:"Dinle", en:"Listen" }, "rc.del": { tr:"Sil", en:"Delete" }, "rc.save": { tr:"İndir", en:"Download" },
    "rc.star":   { tr:"Sakla (silinmesin)", en:"Keep (don't auto-delete)" },
    "rc.cmp":    { tr:"Karşılaştır", en:"Compare" }, "rc.cmpWith": { tr:"Şununla karşılaştır:", en:"Compare with:" },
    "rc.cmpNone":{ tr:"karşılaştırma yok", en:"no comparison" },
    "rc.noMic":  { tr:"Mikrofon açılamadı; kayıt için mikrofon izni gerekir.", en:"Microphone failed; recording needs microphone permission." },
    "rc.noRec":  { tr:"Bu tarayıcı ses kaydını desteklemiyor.", en:"This browser can't record audio." },
    "rc.noDb":   { tr:"Bu tarayıcıda kayıtlar saklanamıyor (özel pencere olabilir).", en:"Recordings can't be stored in this browser (maybe a private window)." },
    "rc.recording":{ tr:"Kaydediliyor… {s} (en çok 3:00)", en:"Recording… {s} (3:00 at most)" },
    "rc.analyzing":{ tr:"İnceleniyor…", en:"Analysing…" },
    "rc.notes":  { tr:"{n} nota", en:"{n} notes" },
    "rc.dev":    { tr:"ortalama sapma {c} sent", en:"average deviation {c} cents" },
    "rc.flat":   { tr:"pes", en:"flat" }, "rc.sharp": { tr:"tiz", en:"sharp" },
    "rc.worst":  { tr:"En çok kayan notalar: {list}", en:"Notes off the most: {list}" },
    "rc.better": { tr:"Önceki kayda göre sapma {d} sent azaldı 👍", en:"Deviation down {d} cents vs. the other take 👍" },
    "rc.worse":  { tr:"Önceki kayda göre sapma {d} sent arttı; akortu ve parmak basıncını kontrol et.", en:"Deviation up {d} cents vs. the other take; check your tuning and finger pressure." },
    "rc.same":   { tr:"İki kayıtta sapma aşağı yukarı aynı.", en:"Deviation is about the same in both takes." },
    "rc.legend": { tr:"turkuaz: bu kayıt · turuncu: karşılaştırılan", en:"teal: this take · orange: compared take" },
    "rc.delAsk": { tr:"Bu kayıt silinsin mi?", en:"Delete this recording?" }
  });
  const root = $("rcroot");
  let db = null, list = [], cur = null, cmp = null, rec = null, playing = null;
  const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const when = t => new Date(t).toLocaleString(LANG === "en" ? "en-GB" : "tr-TR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

  // ---- IndexedDB ----
  function open(){
    if(db) return Promise.resolve(db);
    return new Promise(res => {
      try{
        if(!window.indexedDB) return res(null);
        const r = indexedDB.open("pena", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("rec", { keyPath:"id" });
        r.onsuccess = () => res(db = r.result);
        r.onerror = () => res(null);
      }catch(e){ res(null); }
    });
  }
  const tx = (mode, fn) => open().then(d => d && new Promise((res, rej) => { const s = d.transaction("rec", mode).objectStore("rec"); const q = fn(s); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
  async function load(){
    const all = await tx("readonly", s => s.getAll()).catch(() => null);
    list = (all || []).sort((a, b) => b.t - a.t);
    // Son 50 kayıt; ★ olanlar sayılmaz, silinmez
    const extra = list.filter(r => !r.star).slice(50);
    for(const r of extra) await tx("readwrite", s => s.delete(r.id));
    list = list.filter(r => !extra.includes(r));
  }

  // ---- Kayıt ----
  async function start(){
    if(!window.MediaRecorder){ msg(t("rc.noRec")); return; }
    if(!(await open())){ msg(t("rc.noDb")); return; }
    Bus.emit("stopall");
    let stream;
    try{ stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } }); }
    catch(e){ msg(t("rc.noMic")); return; }
    const mr = new MediaRecorder(stream), chunks = [], t0 = Date.now();
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(x => x.stop());
      clearInterval(rec.timer); rec = null; draw();
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      msg(t("rc.analyzing"));
      const r = { id: "r" + t0, t: t0, dur: (Date.now() - t0)/1000, blob, mime: blob.type, star:false };
      try{ Object.assign(r, await analyze(blob)); }catch(e){}
      await tx("readwrite", s => s.put(r)).catch(() => {});
      await load(); cur = list.find(x => x.id === r.id) || null; msg(""); draw();
    };
    mr.start(500);
    rec = { mr, t0, timer: setInterval(() => { const s = (Date.now() - t0)/1000; msg(t("rc.recording", { s: fmt(s) })); if(s >= 180) mr.stop(); }, 250) };
    draw();
  }
  // Kaydı çözüp perde izi, notalar ve entonasyon çıkarılır (sonuç kayıtla saklanır)
  async function analyze(blob){
    const a = Snd.ctx(), buf = await a.decodeAudioData(await blob.arrayBuffer());
    const n = buf.length, mono = new Float32Array(n);
    for(let ch = 0; ch < buf.numberOfChannels; ch++){ const d = buf.getChannelData(ch); for(let i = 0; i < n; i++) mono[i] += d[i]/buf.numberOfChannels; }
    const tr = runGen(pitchTraceGen(mono, buf.sampleRate, { minRms: sensitivityToRms(settings.sens) }));
    const ns = traceNotes(tr).filter(x => x.w >= writtenRange().low - 1);
    // Her notanın tampere sesten sapması: notadaki izin ortancası
    const devs = ns.map(x => { const ws = tr.filter(p => p.w != null && p.t >= x.t && p.t <= x.t + x.dur).map(p => p.w); return ws.length ? Math.round((median(ws) - x.w)*100) : 0; });
    return { dur: buf.duration, trace: tr.map(p => p.w == null ? null : Math.round(p.w*100)/100), notes: ns.map((x, i) => [Math.round(x.t*100)/100, x.w, devs[i]]) };
  }
  function stats(r){
    if(!r || !r.notes || !r.notes.length) return null;
    const ds = r.notes.map(x => x[2]), avg = Math.round(ds.reduce((s, d) => s + Math.abs(d), 0)/ds.length), bias = Math.round(ds.reduce((s, d) => s + d, 0)/ds.length);
    const by = {};
    r.notes.forEach(([, w, d]) => { (by[w] = by[w] || []).push(d); });
    const worst = Object.entries(by).filter(([, v]) => v.length >= 2).map(([w, v]) => [+w, Math.round(v.reduce((s, d) => s + d, 0)/v.length)])
      .filter(([, d]) => Math.abs(d) >= 15).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
    return { avg, bias, worst, n: r.notes.length };
  }

  // ---- Arayüz ----
  const msg = s => { const e = $("rcmsg"); if(e) e.textContent = s; };
  function draw(){
    const st = stats(cur), sc = stats(cmp);
    root.innerHTML = `
    <section class="card">
      <p class="lead">${t("rc.desc")}</p>
      <div class="cbtns"><button type="button" class="primary small${rec ? " rec" : ""}" id="rcbtn">${rec ? t("rc.stop") : t("rc.rec")}</button></div>
      <div class="cresult" id="rcmsg" aria-live="polite"></div>
      ${cur ? `<div class="rcsel">
        <div class="label">${when(cur.t)} · ${fmt(cur.dur)}</div>
        <canvas class="kfpitch" id="rccv" height="140" aria-hidden="true"></canvas>
        ${cmp ? `<small class="reg">${t("rc.legend")}</small>` : ""}
        <p class="lead">${st ? t("rc.notes", { n: st.n }) + " · " + t("rc.dev", { c: st.avg }) + (Math.abs(st.bias) >= 8 ? " (" + t(st.bias < 0 ? "rc.flat" : "rc.sharp") + ")" : "") : ""}</p>
        ${st && st.worst.length ? `<p class="lead">${t("rc.worst", { list: st.worst.map(([w, d]) => noteLabel(w) + " " + (d > 0 ? "+" : "−") + Math.abs(d)).join(", ") })}</p>` : ""}
        ${st && sc ? `<p class="lead"><b>${sc.avg - st.avg >= 3 ? t("rc.better", { d: sc.avg - st.avg }) : st.avg - sc.avg >= 3 ? t("rc.worse", { d: st.avg - sc.avg }) : t("rc.same")}</b></p>` : ""}
        <p class="rcnotes">${cur.notes ? cur.notes.slice(0, 80).map(x => noteLabel(x[1])).join(" ") : ""}</p>
        <div class="row"><div class="field grow"><label class="label" for="rccmp">${t("rc.cmpWith")}</label><select id="rccmp">
          <option value="">${t("rc.cmpNone")}</option>${list.filter(r => r.id !== cur.id).map(r => `<option value="${r.id}"${cmp && cmp.id === r.id ? " selected" : ""}>${when(r.t)} · ${fmt(r.dur)}</option>`).join("")}</select></div></div>
      </div>` : ""}
      <div class="label">${t("rc.list")}</div>
      ${list.length ? `<ul class="prrecs rclist">${list.map(r => `<li class="${cur && cur.id === r.id ? "on" : ""}"><span><b>${r.star ? "★ " : ""}${when(r.t)}</b><small>${fmt(r.dur)}${r.notes ? " · " + t("rc.notes", { n: r.notes.length }) : ""}</small></span>
        <span class="cbtns"><button type="button" class="stopbtn small" data-play="${r.id}">${playing && playing.id === r.id ? "■" : t("rc.play")}</button>
        <button type="button" class="stopbtn small" data-sel="${r.id}">${t("rc.cmp")}</button>
        <button type="button" class="stopbtn small" data-star="${r.id}" aria-label="${t("rc.star")}" title="${t("rc.star")}">${r.star ? "★" : "☆"}</button>
        <button type="button" class="stopbtn small" data-dl="${r.id}">${t("rc.save")}</button>
        <button type="button" class="stopbtn small" data-del="${r.id}">${t("rc.del")}</button></span></li>`).join("")}</ul>` : `<p class="lead">${t("rc.none")}</p>`}
    </section>`;
    $("rcbtn").addEventListener("click", () => rec ? rec.mr.stop() : start());
    root.querySelector(".rclist") && root.querySelector(".rclist").addEventListener("click", onList);
    if($("rccmp")) $("rccmp").addEventListener("change", () => { cmp = list.find(r => r.id === $("rccmp").value) || null; draw(); });
    curve();
  }
  async function onList(e){
    const b = e.target.closest("button"); if(!b) return;
    const id = Object.values(b.dataset)[0], r = list.find(x => x.id === id); if(!r) return;
    if(b.dataset.play) togglePlay(r);
    else if(b.dataset.sel){ cur = r; if(cmp && cmp.id === r.id) cmp = null; draw(); }
    else if(b.dataset.star){ r.star = !r.star; await tx("readwrite", s => s.put(r)); draw(); }
    else if(b.dataset.dl){ const a = document.createElement("a"); a.href = URL.createObjectURL(r.blob); a.download = "pena-kayit-" + dayKey(r.t) + (/ogg/.test(r.mime) ? ".ogg" : /mp4|aac/.test(r.mime) ? ".m4a" : ".webm"); document.body.append(a); a.click(); a.remove(); }
    else if(b.dataset.del){ if(!confirm(t("rc.delAsk"))) return; await tx("readwrite", s => s.delete(r.id)); if(cur === r) cur = null; if(cmp === r) cmp = null; await load(); draw(); }
  }
  function togglePlay(r){
    if(playing){ const p = playing; playing = null; p.audio.pause(); URL.revokeObjectURL(p.audio.src); if(p.id === r.id){ draw(); return; } }
    Bus.emit("stopall");
    const audio = new Audio(URL.createObjectURL(r.blob));
    playing = { id: r.id, audio };
    audio.onended = () => { if(playing && playing.audio === audio){ playing = null; draw(); } };
    audio.play().catch(() => { playing = null; });
    draw();
  }
  // Perde eğrisi: bu kayıt turkuaz, karşılaştırılan turuncu; yatay çizgiler doğal notalar
  function curve(){
    const cv = $("rccv"); if(!cv || !cur || !cur.trace) return;
    const dpr = window.devicePixelRatio || 1, W = cv.width = Math.max(300, (cv.clientWidth || 600)*dpr), H = cv.height = 140*dpr;
    const g = cv.getContext && cv.getContext("2d"); if(!g) return;
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const sets = [[cur, css("--teal") || "#0a8"], ...(cmp && cmp.trace ? [[cmp, css("--accent") || "#a50"]] : [])];
    const ws = sets.flatMap(([r]) => r.trace.filter(v => v != null)).sort((a, b) => a - b);
    if(!ws.length) return;
    const lo = ws[Math.floor(ws.length*0.02)] - 1.5, hi = ws[Math.floor(ws.length*0.98)] + 1.5, dur = Math.max(...sets.map(([r]) => r.trace.length));
    const y = w => H - (w - lo)/(hi - lo)*H;
    g.clearRect(0, 0, W, H); g.font = (10*dpr) + "px sans-serif"; g.strokeStyle = css("--line") || "#ddd"; g.fillStyle = css("--muted") || "#888";
    for(let w = Math.ceil(lo); w <= hi; w++) if([0,2,4,5,7,9,11].includes(((w % 12) + 12) % 12)){ g.beginPath(); g.moveTo(0, y(w)); g.lineTo(W, y(w)); g.stroke(); g.fillText(noteLabel(w), 3, y(w) - 2); }
    for(const [r, col] of sets){ g.fillStyle = col; r.trace.forEach((v, i) => { if(v != null) g.fillRect(i/dur*W, y(v) - dpr, 2*dpr, 2*dpr); }); }
  }
  Bus.on("tab", id => { if(id === "kayit") load().then(draw); else if(playing) togglePlay(list.find(r => r.id === playing.id) || { id:null }); });
  Bus.on("lang", draw);
  Bus.on("stopall", () => { if(playing){ const p = playing; playing = null; p.audio.pause(); draw(); } });
  draw();
  return { get recording(){ return !!rec; } };
})();
