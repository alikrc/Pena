// Parçalar sekmesi: notalı parça (dizek + tab + akorlar), eşlik grubuyla dinleme ve çalma.
// Dinle: grup ve ezgi çalar, imleç notayı izler. Grupla çal: grup sabit tempoda çalar, sen ezgiyi çalarsın; her nota
// perde ve zamanlama için puanlanır. Benimle çal: grup seni izler (ilk notanla girer, temponu izler, durunca bekler).
// Bir ölçüye dokununca oradan çalar; Döngü ile iki ölçü arası tekrarlanır. "Parçayı öğren" adım adım götürür.
const Pieces = (() => {
  defStr({
    "pc.title":    { tr:"Parçalar — notayla, grupla çal", en:"Pieces — play from notation with a band" },
    "pc.sub":      { tr:"nota, tab, akorlar ve eşlik grubu", en:"notation, tab, chords and a backing band" },
    "pc.piece":    { tr:"Parça", en:"Piece" },
    "pc.groove":   { tr:"Eşlik", en:"Backing" },
    "pc.tempo":    { tr:"Hız", en:"Speed" },
    "pc.pct":      { tr:"%{n}", en:"{n}%" },
    "pc.gWest":    { tr:"Batı (kamu malı)", en:"Western (public domain)" },
    "pc.gTr":      { tr:"Türkçe bilinen ezgiler", en:"Well-known Turkish tunes" },
    "pc.gEtude":   { tr:"Etütler: Türk ve Batı ritimleri", en:"Studies: Turkish and Western rhythms" },
    "pc.gUser":    { tr:"Benim parçalarım", en:"My pieces" },
    "pc.gTrRhy":   { tr:"Türk ritimleri", en:"Turkish rhythms" },
    "pc.gWestRhy": { tr:"Batı ritimleri", en:"Western rhythms" },
    "pc.drum":     { tr:"Davul", en:"Drums" },
    "pc.bass":     { tr:"Bas", en:"Bass" },
    "pc.chord":    { tr:"Akor", en:"Chords" },
    "pc.lead":     { tr:"Ezgi", en:"Melody" },
    "pc.phones":   { tr:"Kulaklık takılı", en:"Wearing headphones" },
    "pc.listen":   { tr:"Dinle", en:"Listen" },
    "pc.band":     { tr:"Grupla çal", en:"Play with band" },
    "pc.follow":   { tr:"Benimle çal", en:"Follow me" },
    "pc.stop":     { tr:"Durdur", en:"Stop" },
    "pc.loop":     { tr:"Döngü", en:"Loop" },
    "pc.loopPick": { tr:"Döngünün ilk ve son ölçüsüne dokun.", en:"Tap the first and last bar of the loop." },
    "pc.loopB":    { tr:"Şimdi son ölçüye dokun.", en:"Now tap the last bar." },
    "pc.loopOn":   { tr:"Döngü: {a}–{b}. ölçü", en:"Loop: bars {a}–{b}" },
    "pc.from":     { tr:"{n}. ölçüden başlar", en:"Starts from bar {n}" },
    "pc.meta":     { tr:"{by} · {meter} · {n} ölçü · ♩ = {bpm}", en:"{by} · {meter} · {n} bars · ♩ = {bpm}" },
    "pc.safe":     { tr:"Kulaklık yokken grup hoparlörden yalnız alçak bas ve tok davulla çalar; mikrofon seni karıştırmadan duysun diye. Kulaklık takarsan bütün grup çalar.",
                     en:"Without headphones the band plays only low bass and kick through the speaker, so the microphone can still hear you. With headphones the whole band plays." },
    "pc.countIn":  { tr:"Bir ölçü sayıyorum…", en:"Counting one bar…" },
    "pc.waitFirst":{ tr:"İlk notayı çal ({note}); grup seninle girer.", en:"Play the first note ({note}); the band comes in with you." },
    "pc.waiting":  { tr:"Bekliyorum: {note} ile devam et.", en:"Waiting: carry on with {note}." },
    "pc.nowNext":  { tr:"Akor: {now} · sonra: {next}", en:"Chord: {now} · next: {next}" },
    "pc.nowOnly":  { tr:"Akor: {now}", en:"Chord: {now}" },
    "pc.noMic":    { tr:"Mikrofon açılamadı; bu mod mikrofonla dinler.", en:"Microphone failed; this mode listens through the microphone." },
    "pc.resBand":  { tr:"<b>%{pct}</b> doğru nota · %{tp} zamanında · {miss} kaçan · {wrong} yanlış", en:"<b>{pct}%</b> right notes · {tp}% on time · {miss} missed · {wrong} wrong" },
    "pc.resFollow":{ tr:"<b>%{pct}</b> doğru nota · {miss} kaçan · {wrong} yanlış · son tempo: yazılının %{tempo}'i", en:"<b>{pct}%</b> right notes · {miss} missed · {wrong} wrong · final tempo: {tempo}% of written" },
    "pc.avg":      { tr:"Ortalama {ms} ms {dir}.", en:"On average {ms} ms {dir}." },
    "pc.late":     { tr:"geç", en:"late" }, "pc.early": { tr:"erken", en:"early" },
    "pc.tipGood":  { tr:"Çok iyi! Hızı %10 artır.", en:"Very good! Raise the speed by 10%." },
    "pc.tipSlow":  { tr:"Önce hızı %70'e indirip zor ölçüleri döngüyle çalış.", en:"Drop the speed to 70% and loop the hard bars first." },
    "pc.endListen":{ tr:"Bitti. Şimdi “Grupla çal” ya da “Benimle çal”.", en:"Done. Now try “Play with band” or “Follow me”." },
    "pc.learn":    { tr:"Parçayı öğren · {n}/{all} adım", en:"Learn the piece · {n}/{all} steps" },
    "pc.start":    { tr:"Başla", en:"Start" },
    "pc.s0":       { tr:"Dinle|Parçayı grup ve ezgiyle asıl hızında dinle; imleç notayı ve tabı izler.", en:"Listen|Hear the piece with band and melody at full speed; the cursor follows the notation and tab." },
    "pc.s1":       { tr:"Yavaş dinle|%60 hızda dinle; tabdaki tel ve perdelere bak.", en:"Listen slowly|Listen at 60%; watch the strings and frets in the tab." },
    "pc.s2":       { tr:"Ritmi dinle|Ezgi susar, grup ilk dört ölçüyü çalar; ölçüyü say.", en:"Hear the groove|The melody is silent and the band plays four bars; count the beats." },
    "pc.s3":       { tr:"Benimle çal|%75 hızda; grup seni izler ve bekler. Doğru nota %60'ı geçince tamam.", en:"Follow me|At 75%; the band follows and waits for you. Done above 60% right notes." },
    "pc.s4":       { tr:"Grupla yavaş çal|%75 hızda grup beklemez. Doğru nota %60'ı geçince tamam.", en:"Play slowly with the band|At 75% the band doesn't wait. Done above 60% right notes." },
    "pc.s5":       { tr:"Asıl hızda çal|%100 hızda, %75 doğru nota ve %50 zamanında.", en:"Full speed|At 100%, 75% right notes and 50% on time." },
    "pc.help":     { tr:"Nasıl çalışır?", en:"How does it work?" },
    "pc.helpText": { tr:"Dizekte gitar yazımıyla nota (gitar yazıldığından bir oktav pes duyulur), altında tab: her notanın teli ve perdesi komşu notalara göre seçilir. Üstte akorlar; grup bu akorlarla davul (Türk ritimlerinde darbuka), bas ve akor çalar. <b>Grupla çal</b>: bir ölçü sayar, grup sabit tempoda çalar; doğru perde ve zamanlama ayrı ayrı sayılır. <b>Benimle çal</b>: grup ilk notanla girer, hızlanırsan hızlanır, yavaşlarsan yavaşlar, durursan bekler. Bir ölçüye dokununca oradan başlar. Gecikmeyi Ayarlar'dan ölçersen zamanlama daha doğru olur.",
                     en:"The staff shows guitar notation (guitar sounds an octave lower than written) with tab underneath: each note's string and fret is chosen from its neighbours. Chords are on top; the band plays drums (darbuka for Turkish rhythms), bass and chords with them. <b>Play with band</b>: counts one bar and keeps a steady tempo; right pitch and timing are counted separately. <b>Follow me</b>: the band comes in with your first note, speeds up and slows down with you and waits when you stop. Tap a bar to start there. Measure latency in Settings for more accurate timing." },
    "pc.noLyrics": { tr:"Telifli şarkıların ezgisi eklenmedi; Türkçe pop ve rock şarkıları Şarkılar sekmesinde akorlarıyla, grup eşliğinde çalabilirsin.",
                     en:"Melodies of copyrighted songs are not included; play Turkish pop and rock songs with their chords and the band in the Songs tab." },
    "pc.editor":   { tr:"Kendi parçanı yaz", en:"Write your own piece" },
    "pc.edHelp":   { tr:"Ölçüleri <code>|</code> ile ayır. Nota: ad ve oktav (gitar yazımı) ve süre: <code>[Am] E5 D5:0.5 C5:0.5 A4:2 | r:1 …</code>. Süreler: 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25 (dörtlük = 1). <code>r</code> sus, <code>[Am]</code> akor. Türkçe adlar da olur: <code>Mi5 Fa#4 Sib4</code>.",
                     en:"Separate bars with <code>|</code>. Note: name and octave (guitar notation) and duration: <code>[Am] E5 D5:0.5 C5:0.5 A4:2 | r:1 …</code>. Durations: 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25 (quarter = 1). <code>r</code> is a rest, <code>[Am]</code> a chord." },
    "pc.edTitle":  { tr:"Başlık", en:"Title" },
    "pc.edMeter":  { tr:"Ölçü", en:"Time" },
    "pc.edKey":    { tr:"Donanım", en:"Key" },
    "pc.edText":   { tr:"Parça metni", en:"Piece text" },
    "pc.save":     { tr:"Kaydet", en:"Save" }, "pc.new": { tr:"Yeni", en:"New" }, "pc.del": { tr:"Sil", en:"Delete" },
    "pc.untitled": { tr:"Adsız parça", en:"Untitled piece" },
    "pc.saved":    { tr:"Kaydedildi (yalnızca bu tarayıcıda).", en:"Saved (only in this browser)." },
    "pc.errs":     { tr:"Hatalı: {list}", en:"Errors: {list}" },
    "pc.okBars":   { tr:"{n} ölçü, {k} nota.", en:"{n} bars, {k} notes." },
    "pc.mine":     { tr:"Kendi parçan", en:"Your own piece" },
    "pc.delAsk":   { tr:"“{title}” silinsin mi?", en:"Delete “{title}”?" },
    "pc.template": { tr:"[Am] A4 C5 E5 C5 | [G] D5:2 B4:2 | [Am] A4:4", en:"[Am] A4 C5 E5 C5 | [G] D5:2 B4:2 | [Am] A4:4" },
    "pc.scoreAria":{ tr:"{title}: dizek ve tab", en:"{title}: staff and tab" },
    "pc.gTsm":     { tr:"TSM: popüler eserler", en:"Turkish classical: popular pieces" },
    "pc.arch":     { tr:"TSM nota arşivi · {n} eser", en:"Turkish classical archive · {n} pieces" },
    "pc.archLoad": { tr:"TSM nota arşivi", en:"Turkish classical archive" },
    "pc.search":   { tr:"Ara: eser, besteci", en:"Search: piece, composer" },
    "pc.makam":    { tr:"Makam", en:"Makam" }, "pc.form": { tr:"Form", en:"Form" }, "pc.all": { tr:"Hepsi", en:"All" },
    "pc.popular":  { tr:"Popüler", en:"Popular" },
    "pc.easy":     { tr:"Gitara uygun (az koma)", en:"Guitar-friendly (few commas)" },
    "pc.found":    { tr:"{n} eser", en:"{n} pieces" },
    "pc.more":     { tr:"… ve {n} eser daha; aramayı daralt.", en:"… and {n} more; narrow the search." },
    "pc.archNote": { tr:"Gitarda koma yok: her perde en yakın yarım sese yuvarlanır (komasız TSM). Sözler alınmadı; yalnız bestecisi kamu malı olan eserler var. Kaynak: SymbTr (M. K. Karaosmanoğlu, MTG–UPF), CC BY-NC-SA 4.0.",
                     en:"The guitar has no commas: each perde is rounded to the nearest semitone. Lyrics are not included; only pieces whose composer is in the public domain. Source: SymbTr (M. K. Karaosmanoglu, MTG–UPF), CC BY-NC-SA 4.0." },
    "pc.archFail": { tr:"Arşiv yüklenemedi (internet yok ve önbellekte değil).", en:"Couldn't load the archive (offline and not cached)." },
    "pc.comma":    { tr:"koma sapması %{n}", en:"comma deviation {n}%" },
    "pc.archMeta": { tr:"{by} · {makam} · {form} · {usul} · {n} ölçü · ♩ = {bpm} · {comma}", en:"{by} · {makam} · {form} · {usul} · {n} bars · ♩ = {bpm} · {comma}" },
    "pc.anon":     { tr:"Anonim", en:"Anonymous" }
  });
  const root = $("pcroot");
  let user = store.get("pieces", []);
  let piece = null, parsed = null, drawn = null, run = null, fromBar = 0, loop = null, loopPick = 0, editing = null;
  let pct = Math.min(130, Math.max(40, +store.get("pcPct", 100) || 100));
  let parts = Object.assign({ drum:true, bass:true, chord:true, lead:true }, store.get("pcParts", {}));
  const all = () => [...PIECES, ...user];
  const learnAll = () => store.get("pcLearn", {});
  const STEPS = 6;

  // ---- Arayüz ----
  function build(){
    const opt = (v, txt) => `<option value="${v}">${esc(txt)}</option>`;
    const grp = (label, list) => list.length ? `<optgroup label="${esc(label)}">${list.map(p => opt(p.id, L(p, "title"))).join(" ")}</optgroup>` : "";
    const gopt = fam => GROOVES.filter(g => g.family === fam).map(g => opt(g.id, L(g, "name") + " · " + g.meter)).join(" ");
    root.innerHTML = `
    <section class="card" aria-labelledby="pclab">
      <div class="striphead"><div class="label" id="pclab">${t("pc.title")}</div><span class="reg">${t("pc.sub")}</span></div>
      <div class="row">
        <div class="field grow"><label class="label" for="pcsel">${t("pc.piece")}</label><select id="pcsel">
          ${grp(t("pc.gWest"), PIECES.filter(p => p.group === "west"))}${grp(t("pc.gTr"), PIECES.filter(p => p.group === "tr"))}
          ${grp(t("pc.gEtude"), PIECES.filter(p => p.group === "etude"))}${archIdx ? grp(t("pc.gTsm"), archIdx.filter(x => x.pop).map(archMeta)) : ""}${grp(t("pc.gUser"), user)}</select></div>
        <div class="field"><label class="label" for="pcgroove">${t("pc.groove")}</label><select id="pcgroove">
          <optgroup label="${esc(t("pc.gWestRhy"))}">${gopt("west")}</optgroup><optgroup label="${esc(t("pc.gTrRhy"))}">${gopt("tr")}</optgroup></select></div>
        <div class="field"><label class="label" for="pcpct">${t("pc.tempo")}</label>
          <span class="stepper"><input type="range" id="pcpct" min="40" max="130" step="5" value="${pct}"><em id="pcpctv">${t("pc.pct", { n: pct })}</em></span></div>
      </div>
      <p class="cformula" id="pcmeta"></p>
      <div class="pcparts" role="group">
        ${["drum","bass","chord","lead"].map(k => `<label class="chk"><input type="checkbox" data-part="${k}"${parts[k] ? " checked" : ""}> ${t("pc." + k)}</label>`).join("")}
        <label class="chk"><input type="checkbox" id="pcphones"${Band.headphones ? " checked" : ""}> ${t("pc.phones")}</label>
      </div>
      <p class="lyrnote" id="pcsafe"></p>
      <div class="scorebox" id="pcscore"></div>
      <div class="player" id="pcplayer">
        <div class="rnow" id="pcnow" aria-live="polite"></div>
        <div class="cbtns">
          <button type="button" class="primary small" id="pclisten">${t("pc.listen")}</button>
          <button type="button" class="stopbtn" id="pcband"><svg class="ico" aria-hidden="true"><use href="#i-mic"/></svg><span>${t("pc.band")}</span></button>
          <button type="button" class="stopbtn" id="pcfollow"><svg class="ico" aria-hidden="true"><use href="#i-mic"/></svg><span>${t("pc.follow")}</span></button>
          <button type="button" class="stopbtn" id="pcloop" aria-pressed="false">${t("pc.loop")}</button>
          <button type="button" class="stopbtn" id="pcstop" disabled>${t("pc.stop")}</button>
        </div>
      </div>
      <div class="cresult" id="pcres" aria-live="polite"></div>
      <details class="learn" id="pcarch"><summary id="pcarchsum">${archIdx ? t("pc.arch", { n: archIdx.length }) : t("pc.archLoad")}</summary>
        <div class="row">
          <div class="field grow"><label class="label" for="pcaq">${t("pc.search")}</label><input type="search" id="pcaq"></div>
          <div class="field"><label class="label" for="pcamk">${t("pc.makam")}</label><select id="pcamk"></select></div>
          <div class="field"><label class="label" for="pcaf">${t("pc.form")}</label><select id="pcaf"></select></div>
        </div>
        <div class="pcparts"><label class="chk"><input type="checkbox" id="pcapop"> ${t("pc.popular")}</label>
          <label class="chk"><input type="checkbox" id="pcaeasy" checked> ${t("pc.easy")}</label><span class="reg" id="pcacount"></span></div>
        <ul class="alist" id="pcalist"></ul>
        <p class="lead">${t("pc.archNote")}</p>
      </details>
      <details class="learn" id="pclearn"><summary id="pclearnsum"></summary><ol class="steps" id="pcsteps"></ol></details>
      <details class="help"><summary>${t("pc.help")}</summary><p class="lead">${t("pc.helpText")}</p><p class="lead">${t("pc.noLyrics")}</p></details>
      <details class="editor" id="pceditor"><summary>${t("pc.editor")}</summary>
        <p class="lead">${t("pc.edHelp")}</p>
        <div class="row" style="margin-bottom:8px">
          <div class="field grow"><label class="label" for="pcedtitle">${t("pc.edTitle")}</label><input type="text" id="pcedtitle"></div>
          <div class="field"><label class="label" for="pcedmeter">${t("pc.edMeter")}</label><select id="pcedmeter">${["4/4","3/4","2/4","6/8","3/8","5/8","7/8","8/8","9/8","9/4"].map(m => opt(m, m)).join("")}</select></div>
          <div class="field"><label class="label" for="pcedkey">${t("pc.edKey")}</label><select id="pcedkey">${Object.keys(KEY_SIG).map(k => opt(k, k)).join("")}</select></div>
        </div>
        <textarea id="pcedtext" spellcheck="false" aria-label="${esc(t("pc.edText"))}"></textarea>
        <div class="err" id="pcederr" aria-live="polite"></div>
        <div class="cbtns"><button type="button" class="primary small" id="pcsave">${t("pc.save")}</button>
          <button type="button" class="stopbtn" id="pcnew">${t("pc.new")}</button><button type="button" class="stopbtn" id="pcdel">${t("pc.del")}</button></div>
      </details>
    </section>`;
    $("pcsel").addEventListener("change", () => { stop(); load($("pcsel").value); });
    $("pcgroove").addEventListener("change", () => { stop(); saveChoice("groove", $("pcgroove").value); meta(); });
    $("pcpct").addEventListener("input", () => { pct = +$("pcpct").value; $("pcpctv").textContent = t("pc.pct", { n: pct }); store.set("pcPct", pct); });
    $("pcpct").addEventListener("change", () => { if(run && run.mode !== "follow") start(run.mode, { keepLoop:true }); });
    root.querySelectorAll("[data-part]").forEach(c => c.addEventListener("change", () => { parts[c.dataset.part] = c.checked; store.set("pcParts", parts); if(run) start(run.mode, { keepLoop:true }); }));
    $("pcphones").addEventListener("change", () => { Band.setHeadphones($("pcphones").checked); safeNote(); });
    $("pclisten").addEventListener("click", () => start("listen"));
    $("pcband").addEventListener("click", () => start("band"));
    $("pcfollow").addEventListener("click", () => start("follow"));
    $("pcstop").addEventListener("click", () => { stop(); say(""); });
    $("pcloop").addEventListener("click", () => {
      if(loop || loopPick){ loop = null; loopPick = 0; $("pcloop").setAttribute("aria-pressed", "false"); say(""); markBars(); return; }
      loopPick = 1; $("pcloop").setAttribute("aria-pressed", "true"); say(t("pc.loopPick"));
    });
    $("pcsteps").addEventListener("click", e => { const b = e.target.closest("[data-step]"); if(b) runStep(+b.dataset.step); });
    $("pcedtext").addEventListener("input", edCheck);
    $("pcsave").addEventListener("click", edSave);
    $("pcnew").addEventListener("click", () => { editing = null; $("pcedtitle").value = ""; $("pcedtext").value = t("pc.template"); $("pcedmeter").value = "4/4"; $("pcedkey").value = "Am"; edCheck(); });
    $("pcdel").addEventListener("click", edDelete);
    $("pcarch").addEventListener("toggle", () => { if($("pcarch").open) archOpen(); });
    ["pcaq", "pcamk", "pcaf", "pcapop", "pcaeasy"].forEach(id => $(id).addEventListener(id === "pcaq" ? "input" : "change", archList));
    $("pcalist").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if(!b) return;
      load("tsm:" + b.dataset.id).then(() => { if($("pcscore").scrollIntoView) $("pcscore").scrollIntoView({ block:"start" }); }); });
    if(archIdx) archFill();
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
  const say = html => { $("pcnow").innerHTML = html; };
  function safeNote(){ $("pcsafe").textContent = Band.headphones ? "" : t("pc.safe"); }
  // Parça başına kullanıcının seçtiği eşlik
  function saveChoice(k, v){ const all = store.get("pcChoice", {}); all[piece.id] = { ...(all[piece.id] || {}), [k]: v }; store.set("pcChoice", all); }
  const choice = () => store.get("pcChoice", {})[piece.id] || {};
  const groove = () => grooveById($("pcgroove").value) || grooveById(piece.groove);

  async function load(id){
    if(typeof id === "string" && id.startsWith("tsm:")) return loadArch(id.slice(4));
    piece = all().find(p => p.id === id) || PIECES[0];
    setup(parsePiece(piece.text, piece.meter));
  }
  // ---- TSM nota arşivi (notalar/, js/core/archive.js) ----
  let archIdx = null, archBusy = null;
  const archMeta = x => ({ id: "tsm:" + x.id, title: x.t, by: x.b || t("pc.anon"), meter: "", key: "C", bpm: x.tp, arch: x });
  function archIndex(){
    if(archIdx) return Promise.resolve(archIdx);
    if(!window.fetch) return Promise.resolve(null);
    if(!archBusy) archBusy = fetch("notalar/index.json").then(r => r.json()).then(j => (archIdx = j.pieces))
      .catch(() => { archBusy = null; return null; });
    return archBusy;
  }
  async function archOpen(){
    const had = !!archIdx;
    if(!(await archIndex())){ $("pcacount").textContent = t("pc.archFail"); return; }
    if(!had){ const id = piece && piece.id; build(); await load(id); $("pcarch").open = true; }
  }
  function archFill(){
    const uniq = (k, n) => [...new Map(archIdx.map(x => [x[k], x[n]])).entries()].sort((a, b) => a[1].localeCompare(b[1], "tr"));
    $("pcamk").replaceChildren(new Option(t("pc.all"), ""), ...uniq("mk", "mkn").map(([v, n]) => new Option(n, v)));
    $("pcaf").replaceChildren(new Option(t("pc.all"), ""), ...uniq("f", "fn").map(([v, n]) => new Option(n, v)));
    archList();
  }
  function archList(){
    if(!archIdx) return;
    const q = $("pcaq").value.trim().toLocaleLowerCase("tr"), mk = $("pcamk").value, f = $("pcaf").value,
          pop = $("pcapop").checked, easy = $("pcaeasy").checked;
    const res = archIdx.filter(x => (!mk || x.mk === mk) && (!f || x.f === f) && (!pop || x.pop) && (!easy || x.ke <= 60) &&
      (!q || (x.t + " " + (x.b || "")).toLocaleLowerCase("tr").includes(q)))
      .sort((a, b) => (b.pop || 0) - (a.pop || 0) || a.ke - b.ke);
    $("pcacount").textContent = t("pc.found", { n: res.length });
    $("pcalist").innerHTML = res.slice(0, 60).map(x => `<li><button type="button" data-id="${esc(x.id)}"><b>${x.pop ? "★ " : ""}${esc(x.t)}</b>
      <small>${esc(x.mkn)} · ${esc(x.fn)} · ${esc(x.un)} · ${esc(x.b || t("pc.anon"))} · ${t("pc.comma", { n: Math.round(x.ke/10) })}</small></button></li>`).join("") +
      (res.length > 60 ? `<li class="more">${t("pc.more", { n: res.length - 60 })}</li>` : "");
  }
  async function loadArch(aid){
    const idx = await archIndex(), x = idx && idx.find(y => y.id === aid);
    if(!x){ if(!piece) await load(PIECES[0].id); return; }
    let j;
    try{ j = await fetch("notalar/" + aid + ".json").then(r => r.json()); }
    catch(e){ $("pcres").textContent = t("pc.archFail"); return; }
    stop();
    const p = archParse(j), drone = archDrone(p);
    p.bandChordAt = () => drone;
    // Usul adı elle yazılmış bir Türk kalıbıyla eşleşiyorsa (Aksak, Zeybek…) o, yoksa ölçüden üretilen kalıp
    const un = (x.un || "").toLocaleLowerCase("tr");
    const hand = GROOVES.find(h => h.family === "tr" && Math.abs(h.beats - p.barBeats) < 1e-9 && un.startsWith(h.name.toLocaleLowerCase("tr").split(/[ (]/)[0]));
    piece = { ...archMeta(x), key: archKey(p), meter: p.num + "/" + p.den, groove: (hand || autoGroove(p.num, p.den)).id, commaErr: archCommaError(p) };
    setup(p);
  }
  function setup(p){
    store.set("piece", piece.id);
    if(![...$("pcsel").options].some(o => o.value === piece.id)) $("pcsel").append(new Option(L(piece, "title"), piece.id));
    $("pcsel").value = piece.id;
    parsed = p;
    // Parçanın ölçüsünden üretilen usul kalıbı da seçilebilsin
    const auto = autoGroove(parsed.num, parsed.den);
    if(!$("pcgroove").querySelector(`option[value="${auto.id}"]`)) $("pcgroove").prepend(new Option(auto.name + " · " + auto.meter, auto.id));
    // Eşlik seçimi: ölçü süresi tutan kalıplar
    const want = choice().groove || piece.groove;
    [...$("pcgroove").options].forEach(o => { o.disabled = Math.abs(grooveById(o.value).beats - parsed.barBeats) > 1e-9; });
    $("pcgroove").value = grooveById(want) && !$("pcgroove").querySelector(`option[value="${want}"]`).disabled ? want : piece.groove;
    fromBar = 0; loop = null; loopPick = 0; $("pcloop").setAttribute("aria-pressed", "false");
    meta(); render(); buildLearn(); safeNote(); say(""); $("pcres").innerHTML = "";
    const mine = piece.id.startsWith("u-");
    $("pcdel").disabled = !mine;
    if(mine){ editing = piece.id; $("pcedtitle").value = piece.title; $("pcedtext").value = piece.text; $("pcedmeter").value = piece.meter; $("pcedkey").value = piece.key; }
  }
  function meta(){
    const full = parsed.bars.filter(b => b.full).length;
    if(piece.arch){
      const x = piece.arch;
      $("pcmeta").textContent = t("pc.archMeta", { by: x.b || t("pc.anon"), makam: x.mkn, form: x.fn, usul: x.un, n: full, bpm: piece.bpm,
        comma: t("pc.comma", { n: Math.round(piece.commaErr*100) }) }) + " · " + L(groove(), "name");
      return;
    }
    $("pcmeta").textContent = t("pc.meta", { by: piece.id.startsWith("u-") ? t("pc.mine") : L(piece, "by"), meter: piece.meter, n: full, bpm: piece.bpm }) + " · " + L(groove(), "name");
  }
  function render(){
    const box = $("pcscore");
    drawn = Staff.draw(box, parsed, { key: piece.key, width: box.clientWidth || 640, onBar: tapBar });
    drawn.svg.setAttribute("aria-label", t("pc.scoreAria", { title: L(piece, "title") }));
    markBars();
  }
  function tapBar(bi){
    if(loopPick === 1){ loop = { a: bi, b: bi }; loopPick = 2; say(t("pc.loopB")); markBars(); return; }
    if(loopPick === 2){ loop = { a: Math.min(loop.a, bi), b: Math.max(loop.a, bi) }; loopPick = 0; say(t("pc.loopOn", { a: loop.a + 1, b: loop.b + 1 })); markBars(); if(run) start(run.mode, { keepLoop:true }); return; }
    fromBar = bi; say(t("pc.from", { n: bi + 1 })); markBars();
    if(run) start(run.mode);
  }
  function markBars(){
    if(!drawn) return;
    drawn.noteEls.forEach((g, i) => { if(!g) return; const b = parsed.notes[i].bar;
      g.classList.toggle("inloop", !!loop && b >= loop.a && b <= loop.b);
      g.classList.toggle("from", !loop && fromBar > 0 && b === fromBar && parsed.bars[b].first === i); });
  }
  function clearMarks(){ drawn.noteEls.forEach(g => g && g.classList.remove("play", "cur", "ok", "bad", "miss", "late")); }

  // ---- Çalma ----
  function start(mode, o = {}){
    stop(true); Bus.emit("stopall");
    if(!o.keepLoop && !loop) loopPick = 0;
    const range = loop ? { a: loop.a, b: loop.b } : { a: o.from != null ? o.from : fromBar, b: o.to != null ? o.to : parsed.bars.length - 1 };
    const sb = parsed.bars[range.a].start, eb = parsed.bars[range.b].start + parsed.bars[range.b].len;
    const p = o.pct || pct/100, beatMs = 60000/(piece.bpm*p), g = groove();
    const micSafe = mode !== "listen" && !Band.headphones;
    const prt = { drum: parts.drum, bass: parts.bass, chord: parts.chord, ...(o.parts || {}) };
    const lead = o.noLead ? false : mode === "listen" ? parts.lead : parts.lead && Band.headphones;
    let evs = pieceBandEvents(parsed, g, prt).filter(e => e.t >= sb - 1e-9 && e.t < eb - 1e-9);
    if(lead) evs.push(...parsed.notes.filter(n => n.w !== null && n.beat >= sb - 1e-9 && n.beat < eb - 1e-9).map(n => ({ t: n.beat, part: "lead", m: n.w, dur: n.dur })));
    // Sayım: bir ölçü, vuruş gruplarının başında tık (dinleme ve grupla çalmada)
    const count = mode !== "follow" && !o.noCount;
    if(count){
      const grp = { "6/8":[0,1.5], "3/8":[0], "9/8":[0,1,2,3], "7/8":[0,1.5,2.5], "5/8":[0,1], "8/8":[0,1.5,3] }[piece.meter] || [...Array(Math.max(1, Math.round(parsed.barBeats))).keys()];
      grp.forEach((x, i) => evs.push({ t: sb - parsed.barBeats + x, part:"click", strong: i === 0 }));
    }
    evs.sort((x, y) => x.t - y.t);
    const a = Snd.ctx(), now = a.currentTime*1000;
    const map = new TempoMap(beatMs, now + 250 + (count ? parsed.barBeats*beatMs : 0), sb);
    const targets = pieceTargets(parsed).filter(n => n.beat >= sb - 1e-9 && n.beat < eb - 1e-9);
    run = { mode, map, targets, marks: targets.map(() => null), sb, eb, p, o, started: mode !== "follow", lastStart: -1e9, onsets: [], waiting: false };
    const leadPluck = mode === "listen";
    run.player = Band.player(evs, map, { micSafe, held: mode === "follow", end: eb, onEnd: () => finish(), gain: 0.85,
      vol: { drum: 1, bass: 1, chord: 1, lead: 1 }, leadPluck });
    if(mode !== "listen"){
      run.follower = new ScoreFollower(targets);
      if(mode === "band"){ run.follower.started = true; }
      micOn(run);
    }
    clearMarks();
    $("pcstop").disabled = false; $("pcplayer").classList.add("on");
    $("pcres").innerHTML = mode === "follow" ? "" : "";
    say(mode === "follow" ? t("pc.waitFirst", { note: targets[0] ? noteLabel(targets[0].w) : "" }) : count ? t("pc.countIn") : "");
    run.raf = requestAnimationFrame(frame);
  }
  async function micOn(r){
    if(!Mic.running && !(await Mic.start())){ if(run === r){ stop(); $("pcres").textContent = t("pc.noMic"); } return; }
    if(run !== r) return;
    r.unsubOnset = Mic.onOnset(tt => { r.onsets.push(tt*1000); if(r.onsets.length > 30) r.onsets.shift(); });
  }
  // Mikrofondan gelen kararlı nota → nota başlangıcı (ses saati, ms; gecikme düşülür)
  Bus.on("note", ({ r, isNew }) => {
    if(!run || run.mode === "listen" || !run.unsubOnset) return;
    if(r.written < writtenRange().low) return;          // bas ya da gürültü: gitarın en pes sesinin altı
    const now = Snd.ctx().currentTime*1000, R = run;
    let st = null;
    if(isNew || r.written !== R.cur){
      const o = R.onsets.filter(x => x > R.lastStart + 60 && x >= now - 300 && x <= now).pop();
      st = o != null ? o : now - 80;
    }else{
      const o = R.onsets.find(x => x > R.lastStart + 120 && x <= now - 30);
      if(o != null) st = o;
    }
    R.cur = r.written;
    if(st === null) return;
    R.lastStart = st;
    R.onsets = R.onsets.filter(x => x > st);
    onStart({ t: st - Rhythm.latency*1000, w: r.written });
  });
  Bus.on("silence", () => { if(run) run.cur = null; });
  function onStart(s){
    const R = run, f = R.follower, map = R.map;
    if(R.mode === "band"){
      const res = f.push(s, map);
      if(res){ R.marks[res.j] = { ok: res.ok, off: s.t - map.timeAt(res.beat) }; paint(res.j); }
      return;
    }
    const paused = R.started && R.player.held;
    const res = f.push(s, map, paused);
    if(!res) return;
    if(!R.started || paused){
      map.anchor(s.t, res.beat); map.clearHist();
      R.player.seek(res.beat); R.player.hold(false); R.started = true; R.waiting = false;
    }else map.observe(s.t, res.beat);
    R.marks[res.j] = { ok: res.ok, off: null }; paint(res.j);
    if(f.done) setTimeout(() => { if(run === R) finish(); }, map.beatMs*1.5);
  }
  function paint(j){
    const m = run.marks[j], g = drawn.noteEls[run.targets[j].i];
    if(!g) return;
    g.classList.remove("cur", "play");
    g.classList.add(!m ? "miss" : !m.ok ? "bad" : "ok");
  }
  function frame(){
    if(!run) return;
    run.raf = requestAnimationFrame(frame);
    const a = Snd.ctx(), R = run, now = a.currentTime*1000, lat = Rhythm.latency*1000;
    const heard = R.map.beatAt(now - (a.outputLatency || 0)*1000);
    if(R.mode === "follow"){
      const f = R.follower;
      drawn.noteEls.forEach(g => g && g.classList.remove("cur"));
      if(f.next && drawn.noteEls[f.next.i]) drawn.noteEls[f.next.i].classList.add("cur");
      if(R.started && !R.player.held && f.late(now - lat, R.map) > followWait(R.map.beatMs)){
        R.player.hold(true); R.waiting = true;
      }
      if(R.waiting && f.next) say(t("pc.waiting", { note: noteLabel(f.next.w) }));
      else if(R.started) chordLine(R.map.beatAt(now));
      return;
    }
    if(R.mode === "band") for(const j of R.follower.skipPast(now - lat, R.map, 0.75)) paint(j);
    if(heard < R.sb) return;
    chordLine(heard);
    if(R.mode === "listen"){
      let cur = null;
      for(const n of parsed.notes) if(n.beat <= heard + 1e-6 && heard < n.beat + n.dur) cur = n;
      drawn.noteEls.forEach((g, i) => g && g.classList.toggle("play", !!cur && i === cur.i));
      if(cur && cur.i !== R.lastCur){ R.lastCur = cur.i; follow(cur.i); }
    }
  }
  // Çalan satır görünür kalsın
  function follow(i){
    const x = drawn.noteX[i]; if(!x || x.sys === run.lastSys) return;
    run.lastSys = x.sys; const g = drawn.noteEls[i];
    if(g && g.scrollIntoView) g.scrollIntoView({ block:"nearest", behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function chordLine(b){
    const now = parsed.chordAt(b);
    if(!now){ say(""); return; }
    const nx = parsed.chords.find(c => c.beat > b + 1e-6);
    say(nx ? t("pc.nowNext", { now, next: nx.sym }) : t("pc.nowOnly", { now }));
  }
  function finish(){
    const R = run; if(!R) return;
    if(R.mode === "listen"){
      stop();
      if(loop) return start("listen", { keepLoop:true, noCount:true });
      $("pcres").textContent = t("pc.endListen");
      if(R.o.onDone) R.o.onDone(null);
      return;
    }
    // Takipçinin hiç eşlemediği notalar kaçırılmış sayılır
    R.marks.forEach((m, j) => { if(!m) paint(j); });
    const tol = Math.max(90, R.map.beatMs*0.15), s = playSummary(R.marks, tol);
    let html = R.mode === "band"
      ? t("pc.resBand", { pct: s.pct, tp: s.timePct, miss: s.missed, wrong: s.wrong })
      : t("pc.resFollow", { pct: s.pct, miss: s.missed, wrong: s.wrong, tempo: Math.round(R.map.pct()*R.p) });
    if(R.mode === "band" && s.right > 2 && Math.abs(s.avgOff) > 40) html += " " + t("pc.avg", { ms: Math.abs(s.avgOff), dir: t(s.avgOff > 0 ? "pc.late" : "pc.early") });
    if(s.pct >= 85 || s.pct < 60) html += "<br>" + t(s.pct >= 85 ? "pc.tipGood" : "pc.tipSlow");
    stop();
    $("pcres").innerHTML = html;
    Bus.emit("achieve", { type:"piece", id: piece.id, title: L(piece, "title"), mode: R.mode, pct: s.pct, timePct: s.timePct, speed: Math.round(R.p*100) });
    if(R.o.onDone) R.o.onDone(s);
  }
  function stop(keep){
    if(!run) return;
    const R = run; run = null;
    cancelAnimationFrame(R.raf); R.player.stop();
    if(R.unsubOnset) R.unsubOnset();
    $("pcstop").disabled = true; $("pcplayer").classList.remove("on");
    if(!keep) drawn.noteEls.forEach(g => g && g.classList.remove("play", "cur"));
  }

  // ---- Parçayı öğren ----
  function buildLearn(){
    const done = new Set(learnAll()[piece.id] || []);
    $("pclearnsum").textContent = t("pc.learn", { n: done.size, all: STEPS });
    $("pcsteps").innerHTML = [...Array(STEPS).keys()].map(k => {
      const [ti, d] = t("pc.s" + k).split("|");
      return `<li class="${done.has(k) ? "done" : ""}"><span><b>${ti}</b><small>${d}</small></span>
        <button type="button" class="stopbtn small" data-step="${k}">${done.has(k) ? "✓ " : ""}${t("pc.start")}</button></li>`;
    }).join("");
  }
  function markStep(k){
    const all = learnAll(), s = new Set(all[piece.id] || []); s.add(k); all[piece.id] = [...s]; store.set("pcLearn", all);
    buildLearn();
  }
  function runStep(k){
    loop = null; loopPick = 0; $("pcloop").setAttribute("aria-pressed", "false"); markBars();
    const full = parsed.bars.length - 1;
    if(k === 0) start("listen", { from:0, pct:1, onDone: () => markStep(0) });
    else if(k === 1) start("listen", { from:0, pct:0.6, onDone: () => markStep(1) });
    else if(k === 2){ const first = parsed.bars[0].full ? 0 : 1; start("listen", { from:first, to: Math.min(full, first + 3), pct:1, noLead:true, onDone: () => markStep(2) }); }
    else if(k === 3) start("follow", { from:0, pct:0.75, onDone: s => { if(s && s.pct >= 60) markStep(3); } });
    else if(k === 4) start("band", { from:0, pct:0.75, onDone: s => { if(s && s.pct >= 60) markStep(4); } });
    else if(k === 5) start("band", { from:0, pct:1, onDone: s => { if(s && s.pct >= 75 && s.timePct >= 50) markStep(5); } });
    $("pcscore").scrollIntoView && $("pcscore").scrollIntoView({ block:"nearest" });
  }

  // ---- Kendi parçan ----
  function edCheck(){
    const p = parsePiece($("pcedtext").value, $("pcedmeter").value);
    $("pcederr").textContent = p.errors.length ? t("pc.errs", { list: p.errors.slice(0, 6).join(", ") }) : t("pc.okBars", { n: p.bars.length, k: p.notes.filter(n => n.w !== null).length });
    return p;
  }
  function edSave(){
    const p = edCheck();
    if(p.errors.length || !p.notes.some(n => n.w !== null)) return;          // akorsuz parça da olur: grup davul ve basla değil, yalnız davulla çalar
    const meter = $("pcedmeter").value, g = GROOVES.find(x => Math.abs(x.beats - p.barBeats) < 1e-9) || GROOVES[0];
    let s = editing && user.find(u => u.id === editing);
    if(!s){ s = { id: "u-" + Date.now() }; user.push(s); }
    Object.assign(s, { title: $("pcedtitle").value.trim() || t("pc.untitled"), meter, key: $("pcedkey").value, text: $("pcedtext").value,
      groove: s.meter === meter && s.groove ? s.groove : g.id, bpm: s.bpm || g.bpm, group:"user", by:"" });
    store.set("pieces", user);
    const id = s.id; build(); load(id);
    $("pceditor").open = true; $("pcederr").textContent = t("pc.saved");
  }
  async function edDelete(){
    if(!piece.id.startsWith("u-") || !confirm(t("pc.delAsk", { title: piece.title }))) return;
    user = user.filter(u => u.id !== piece.id); store.set("pieces", user);
    editing = null; build(); load(PIECES[0].id);
  }

  Bus.on("stopall", () => { if(run && run.mode === "listen") stop(); });
  Bus.on("mic", on => { if(!on && run && run.mode !== "listen") stop(); });
  Bus.on("headphones", () => { const c = $("pcphones"); if(c) c.checked = Band.headphones; safeNote(); });
  Bus.on("range", () => { if(piece) render(); });
  Bus.on("lang", () => { const id = piece ? piece.id : null; stop(); build(); load(id); });
  Bus.on("tab", id => { if(id === "parcalar" && piece){ const w = $("pcscore").clientWidth; if(w && Math.abs(w - +drawn.svg.getAttribute("width")) > 40) render(); } else if(run) stop(); });
  let rz = null;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if(piece && !run && !$("panel-parcalar").hidden) render(); }, 200); });

  build(); load(store.get("piece", PIECES[0].id));
  // Başka sekmeden (Kulaktan çıkar, Çevir) gelen parçayı kullanıcının parçalarına ekleyip açar
  function importPiece(o){
    const p = parsePiece(o.text, o.meter || "4/4");
    const g = GROOVES.find(x => Math.abs(x.beats - p.barBeats) < 1e-9) || GROOVES[0];
    const s = { id: "u-" + Date.now(), title: o.title || t("pc.untitled"), meter: o.meter || "4/4", key: o.key || "C", text: o.text,
      groove: g.id, bpm: o.bpm || g.bpm, group:"user", by:"" };
    user.push(s); store.set("pieces", user);
    build(); load(s.id);
    return s.id;
  }
  return { open(id){ load(id); }, importPiece, get playing(){ return !!run; } };
})();
