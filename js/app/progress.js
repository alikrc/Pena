// İlerleme sekmesi: mikrofon açıkken ses duyulan süre gün gün sayılır; seri, günlük hedef, son 14 gün, haftalık özet
// ve başarı kayıtlarından rekorlar (parçalar, şarkılar, ritim, akor değiştirme, kulak, dersler).
// Yedekleme: bütün ilerleme ("gt." anahtarları) tek JSON dosyası olarak indirilir ve geri yüklenir.
const Progress = (() => {
  defStr({
    "pr.streak":   { tr:"Seri", en:"Streak" },
    "pr.days":     { tr:"{n} gün", en:"{n} days" },
    "pr.best":     { tr:"en uzun: {n} gün", en:"longest: {n} days" },
    "pr.today":    { tr:"Bugün", en:"Today" },
    "pr.goal":     { tr:"Günlük hedef", en:"Daily goal" },
    "pr.min":      { tr:"{n} dk", en:"{n} min" },
    "pr.goalDone": { tr:"Bugünün hedefi tamam ✓", en:"Today's goal done ✓" },
    "pr.goalLeft": { tr:"Hedefe {n} dk kaldı", en:"{n} min to go" },
    "pr.week":     { tr:"Bu hafta {a} · geçen hafta {b}", en:"This week {a} · last week {b}" },
    "pr.last14":   { tr:"Son 14 gün (mikrofon açıkken çaldığın süre)", en:"Last 14 days (time you played with the microphone on)" },
    "pr.records":  { tr:"Rekorlar", en:"Records" },
    "pr.none":     { tr:"Henüz kayıt yok. Bir parça, şarkı ya da ritim alıştırması bitirince burada görünür.", en:"Nothing yet. Finish a piece, song or rhythm exercise and it shows up here." },
    "pr.tries":    { tr:"{n} deneme", en:"{n} tries" },
    "pr.lessons":  { tr:"Dersler: {n}/{all} tamam", en:"Lessons: {n}/{all} done" },
    "pr.t.piece":  { tr:"Parça", en:"Piece" }, "pr.t.song": { tr:"Şarkı", en:"Song" }, "pr.t.rhythm": { tr:"Ritim", en:"Rhythm" },
    "pr.t.changes":{ tr:"Akor değiştirme (dakikada)", en:"Chord changes (per minute)" }, "pr.t.ear": { tr:"Kulak", en:"Ear" },
    "pr.t.melody": { tr:"Ezgi", en:"Melody" }, "pr.t.chordClean": { tr:"Temiz akor", en:"Clean chord" }, "pr.t.tuned": { tr:"Akort", en:"Tuning" },
    "pr.t.drill":  { tr:"Alıştırma", en:"Drill" },
    "pr.backup":   { tr:"Yedekle", en:"Back up" }, "pr.restore": { tr:"Yedeği geri yükle", en:"Restore backup" },
    "pr.bkHelp":   { tr:"Bütün ilerleme, ayarlar, kendi şarkı ve parçaların tek bir dosyaya iner; telefon değişince geri yükle. Kayıtlar (ses) yedeğe girmez.",
                     en:"All progress, settings and your own songs and pieces go into one file; restore it on a new phone. Audio recordings aren't included." },
    "pr.bkBad":    { tr:"Bu dosya Pena yedeği değil.", en:"This file isn't a Pena backup." },
    "pr.bkAsk":    { tr:"Yedek yüklensin mi? Şu anki ilerlemenin üstüne yazılır.", en:"Restore the backup? It overwrites your current progress." },
    "pr.bkDone":   { tr:"Yedek yüklendi; sayfa yenileniyor.", en:"Backup restored; reloading." }
  });
  const root = $("prroot");
  let days = store.get("practice", {}), log = store.get("log", []), acc = 0, lastSave = 0;
  // Ses duyulan kareler sayılır (mikrofon her ~45 ms'de bir kare verir; aradaki süre en çok 0,2 sn sayılır)
  let lastFrame = 0;
  Bus.on("frame", ({ now, loud }) => {
    const dt = lastFrame ? Math.min(0.2, (now - lastFrame)/1000) : 0; lastFrame = now;
    if(!loud) return;
    acc += dt;
    if(acc >= 5 || now - lastSave > 15000){ flush(); lastSave = now; }
  });
  Bus.on("mic", on => { lastFrame = 0; if(!on) flush(); });
  function flush(){
    if(acc <= 0) return;
    const k = dayKey(Date.now());
    days = store.get("practice", {}); days[k] = Math.round(((days[k] || 0) + acc)*10)/10; acc = 0;
    store.set("practice", days);
    if(!$("panel-ilerleme").hidden) render();
  }
  Bus.on("achieve", ev => {
    log = store.get("log", []);
    log.push({ t: Date.now(), ...ev });
    if(log.length > 500) log = log.slice(-500);
    store.set("log", log);
    if(!$("panel-ilerleme").hidden) render();
  });
  window.addEventListener("pagehide", flush);

  const fmtMin = s => t("pr.min", { n: Math.round(s/60) });
  function title(r){
    if(r.title) return r.title;
    if(r.type === "piece"){ const p = pieceById(r.id); return p ? L(p, "title") : r.id; }
    if(r.type === "song"){ const s = songById(r.id) || store.get("songs", []).find(u => u.id === r.id); return s ? L(s, "title") : r.id; }
    if(r.type === "rhythm"){ const x = rhythmById(r.id); return x ? L(x, "name") : r.id; }
    if(r.type === "melody"){ const m = melodyById(r.id); return m ? L(m, "title") : r.id; }
    return r.id;
  }
  function render(){
    const today = dayKey(Date.now()), goal = store.get("goalMin", 10), sec = (days[today] || 0) + acc;
    const st = streak(days, today), d14 = lastDays(days, today, 14), mx = Math.max(goal*60, ...d14.map(d => d.sec));
    const bars = d14.map((d, i) => { const h = Math.round(d.sec/mx*60), x = i*22 + 4;
      return `<rect class="prbar${d.sec >= goal*60 ? " ok" : ""}" x="${x}" y="${66 - h}" width="16" height="${Math.max(1, h)}" rx="3"><title>${d.key}: ${fmtMin(d.sec)}</title></rect>
        <text class="prday" x="${x + 8}" y="80">${+d.key.slice(8)}</text>`; }).join("");
    const gy = 66 - Math.round(goal*60/mx*60);
    const recs = records(log).filter(r => r.type !== "tuned");
    const les = store.get("lessons", {}), lesDone = Object.values(les).filter(Boolean).length;
    root.innerHTML = `
    <section class="card">
      <div class="prtop">
        <div class="prstat"><div class="label">${t("pr.streak")}</div><b>${t("pr.days", { n: st })}</b><small>${t("pr.best", { n: bestStreak(days) })}</small></div>
        <div class="prstat"><div class="label">${t("pr.today")}</div><b>${fmtMin(sec)}</b>
          <div class="prgoal"><i style="width:${Math.min(100, Math.round(sec/(goal*60)*100))}%"></i></div>
          <small>${sec >= goal*60 ? t("pr.goalDone") : t("pr.goalLeft", { n: Math.max(1, Math.ceil(goal - sec/60)) })}</small></div>
        <div class="prstat"><label class="label" for="prgoal">${t("pr.goal")}</label>
          <select id="prgoal">${[5,10,15,20,30,45,60].map(m => `<option value="${m}"${m === goal ? " selected" : ""}>${t("pr.min", { n: m })}</option>`).join("")}</select>
          <small>${t("pr.week", { a: fmtMin(weekTotal(days, today)), b: fmtMin(weekTotal(days, today, 1)) })}</small></div>
      </div>
      <div class="label">${t("pr.last14")}</div>
      <svg class="prchart" viewBox="0 0 312 84" role="img" aria-label="${t("pr.last14")}">${bars}<line class="prgl" x1="0" x2="312" y1="${gy}" y2="${gy}"/></svg>
      <p class="lead">${t("pr.lessons", { n: lesDone, all: typeof LESSONS !== "undefined" ? LESSONS.length : lesDone })}</p>
      <div class="label">${t("pr.records")}</div>
      ${recs.length ? `<ul class="prrecs">${recs.slice(0, 40).map(r => `<li><span><b>${esc(title(r))}</b><small>${t("pr.t." + r.type) || r.type} · ${t("pr.tries", { n: r.n })}</small></span>
        <em>${r.best == null ? "✓" : r.type === "changes" ? r.best : "%" + r.best}</em></li>`).join("")}</ul>` : `<p class="lead">${t("pr.none")}</p>`}
      <details class="help"><summary>${t("pr.backup")}</summary><p class="lead">${t("pr.bkHelp")}</p>
        <div class="cbtns"><button type="button" class="primary small" id="prbk">${t("pr.backup")}</button>
          <button type="button" class="stopbtn" id="prrs">${t("pr.restore")}</button><input type="file" id="prfile" accept=".json,application/json" hidden></div>
        <div class="cresult" id="prmsg"></div></details>
    </section>`;
    $("prgoal").addEventListener("change", () => { store.set("goalMin", +$("prgoal").value); render(); });
    $("prbk").addEventListener("click", backup);
    $("prrs").addEventListener("click", () => $("prfile").click());
    $("prfile").addEventListener("change", restore);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
  function backup(){
    flush();
    const data = {};
    for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(k.startsWith("gt.")) data[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app:"pena", v:1, date: new Date().toISOString(), data })], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pena-yedek-" + dayKey(Date.now()) + ".json";
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function restore(){
    const f = $("prfile").files[0]; $("prfile").value = "";
    if(!f) return;
    let j; try{ j = JSON.parse(await f.text()); }catch(e){ j = null; }
    if(!j || j.app !== "pena" || !j.data){ $("prmsg").textContent = t("pr.bkBad"); return; }
    if(!confirm(t("pr.bkAsk"))) return;
    for(const [k, v] of Object.entries(j.data)) if(k.startsWith("gt.")) localStorage.setItem(k, v);
    $("prmsg").textContent = t("pr.bkDone");
    setTimeout(() => location.reload(), 600);
  }
  Bus.on("tab", id => { if(id === "ilerleme"){ days = store.get("practice", {}); log = store.get("log", []); render(); } });
  Bus.on("lang", render);
  render();
  return { flush, get today(){ return (days[dayKey(Date.now())] || 0) + acc; } };
})();
