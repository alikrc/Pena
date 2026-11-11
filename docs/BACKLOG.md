# Backlog

Eklenebilecek özellikler, öncelik sırasıyla. Bitince `[x]` ile işaretle.

## Öncelikli (küçük iş, büyük etki)

- [ ] **İlerlemeyi yedekle / geri yükle.** Her şey yalnızca `localStorage`'da (`js/app/base.js`). Telefon değişince ya da
      uygulama verisi silinince ders ilerlemesi, rekorlar ve sözlü şarkı kopyaları kaybolur. Tüm `gt.*` anahtarlarını JSON
      olarak dışa aktar (indir / paylaş) ve içe aktar.
- [ ] **Günlük seri ve çalışma süresi.** Mikrofon açıkken geçen süreyi gün gün say; "7 gündür çalışıyorsun", haftalık
      küçük grafik.
- [ ] **Solak modu.** Sap ve akor kutu şemalarını aynala; ayarlarda seçilir, saklanır.

## İçerik

- [ ] **2. seviye dersler.** F'den sonrası: Dm, E, A, power chord, B barre, ilk pentatonik, ilk parmakla çalma kalıbı,
      iki şarkı daha. Mevcut `goal.type` türleriyle (chord / rhythm / changes / ear / melody / song) çoğu yalnızca veri.
- [ ] **Gamlar sekmesi.** Majör, doğal minör, minör/majör pentatonik kalıpları sapta; mikrofonla nota nota kontrol
      (ezgi takibi yeniden kullanılır).
- [ ] **Makamlar (12 sesli yaklaşım).** Hicaz, Kürdi, Nihavent, Uşşak vb. gitarda çalınabilen yaklaşımları; "koma sesleri
      gitarda yok" notuyla.
- [ ] **Parmakla çalma (arpej) kalıpları.** Ritim sekmesine Travis ve basit arpejler.
- [x] **Daha fazla ezgi.** Parçalar sekmesi: 19 notalı parça, eşlik grubu, Benimle çal.
- [ ] **Türkü ezgileri.** Kâtibim, Sarı Gelin gibi anonim türkülerin ezgileri güvenilir bir notadan (ör. TRT repertuvarı) alınıp Parçalar'a eklenmeli.

## Şarkılar

- [ ] **Ton değiştir + capo önerisi.** "Bildiğin akorlarla çal": şarkıyı aktar, yalnızca öğrenilmiş akorları kullanan
      capo konumunu öner.
- [ ] **Arama, favoriler, zorluk etiketi** ("3 akor, barre yok").
- [ ] **Otomatik kaydırma.**
- [ ] **Derse bağlantı.** Şarkıdaki bilinmeyen akor için "önce G'yi öğren → derse git".

## Kullanım ve erişilebilirlik

- [ ] **Bugünün antrenmanı.** 10 dakikalık hazır oturum (ısınma → en yavaş akor geçişi → vuruş kalıbı → şarkı);
      rekorlara bakarak en zayıf alanı seçer.
- [ ] **Kendini kaydet ve dinle.** 30 saniyelik kayıt, cihazda kalır.
- [ ] **Metronomda titreşim** (`navigator.vibrate`), isteğe bağlı.
- [ ] **İlk açılış rehberi.** Mikrofon izninin nedenini açıkla ("ses cihazdan çıkmaz"), "Hiç çaldın mı?" sorusuna göre
      derslere ya da sekmelere yönlendir.

## Kulak eğitimi

- [ ] Akor dizilişlerini kulaktan bulma (I–IV–V, i–VI–VII).
- [ ] Duyulan notayı adlandırma.
- [ ] Ritim dikte.

## Yayın

Ayrıntılar `docs/PLAY_STORE.md`'de.

- [ ] Kendi alan adı (ör. `pena.app`) ve `/.well-known/assetlinks.json`
- [ ] 1024×500 tanıtım görseli
- [ ] Kapalı test (12 kullanıcı, 14 gün)
