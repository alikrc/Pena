// Arayüz testleri: index.html jsdom içinde gerçek betiklerle yüklenir; ses ve mikrofon sahte nesnelerle değiştirilir.
// Sekmeler, akorlar, şarkılar, ezgiler, kulak, metronom, dersler ve ayarlar tıklanarak denenir.
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');

// Sayfa sahte bir http adresinden açılır (file:// adreste history.replaceState jsdom'da güvenlik hatası verir);
// bu adresteki dosyalar diskten okunur.
const ORIGIN = 'http://gitar.test/';
class DiskLoader extends ResourceLoader{
  fetch(url, opts){
    if(url.startsWith(ORIGIN)){
      const p = Promise.resolve(fs.readFileSync(path.join(__dirname, decodeURIComponent(url.slice(ORIGIN.length).split(/[?#]/)[0]))));
      p.abort = () => {};
      return p;
    }
    return super.fetch(url, opts);
  }
}

let fail = 0;
const ok = (c, msg, extra = '') => { console.log((c ? '  OK  ' : '  FAIL') + ' ' + msg + (extra ? '   ' + extra : '')); if(!c) fail++; };

// ---- Sahte Web Audio: düğümler bağlanır, zamanlama çağrıları kabul edilir, ses çıkmaz ----
function fakeAudio(win){
  const param = v => ({ value: v, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){},
                        setTargetAtTime(){}, cancelScheduledValues(){} });
  const node = extra => Object.assign({ connect(n){ return n; }, disconnect(){} }, extra);
  class FakeAudioContext{
    constructor(){ this.t0 = win.performance.now(); this.sampleRate = 48000; this.state = 'running'; this.destination = node(); }
    get currentTime(){ return (win.performance.now() - this.t0) / 1000; }
    resume(){ return Promise.resolve(); }
    createPeriodicWave(){ return {}; }
    createOscillator(){ return node({ frequency: param(440), setPeriodicWave(){}, start(){}, stop(){}, onended: null }); }
    createBiquadFilter(){ return node({ type: '', Q: param(1), frequency: param(1000) }); }
    createGain(){ return node({ gain: param(1) }); }
    createWaveShaper(){ return node({ curve: null, oversample: 'none' }); }
    createBuffer(ch, len){ const d = new Float32Array(len); return { getChannelData: () => d }; }
    createBufferSource(){ return node({ buffer: null, start(){} }); }
    createAnalyser(){ return node({ fftSize: 2048, getFloatTimeDomainData(){} }); }
  }
  win.AudioContext = FakeAudioContext;
}

async function load(storage = {}){
  const errors = [];
  const vc = new VirtualConsole();
  // jsdom'un CSS ayrıştırıcısı bazı modern kuralları tanımıyor: uygulama hatası değil
  vc.on('jsdomError', e => { if(!/Could not parse CSS stylesheet/.test(e.message)) errors.push(e.message); });
  vc.on('error', e => errors.push(String(e)));
  const file = path.join(__dirname, 'index.html');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    url: ORIGIN + 'index.html',
    runScripts: 'dangerously', resources: new DiskLoader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win){
      fakeAudio(win);
      win.Element.prototype.scrollIntoView = function(){};
      win.scrollTo = () => {};
      win.confirm = () => true;
      win.HTMLCanvasElement.prototype.getContext = () => null;
      // Varsayılan dil Türkçe (jsdom'un tarayıcı dili İngilizce); testler başka dil isterse storage ile verir
      const st = Object.assign({ lang: 'tr' }, storage);
      for(const k in st) win.localStorage.setItem('gt.' + k, JSON.stringify(st[k]));
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

(async () => {
  const { win, doc, errors } = await load();
  const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const g = name => win.eval(name);                    // const ile tanımlı genel adlar window'da görünmez
  const visible = () => [...doc.querySelectorAll('.panel')].filter(p => !p.hidden).map(p => p.id);

  console.log('\n[UI 1] Yükleme ve sekmeler');
  ok(errors.length === 0, 'sayfa betik hatası olmadan yükleniyor', errors.slice(0, 3).join(' | '));
  const tabs = [...doc.querySelectorAll('#tabs [role=tab]')];
  ok(tabs.length === 9 && visible().join() === 'panel-dersler', 'ilk açılışta yalnız Dersler paneli görünür', visible().join());
  let tabErr = [];
  for(const t of tabs){
    click(t);
    const want = t.getAttribute('aria-controls');
    if(visible().join() !== want || t.getAttribute('aria-selected') !== 'true') tabErr.push(want);
  }
  ok(tabErr.length === 0, 'her sekme kendi panelini açıyor, diğerleri gizleniyor', tabErr.join(','));
  ok(win.location.hash === '#kulak' && JSON.parse(win.localStorage.getItem('gt.tab')) === 'kulak', 'açık sekme adrese ve hafızaya yazılıyor');

  ok($('viewtitle').textContent === 'Kulak' && $('morebtn').classList.contains('active'), 'başlık açık sekmeyi gösteriyor, "Daha" sekmesi seçiliyken Daha düğmesi vurgulu');
  click($('morebtn'));
  ok($('nav').classList.contains('open') && !$('scrim').hidden && $('morebtn').getAttribute('aria-expanded') === 'true', 'Daha menüsü açılıyor, arka plan karartılıyor');
  click($('scrim'));
  ok(!$('nav').classList.contains('open') && $('scrim').hidden, 'karartmaya dokununca Daha menüsü kapanıyor');
  click($('morebtn')); click($('tab-ritim'));
  ok(!$('nav').classList.contains('open') && visible().join() === 'panel-ritim', 'Daha menüsünden sekme seçilince menü kapanıyor');
  click($('setbtn'));
  ok(!$('settings').hidden && $('app').inert === true && !$('scrim').hidden, 'ayarlar paneli açılıyor, arkası etkisiz');
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
  ok($('settings').hidden && !$('app').inert && $('scrim').hidden, 'Esc ayarlar panelini kapatıyor');
  ok(!$('welcome').hidden, 'ilk açılışta tanıtım kartı görünüyor');
  click($('welcomeok'));
  ok($('welcome').hidden && JSON.parse(win.localStorage.getItem('gt.welcomed')) === true, '"Anladım" tanıtımı kapatıp hatırlıyor');
  click($('brand'));
  ok(visible().join() === 'panel-dersler', 'logoya basınca Dersler (ana sayfa) açılıyor');

  console.log('\n[UI 2] Dersler');
  ok(doc.querySelectorAll('#llist .lesson').length === 16 && doc.querySelector('#llist .lesson').classList.contains('open'), '16 ders, ilki açık');
  click(doc.querySelector('#llist .lesson .stopbtn'));          // Atla
  ok(doc.querySelectorAll('#llist .lesson.done').length === 1 && $('lcount').textContent.startsWith('1 /'), 'Atla dersi tamamlıyor, ilerleme güncelleniyor');
  g('Bus').emit('achieve', { type: 'chordClean', chord: 'Em' });
  ok(doc.querySelectorAll('#llist .lesson.done').length === 2, 'başarı olayı açık dersi tamamlıyor (Em)');
  click(doc.querySelector('#llist .lesson.open .primary'));        // Başla: Am dersi
  ok(visible().join() === 'panel-akorlar' && !$('lessonbar').hidden && $('lbtitle').textContent === 'Am akoru' && !$('cpane-check').hidden,
     'Başla akor sekmesini Kontrol et bölümünde açıyor, hedef şeritte', $('lbtitle').textContent);
  g('Bus').emit('achieve', { type: 'chordClean', chord: 'Am' });
  ok($('lessonbar').classList.contains('done') && $('lbgoal').textContent.includes('Dörtlük vuruş'), 'ders bitince şeritte tebrik ve sıradaki ders', $('lbgoal').textContent);
  click($('lbacts').querySelector('.primary'));
  ok(visible().join() === 'panel-ritim' && $('lbtitle').textContent === 'Dörtlük vuruş' && !$('lessonbar').classList.contains('done'),
     '"Sıradaki derse geç" yeni dersi ilgili sekmede başlatıyor');
  click($('tab-kulak'));
  ok($('lessonbar').hidden, 'şerit yalnızca dersin sekmesinde görünüyor');
  click($('tab-ritim')); click($('lbacts').querySelector('.lbclose'));
  ok($('lessonbar').hidden && JSON.parse(win.localStorage.getItem('gt.activeLesson')) === null, 'şerit kapatılabiliyor');
  click($('tab-dersler'));

  console.log('\n[UI 2b] Diyalog, akor bölümleri, ayrıntılar');
  const dp = g('Dialog').show({ title: 'Deneme', html: 'metin', actions: [{ label: 'Hayır', value: false }, { label: 'Evet', value: true, primary: true }] });
  ok(!$('dlg').hidden && $('app').inert === true && doc.activeElement === $('dlgacts').querySelector('.primary'), 'diyalog açılıyor, odak birincil düğmede');
  click($('dlgacts').querySelector('.primary'));
  ok(await dp === true && $('dlg').hidden && !$('app').inert, 'diyalog seçilen değerle kapanıyor');
  click($('csub-practice'));
  ok(!$('cpane-practice').hidden && $('cpane-learn').hidden && $('cpane-check').hidden, 'Alıştırma bölümü açılıyor, diğerleri gizleniyor');
  click($('csub-learn'));
  ok($('settings').contains($('rcal')) && !$('panel-ritim').contains($('rcal')), 'gecikme ölçümü Ayarlar panelinde');
  ok($('sapmore').tagName === 'DETAILS' && !$('sapmore').open && $('sapmore').contains($('hz')), 'sapta frekans ve sapma "Ayrıntılar" altında');

  console.log('\n[UI 3] Akort');
  ok($('tstrings').children.length === 6 && $('tstrings').textContent.includes('Mi2'), 'altı tel düğmesi, 6. tel Mi2');
  click(tabs.find(t => t.id === 'tab-akort'));
  g('Bus').emit('frame', { d: { freq: 82.41 * Math.pow(2, -20/1200), rms: 0.1 }, now: win.performance.now(), loud: true });
  ok($('tadvice').textContent.includes('sık') && $('tnote').textContent.startsWith('6. tel'), '20 sent pes 6. tel: "burguyu sık"', $('tadvice').textContent);

  console.log('\n[UI 4] Sap ve notalar');
  g('Bus').emit('note', { r: win.analyze(win.midiToFreq(57) * Math.pow(2, 12/1200), 12), now: win.performance.now(), isNew: true });
  ok($('perde').textContent === 'La4' && $('centtxt').textContent.includes('+12 sent'), 'mikrofondan gelen nota gösteriliyor (La4, +12 sent)', $('perde').textContent + ' / ' + $('centtxt').textContent);
  ok(doc.querySelectorAll('#neck .pos').length === 6 * 21 && doc.querySelectorAll('#rail .note').length === 45, 'sap 6×21 konum, nota şeridi 45 nota');
  ok(!/AEU|koma|Rast/.test($('panel-sap').textContent), 'Sap sekmesinde AEU/koma izi yok');

  console.log('\n[UI 5] Akorlar ve capo');
  const groupBtn = [...$('cgroups').children].find(b => b.textContent === 'Barre');
  click(groupBtn);
  click([...$('clist').children].find(b => b.textContent === 'F'));
  ok($('cname').textContent.startsWith('Fa majör') && $('cdiag').querySelector('rect.cd-dot'), 'F seçilince barre çiziliyor');
  $('capo').value = '2'; $('capo').dispatchEvent(new win.Event('change'));
  ok($('capotag').textContent.includes('Sol majör') && $('capotag').textContent.includes('(G)'), 'capo 2: F şekli G olarak duyulur', $('capotag').textContent);
  $('capo').value = '0'; $('capo').dispatchEvent(new win.Event('change'));

  console.log('\n[UI 6] Şarkılar');
  const songOpts = [...$('songsel').options];
  let songErr = [];
  for(const o of songOpts){
    $('songsel').value = o.value; $('songsel').dispatchEvent(new win.Event('change'));
    if(doc.querySelectorAll('#songsheet .sseg.bad').length) songErr.push(o.value + ': tanınmayan akor');
    if(!doc.querySelectorAll('#songsheet .sseg[data-bar]').length) songErr.push(o.value + ': akor yok');
  }
  ok(songOpts.length >= 18 && songErr.length === 0, songOpts.length + ' hazır şarkının hepsi akorlarıyla çiziliyor', songErr.join(' | '));
  $('songsel').value = 'paramparca'; $('songsel').dispatchEvent(new win.Event('change'));
  ok($('songlyrnote').textContent.includes('telifli') && !$('songlyrbtn').hidden, 'Türkçe şarkıda "telifli olduğu için" notu ve Sözleri kendin ekle düğmesi');
  click($('songlyrbtn'));
  $('songlyrics').value = 'birinci satir sozleri\nikinci satir';
  click($('songmerge')); click($('songsave'));
  const saved = JSON.parse(win.localStorage.getItem('gt.songs') || '[]');
  ok(saved.length === 1 && saved[0].text.includes('sozleri') && saved[0].source && $('songsel').value === saved[0].id,
     'sözler eşleşip kaydediliyor (yalnız yerel depoda), kaynak bağlantısı korunuyor');

  ok($('songband') && $('songband').checked && $('songbandstyle').textContent.includes('Eşlik'), 'Şarkılar: grup eşliği açık, vuruşa uyan kalıp yazıyor');
  const BandObj = g('Band'); let bandBars = 0; const origBar = BandObj.songBar; BandObj.songBar = (...a) => { bandBars++; return origBar(...a); };
  $('songrhy').value = 'sekizlik'; $('songbpm').value = 160;
  click($('songdemo')); await tick(1700); click($('songstop'));
  BandObj.songBar = origBar;
  ok(bandBars >= 1, 'şarkı dinlenirken grup ölçü ölçü çalıyor', bandBars + ' ölçü');

  console.log('\n[UI 6b] Parçalar');
  click(tabs.find(t => t.id === 'tab-parcalar'));
  ok(!$('panel-parcalar').hidden && doc.querySelectorAll('#pcscore svg.score').length === 1, 'Parçalar sekmesi açılıyor, dizek çiziliyor');
  const pcOpts = [...$('pcsel').options];
  let pcErr = [];
  for(const o of pcOpts){
    $('pcsel').value = o.value; $('pcsel').dispatchEvent(new win.Event('change'));
    const p = win.parsePiece(win.pieceById(o.value).text, win.pieceById(o.value).meter);
    if(doc.querySelectorAll('#pcscore .pn').length !== p.notes.length) pcErr.push(o.value + ': nota sayısı');
    if(doc.querySelectorAll('#pcscore .chs').length < 1) pcErr.push(o.value + ': akor yok');
    if(doc.querySelectorAll('#pcscore .tabn').length !== p.notes.filter(n => n.w !== null).length) pcErr.push(o.value + ': tab');
    if($('pcgroove').selectedOptions[0].disabled) pcErr.push(o.value + ': eşlik ölçüsü');
  }
  ok(pcOpts.length >= 19 && pcErr.length === 0, pcOpts.length + ' parçanın notası, akorları ve tabı çiziliyor; eşlik ölçüye uyuyor', pcErr.join(' | '));
  $('pcsel').value = 'karsilama-etut'; $('pcsel').dispatchEvent(new win.Event('change'));
  ok($('pcgroove').value === 'karsilama' && [...$('pcgroove').options].filter(o => !o.disabled).every(o => win.grooveById(o.value).beats === 4.5),
     '9/8 parçada yalnız 9/8 kalıplar seçilebiliyor');
  ok(doc.querySelectorAll('#pcscore .acc').length >= 2 && doc.querySelectorAll('#pcscore .beam').length >= 2, 'değiştiriciler ve kirişler çiziliyor');
  $('pcpct').value = 130; $('pcpct').dispatchEvent(new win.Event('input'));
  click($('pclisten')); await tick(300);
  ok(!$('pcstop').disabled && $('pcplayer').classList.contains('on'), 'Dinle: çalıcı açık');
  click($('pcstop'));
  ok($('pcstop').disabled, 'Durdur');
  click(doc.querySelector('#pcscore [data-bar="2"]'));
  ok($('pcnow').textContent.includes('3. ölçü'), 'ölçüye dokununca oradan başlar');
  click($('pcloop')); click(doc.querySelector('#pcscore [data-bar="1"]')); click(doc.querySelector('#pcscore [data-bar="3"]'));
  ok($('pcnow').textContent.includes('2–4') && doc.querySelectorAll('#pcscore .pn.inloop').length > 0, 'döngü iki ölçü arasına kuruluyor');
  click($('pcloop'));
  ok(doc.querySelectorAll('#pcsteps li').length === 6, 'Parçayı öğren: 6 adım');
  $('pceditor').open = true; click($('pcnew'));
  $('pcedtitle').value = 'Deneme'; click($('pcsave'));
  const myp = JSON.parse(win.localStorage.getItem('gt.pieces') || '[]');
  ok(myp.length === 1 && $('pcsel').value === myp[0].id && doc.querySelectorAll('#pcscore .pn').length === 7, 'kendi parçan kaydediliyor ve çiziliyor');
  $('pcedtext').value = 'C5 C5 | C5 C5 C5 | C5:4'; $('pcedtext').dispatchEvent(new win.Event('input'));
  ok($('pcederr').textContent.includes('Hatalı'), 'hatalı ölçü bildiriliyor');
  $('pcpct').value = 100; $('pcpct').dispatchEvent(new win.Event('input'));
  click(tabs.find(t => t.id === 'tab-ezgiler'));

  console.log('\n[UI 7] Ezgiler ve kulak');
  ok(doc.querySelectorAll('#melnotes .mnote').length === win.parseMelody(win.melodyById('nese').text).notes.length, 'Neşeye Övgü nota kartları');
  click(tabs.find(t => t.id === 'tab-kulak'));
  click($('earanswers').children[0]);
  ok(doc.querySelectorAll('#eardots i.r, #eardots i.w').length === 1 && [...$('earanswers').children].every(b => b.disabled), 'cevap işaretleniyor, düğmeler kilitleniyor');

  console.log('\n[UI 8] Metronom ve ayarlar');
  click($('metrobtn'));
  ok(!$('metro').hidden, 'Metronom paneli açılıyor');
  click($('mrun')); await tick(80);
  ok(g('Metronome').running && $('mrun').textContent === 'Durdur', 'metronom başlıyor');
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
  ok(!g('Metronome').running, 'Esc metronomu durduruyor');
  click($('mtap')); await tick(500); click($('mtap'));
  ok(Math.abs(+$('mbpmv').textContent - 120) <= 6, 'iki dokunuş ~120 BPM', $('mbpmv').textContent);
  ok($('setbtn').textContent.includes('Akustik'), 'ayar düğmesinde çalgı özeti', $('setbtn').textContent);
  $('instrument').value = 'elektro24'; $('instrument').dispatchEvent(new win.Event('change'));
  ok(doc.querySelectorAll('#neck .pos').length === 6 * 25 && $('setbtn').textContent.includes('Elektro'), 'çalgı değişince sap 24 perde, özet güncel');

  console.log('\n[UI 9] Saklanan ayarlarla açılış');
  const second = await load({ tab: 'akorlar', instrument: 'klasik', capo: 3, chord: 'Dm' });
  const d2 = second.doc;
  ok(second.errors.length === 0 && !d2.getElementById('panel-akorlar').hidden && d2.querySelectorAll('#neck .pos').length === 6 * 20 &&
     d2.getElementById('cname').textContent.startsWith('Re minör') && d2.getElementById('capo').value === '3',
     'son sekme, çalgı, capo ve akor geri yükleniyor', second.errors.join(' | '));

  console.log('\n[UI 10] Dil ve tema');
  const third = await load();
  const W = third.win, D = third.doc, G = n => W.eval(n), $3 = id => D.getElementById(id);
  const click3 = el => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  const STRS = G('STR');
  ok(Object.keys(STRS).length > 300 && Object.entries(STRS).every(([k, v]) => v.tr && v.en), Object.keys(STRS).length + ' metnin hepsinin Türkçesi ve İngilizcesi var',
     Object.entries(STRS).filter(([k, v]) => !v.tr || !v.en).map(([k]) => k).slice(0, 5).join(','));
  // HTML'deki Türkçe metin sözlükle aynı mı (betik çalışmadan, ham sayfa)
  const raw = new JSDOM(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')).window.document;
  const norm = x => x.replace(/\s+/g, ' ').trim();
  const mism = [...raw.querySelectorAll('[data-i18n]')].filter(el => {
    const tr = STRS[el.dataset.i18n] && STRS[el.dataset.i18n].tr; if(!tr) return true;
    const mode = el.dataset.i18nMode;
    const have = mode === 'html' ? el.innerHTML : mode === 'last' ? [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('') : el.textContent;
    return norm(have) !== norm(tr);
  }).map(el => el.dataset.i18n);
  const attrMism = [...raw.querySelectorAll('[data-i18n-attr]')].flatMap(el => el.dataset.i18nAttr.split(';').map(p => [el, ...p.split(':')]))
    .filter(([el, a, k]) => !STRS[k] || norm(el.getAttribute(a)) !== norm(STRS[k].tr)).map(([, , k]) => k);
  ok(mism.length === 0 && attrMism.length === 0, 'HTML\'deki Türkçe metinler sözlükle birebir aynı', [...mism, ...attrMism].join(','));
  const langBtn = l => D.querySelector('#langseg [data-lang=' + l + ']');
  click3(langBtn('en'));
  ok(D.documentElement.lang === 'en' && $3('tab-dersler').textContent === 'Lessons' && langBtn('en').getAttribute('aria-checked') === 'true' &&
     $3('viewtitle').textContent === 'Lessons' && $3('setbtn').textContent.includes('Settings') &&
     JSON.parse(W.localStorage.getItem('gt.lang')) === 'en', 'dil düğmesi İngilizceye geçiriyor ve saklıyor');
  ok(D.querySelector('#llist .lesson h3').textContent === 'Tune your guitar' && $3('cname').textContent.startsWith('A minor') &&
     $3('tstrings').textContent.includes('E2') && $3('perde').textContent === 'G4', 'dersler, akor adı ve nota adları İngilizce (C D E)',
     D.querySelector('#llist .lesson h3').textContent + ' / ' + $3('cname').textContent + ' / ' + $3('perde').textContent);
  // Özel adlar (şarkı, sanatçı, usul) dışında Türkçe harf kalmamalı
  const NAMES = [...G('SONGS').flatMap(x => [x.title, x.artist || '']), ...G('PIECES').flatMap(x => [x.title, x.title_en || '', x.by, x.by_en || '']),
    ...G('GROOVES').flatMap(x => [x.name, x.name_en]), 'Türk aksağı', 'Türkçe', 'Müfit Erdağ', 'Mor ve Ötesi', 'Barış Manço', 'Yüksek Sadakat', 'MFÖ', 'Kâtibim', 'düm']
    .filter(Boolean).sort((a, b) => b.length - a.length);
  const leftovers = [];
  for(const tb of [...D.querySelectorAll('#tabs [role=tab]')]){
    click3(tb);
    let txt = D.body.textContent;
    for(const n of NAMES) txt = txt.split(n).join('');
    const m = txt.match(/[^\s]*[çğışöüÇĞİŞÖÜ][^\s]*/g);
    if(m) leftovers.push(tb.id + ': ' + [...new Set(m)].slice(0, 8).join(' '));
  }
  ok(leftovers.length === 0, 'İngilizcede hiçbir sekmede Türkçe metin kalmıyor', leftovers.join(' | '));
  ok($3('langbtn').textContent === 'TR', 'üst çubuktaki dil düğmesi öbür dili gösteriyor');
  click3($3('langbtn'));
  ok(D.documentElement.lang === 'tr' && $3('tab-dersler').textContent === 'Dersler' && D.querySelector('#llist .lesson h3').textContent === 'Gitarı akort et',
     'Türkçeye geri dönüyor');
  const themeBtn = v => D.querySelector('#themeseg [data-theme=' + v + ']');
  ok(D.documentElement.dataset.theme === undefined && themeBtn('auto').getAttribute('aria-checked') === 'true', 'tema varsayılan: otomatik');
  click3(themeBtn('light')); const th1 = D.documentElement.dataset.theme;
  click3(themeBtn('dark')); const th2 = D.documentElement.dataset.theme;
  const meta = D.querySelector('meta[name="theme-color"]').getAttribute('content');
  click3(themeBtn('auto')); const th3 = D.documentElement.dataset.theme;
  ok(th1 === 'light' && th2 === 'dark' && meta === '#0E1413' && th3 === undefined && JSON.parse(W.localStorage.getItem('gt.theme')) === 'auto' &&
     themeBtn('auto').getAttribute('aria-checked') === 'true', 'tema seçimi açık → koyu → otomatik, tarayıcı çubuğu rengi uyuyor');
  const fourth = await load({ lang: 'en', theme: 'dark' });
  ok(fourth.errors.length === 0 && fourth.doc.documentElement.lang === 'en' && fourth.doc.documentElement.dataset.theme === 'dark' &&
     fourth.doc.getElementById('tab-akort').textContent === 'Tuner', 'kayıtlı İngilizce ve koyu tema ile açılış', fourth.errors.join(' | '));
  const left4 = [];
  for(const tb of [...fourth.doc.querySelectorAll('#tabs [role=tab]')]){
    tb.dispatchEvent(new fourth.win.MouseEvent('click', { bubbles: true }));
    let txt = fourth.doc.body.textContent;
    for(const n of NAMES) txt = txt.split(n).join('');
    const m = txt.match(/[^\s]*[çğışöüÇĞİŞÖÜ][^\s]*/g);
    if(m) left4.push(tb.id + ': ' + [...new Set(m)].slice(0, 8).join(' '));
  }
  ok(left4.length === 0, 'doğrudan İngilizce açılışta da hiçbir sekmede Türkçe metin yok', left4.join(' | '));
  W.close(); fourth.win.close();

  console.log(fail === 0 ? '\nTUM ARAYUZ TESTLERI GECTI\n' : `\n${fail} ARAYUZ TESTI BASARISIZ\n`);
  win.close(); second.win.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
