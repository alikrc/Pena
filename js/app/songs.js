// Şarkılar sekmesi: akorlu söz sayfası, ritim motoruyla dinleme ve birlikte çalma, kendi şarkını yazma.
const Songs = (() => {
  defStr({
    "song.gTr":     { tr:"Türkçe pop / rock", en:"Turkish pop / rock" },
    "song.gTurku":  { tr:"Türküler (anonim)", en:"Turkish folk songs (traditional)" },
    "song.gPd":     { tr:"Yabancı (kamu malı)", en:"Public domain" },
    "song.gEx":     { tr:"Alıştırmalar", en:"Exercises" },
    "song.gUser":   { tr:"Benim şarkılarım", en:"My songs" },
    "song.ownMeta": { tr:"Kendi şarkın", en:"Your own song" },
    "song.source":  { tr:"kaynak akor sayfası", en:"source chord page" },
    "song.addHint": { tr:" İstersen “Sözleri kendin ekle” ile kendi tarayıcında ekleyebilirsin.", en:" You can add them yourself in your browser with “Add lyrics yourself”." },
    "song.unknown": { tr:"Tanınmayan akor: {list}", en:"Unknown chord: {list}" },
    "song.noChords":{ tr:"Bu şarkıda tanınan akor yok.", en:"No recognised chords in this song." },
    "song.countIn": { tr:"Bir ölçü sayıyorum, sonra çal.", en:"I'll count one bar, then you play." },
    "song.noLatency":{ tr:"Gecikme ölçülmedi (Ayarlar → “Gecikmeyi ölç”); sonuçlarda sabit bir kayma olabilir.",
                       en:"Latency not measured (Settings → “Measure latency”); results may be shifted." },
    "song.ready":   { tr:"Hazır… {n}", en:"Ready… {n}" },
    "song.nowNext": { tr:"Şimdi: {now} · sonra: {next}", en:"Now: {now} · next: {next}" },
    "song.nowLast": { tr:"Şimdi: {now} · son ölçü", en:"Now: {now} · last bar" },
    "song.sofar":   { tr:"Şu ana kadar: ", en:"So far: " },
    "song.endPlay": { tr:"Şarkı bitti. Bütün şarkı: ", en:"Song finished. Whole song: " },
    "song.endDemo": { tr:"Şarkı bitti. Şimdi “Birlikte çal” ile sen çal.", en:"Song finished. Now play it yourself with “Play along”." },
    "song.noMic":   { tr:"Mikrofon açılamadı; birlikte çalmak için mikrofon izni gerekir.", en:"Microphone failed; playing along needs microphone permission." },
    "song.okBars":  { tr:"{n} ölçü, akorlar tamam.", en:"{n} bars, chords OK." },
    "song.needChord":{ tr:"En az bir akor yaz: [Am] gibi.", en:"Write at least one chord, like [Am]." },
    "song.fixFirst":{ tr:"Önce tanınmayan akorları düzelt: {list}", en:"Fix the unknown chords first: {list}" },
    "song.untitled":{ tr:"Adsız şarkı", en:"Untitled song" },
    "song.saved":   { tr:"Kaydedildi (yalnızca bu tarayıcıda).", en:"Saved (only in this browser)." },
    "song.withLyr": { tr:" (sözlü)", en:" (with lyrics)" },
    "song.copied":  { tr:"Akorlar kopyalandı. Sözleri aşağıya yapıştırıp “Akorlarla eşleştir”e bas, sonra Kaydet.",
                      en:"Chords copied. Paste the lyrics below, press “Match to chords”, then Save." },
    "song.pasteFirst":{ tr:"Önce sözleri yapıştır.", en:"Paste the lyrics first." },
    "song.template":{ tr:"[Am]Birinci satır [F]sözleri\n[C]ikinci [G*2]satır", en:"[Am]First line [F]lyrics\n[C]second [G*2]line" },
    "song.delete":  { tr:"“{title}” silinsin mi?", en:"Delete “{title}”?" },
    "song.band":    { tr:"Grup eşliği (davul + bas)", en:"Backing band (drums + bass)" },
    "song.phones":  { tr:"Kulaklık takılı", en:"Wearing headphones" },
    "song.bandSafe":{ tr:"Kulaklık yokken birlikte çalarken grup yalnız alçak bas ve tok davulla çalar (mikrofon vuruşlarını karıştırmasın diye).",
                      en:"Without headphones, while you play along the band plays only low bass and kick (so the microphone doesn't confuse it with your strokes)." },
    "song.bandStyle":{ tr:"Eşlik: {name}", en:"Backing: {name}" }
  });
  const selEl=$("songsel"), rhyEl=$("songrhy"), bpmEl=$("songbpm"), metaEl=$("songmeta"), sheetEl=$("songsheet"),
        chordsEl=$("songchords"), nowEl=$("songnow"), resEl=$("songres"), stopBtn=$("songstop"),
        titleEl=$("songtitle"), textEl=$("songtext"), errEl=$("songerr"), RES_HINT = () => "";
  let user = store.get("songs", []);            // [{ id, title, text, rhythm, bpm, capo?, source? }]
  let song = null, parsed = null, playing = null, totals = null, lastLine = null;

  // Grup eşliği denetimleri (vuruş seçiminin altında)
  const bandRow = document.createElement("div");
  bandRow.className = "pcparts";
  bandRow.innerHTML = '<label class="chk"><input type="checkbox" id="songband"> <span></span></label><label class="chk"><input type="checkbox" id="songphones"> <span></span></label><span class="reg" id="songbandstyle"></span>';
  metaEl.before(bandRow);
  const bandEl = $("songband"), phonesEl = $("songphones");
  bandEl.checked = store.get("songBand", true); phonesEl.checked = Band.headphones;
  bandEl.addEventListener("change", () => { store.set("songBand", bandEl.checked); bandText(); });
  phonesEl.addEventListener("change", () => Band.setHeadphones(phonesEl.checked));
  Bus.on("headphones", () => { phonesEl.checked = Band.headphones; bandText(); });
  function bandText(){
    bandRow.children[0].lastChild.textContent = t("song.band");
    bandRow.children[1].lastChild.textContent = t("song.phones");
    const g = grooveById(RHYTHM_GROOVE[rhyEl.value]);
    $("songbandstyle").textContent = bandEl.checked && g ? t("song.bandStyle", { name: L(g, "name") }) + (Band.headphones ? "" : " · " + t("song.bandSafe")) : "";
  }
  rhyEl.addEventListener("change", bandText);
  function fillRhythms(){ const v = rhyEl.value; rhyEl.replaceChildren(...RHYTHMS.map(r => new Option(L(r, "name") + " · " + r.meter.split(" ")[0], r.id))); if(v) rhyEl.value = v; }
  fillRhythms();
  function all(){ return [...SONGS, ...user]; }
  function buildSelect(){
    selEl.replaceChildren();
    for(const [g, key] of [["tr", "song.gTr"], ["turku", "song.gTurku"], ["pd", "song.gPd"], ["ex", "song.gEx"]]){
      const og = document.createElement("optgroup"); og.label = t(key);
      SONGS.filter(s => s.group === g).forEach(s => og.appendChild(new Option(s.artist ? L(s, "artist") + " — " + L(s, "title") : L(s, "title"), s.id)));
      selEl.appendChild(og);
    }
    if(user.length){
      const g2 = document.createElement("optgroup"); g2.label = t("song.gUser");
      user.forEach(s => g2.appendChild(new Option(s.title, s.id)));
      selEl.appendChild(g2);
    }
  }
  // init: sayfa açılışında son şarkıyı yükler; o zaman şarkının capo'su uygulanmaz (kullanıcının capo'su korunur)
  function load(id, init = false){
    song = all().find(s => s.id === id) || SONGS[0];
    selEl.value = song.id; store.set("song", song.id);
    rhyEl.value = song.rhythm; bpmEl.value = song.bpm; bandText();
    metaEl.textContent = song.meta ? L(song, "meta") : t("song.ownMeta");
    if(song.source){
      const a = document.createElement("a");
      a.href = song.source; a.target = "_blank"; a.rel = "noopener"; a.textContent = t("song.source");
      metaEl.append(" · ", a);
    }
    // Hazır şarkının capo'su Akorlar sekmesindeki capo'ya uygulanır
    if(!init && song.capo !== undefined && song.capo !== Chords.capo) Chords.setCapo(song.capo);
    $("songlyrnote").textContent = song.lyricsNote ? L(song, "lyricsNote") + t("song.addHint") : "";
    $("songlyrbtn").hidden = !song.lyricsNote;
    titleEl.value = song.id.startsWith("u-") ? song.title : "";
    textEl.value = song.id.startsWith("u-") ? song.text : "";
    $("songdel").disabled = !song.id.startsWith("u-");
    render();
  }
  selEl.addEventListener("change", () => { Bus.emit("stopall"); load(selEl.value); });

  function render(){
    parsed = parseSong(song.id.startsWith("u-") ? song.text : localizeSections(song.text));
    sheetEl.replaceChildren(...parsed.lines.map(line => {
      const div = document.createElement("div"); div.className = "sline";
      for(const seg of line){
        const s = document.createElement("span");
        s.className = "sseg" + (seg.raw && !seg.chord ? " bad" : "");
        if(seg.bar !== null){ s.dataset.bar = seg.bar; s.dataset.bars = seg.bars; }
        const label = seg.raw ? (seg.chord || seg.raw) + (seg.bars > 1 ? " ×" + seg.bars : "") : "";
        s.innerHTML = '<b class="sch"></b><span class="sly"></span>';
        s.firstChild.textContent = label;
        s.lastChild.textContent = seg.lyric || (seg.raw ? " " : "");
        div.appendChild(s);
      }
      return div;
    }));
    // Şarkıdaki akorlar (capo hesaba katılmadan şekil olarak)
    const used = [...new Set(parsed.bars)];
    chordsEl.replaceChildren(...used.map(sym => {
      const c = chordBySymbol(sym), box = document.createElement("div");
      box.className = "mini-chord";
      const svg = svgEl("svg", { viewBox:"0 0 220 246", role:"img" });
      Chords.diagram(svg, c, { compact:true });
      box.append(svg, document.createTextNode(Chords.capo ? sym + " → " + soundingSymbol(c, Chords.capo) : sym));
      return box;
    }));
    errEl.textContent = parsed.errors.length ? t("song.unknown", { list: parsed.errors.join(", ") }) : "";
    nowEl.textContent = "";
  }
  function highlight(bar){
    sheetEl.querySelectorAll(".sseg").forEach(s => {
      const b = +s.dataset.bar, n = +s.dataset.bars;
      s.classList.toggle("now", s.dataset.bar !== undefined && bar >= b && bar < b + n);
    });
    // Çalan satır ekranın ortasında kalsın (oynatıcı ve alt çubuk altını örtmesin); satır değişince kaydırılır
    const cur = sheetEl.querySelector(".sseg.now"), line = cur && cur.parentElement;
    if(line && line !== lastLine){
      lastLine = line;
      const smooth = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
      line.scrollIntoView({ block:"center", behavior: smooth ? "smooth" : "auto" });
    }
    if(!cur) lastLine = null;
  }

  async function play(mode){
    if(!parsed.bars.length){ resEl.textContent = t("song.noChords"); return; }
    const rhythm = rhythmById(rhyEl.value), bpm = Math.min(160, Math.max(40, +bpmEl.value || song.bpm));
    totals = { hits:0, ok:0, extra:0, list:[] };
    resEl.innerHTML = mode === "play" ? t("song.countIn") + (Rhythm.latencyMeasured ? "" :
      ' <span class="warn">' + t("song.noLatency") + '</span>') : RES_HINT();
    const id = song.id, bars = parsed.bars;
    const ok = await Rhythm.start({
      mode, rhythm, bpm, click: mode === "play", countIn: true, maxBars: bars.length,
      chordAt: b => chordBySymbol(bars[b]),
      // Grup: akorun duyulan sesi (capo hesaba katılır); akoru sen ya da örnek ses çaldığı için grupta akor yok
      onBarAudio: bandEl.checked && grooveById(RHYTHM_GROOVE[rhythm.id]) ? (bar, t0, barSec) => {
        const c = chordBySymbol(bars[bar]);
        if(!c || bar >= bars.length) return;
        Band.songBar(grooveById(RHYTHM_GROOVE[rhythm.id]), bar, { root: (c.root + Chords.capo) % 12, type: c.type }, t0, barSec,
          { micSafe: mode === "play" && !Band.headphones, parts: { chord:false }, gain: mode === "play" ? 0.6 : 0.75 });
      } : null,
      onSlot: k => {
        const n = rhythm.slots.length, bar = Math.floor(k / n);
        if(k < 0){ nowEl.textContent = t("song.ready", { n: rhythm.beats.filter(x => x <= k + n).map((_, j) => j+1).join(" ") }); return; }
        highlight(bar);
        nowEl.textContent = bars[bar+1] ? t("song.nowNext", { now: bars[bar], next: bars[bar+1] }) : t("song.nowLast", { now: bars[bar] });
      },
      onEval: res => {
        totals.list.push(res);
        totals.hits += res.hits.length; totals.ok += res.hits.filter(h => h.verdict === "ok").length; totals.extra += res.extra;
        resEl.innerHTML = t("song.sofar") + Rhythm.summarize(totals.list).html;
      },
      onEnd: () => {
        if(mode === "play"){
          const s = Rhythm.summarize(totals.list);
          resEl.innerHTML = t("song.endPlay") + s.html;
          Bus.emit("achieve", { type:"song", id, pct: s.pct });
        }else resEl.innerHTML = t("song.endDemo");
      },
      onStop: () => { playing = null; stopBtn.disabled = true; highlight(-1); nowEl.textContent = ""; $("songplayer").classList.remove("on"); }
    });
    if(!ok){ resEl.textContent = t("song.noMic"); return; }
    playing = mode; stopBtn.disabled = false; $("songplayer").classList.add("on");
  }
  $("songdemo").addEventListener("click", () => play("demo"));
  $("songplay").addEventListener("click", () => play("play"));
  stopBtn.addEventListener("click", () => Rhythm.stop());

  // ---- Kendi şarkın ----
  textEl.addEventListener("input", () => {
    const p = parseSong(textEl.value);
    errEl.textContent = p.errors.length ? t("song.unknown", { list: p.errors.join(", ") }) : p.bars.length ? t("song.okBars", { n: p.bars.length }) : "";
  });
  $("songsave").addEventListener("click", () => {
    const p = parseSong(textEl.value);
    if(!p.bars.length){ errEl.textContent = t("song.needChord"); return; }
    if(p.errors.length){ errEl.textContent = t("song.fixFirst", { list: p.errors.join(", ") }); return; }
    const title = titleEl.value.trim() || t("song.untitled");
    let s = song && song.id.startsWith("u-") ? user.find(u => u.id === song.id) : null;
    if(!s){ s = { id: "u-" + Date.now() }; user.push(s); }
    Object.assign(s, { title, text: textEl.value, rhythm: rhyEl.value, bpm: Math.min(160, Math.max(40, +bpmEl.value || 80)) });
    if(draft){ if(draft.capo) s.capo = draft.capo; if(draft.source) s.source = draft.source; draft = null; }
    store.set("songs", user);
    buildSelect(); load(s.id);
    errEl.textContent = t("song.saved");
  });
  // Hazır şarkıyı sözlü kopyaya dönüştürmek: akorlar editöre gelir, sözleri kullanıcı yapıştırır
  let draft = null;
  $("songlyrbtn").addEventListener("click", () => {
    draft = { capo: song.capo || 0, source: song.source || null };
    const base = song;
    song = { id:"u-yeni", title:"", text:"", rhythm: base.rhythm, bpm: base.bpm };
    titleEl.value = (base.group === "tr" ? base.artist + " — " : "") + L(base, "title") + t("song.withLyr");
    // Hazır şarkının bölüm adları seçili dilde kopyalanır
    textEl.value = localizeSections(base.text);
    $("songlyrics").value = "";
    $("songdel").disabled = true;
    errEl.textContent = t("song.copied");
    $("songeditor").open = true;
    $("songlyrics").focus();
  });
  $("songmerge").addEventListener("click", () => {
    const lyr = $("songlyrics").value;
    if(!lyr.trim()){ errEl.textContent = t("song.pasteFirst"); return; }
    textEl.value = mergeLyrics(textEl.value, lyr);
    textEl.dispatchEvent(new Event("input"));
  });
  $("songnew").addEventListener("click", () => {
    draft = null;
    song = { id:"u-yeni", title:"", text:"", rhythm:"pop", bpm:80 };
    titleEl.value = ""; textEl.value = t("song.template");
    $("songdel").disabled = true; errEl.textContent = "";
    titleEl.focus();
  });
  $("songdel").addEventListener("click", () => {
    if(!song || !song.id.startsWith("u-") || !confirm(t("song.delete", { title: song.title }))) return;
    user = user.filter(u => u.id !== song.id); store.set("songs", user);
    buildSelect(); load(SONGS[0].id);
  });

  Bus.on("capo", () => render());
  Bus.on("lang", () => { bandText(); }); 
  Bus.on("lang", () => { const id = song.id; fillRhythms(); buildSelect(); if(!id.startsWith("u-yeni")) load(id, true); if(!playing) resEl.innerHTML = RES_HINT(); });
  buildSelect(); load(store.get("song", SONGS[0].id), true);
  return { open(id){ load(id); } };
})();
