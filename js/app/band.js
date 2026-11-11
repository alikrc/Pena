// Eşlik grubunun sesi ve çalıcısı. Davul seti, darbuka, bas ve akor Web Audio ile sentezlenir; Snd'nin tel seslerinden
// ayrıdır (Snd.busy'yi tetiklemez), yani grup çalarken mikrofon dinlemeye devam eder.
// micSafe (kulaklık yok, hoparlörden çalıyor): yalnız alçak bas ve tok kick çalar. İkisi de perde bulucunun ve vuruş
// yakalayıcının bandının (70 Hz üstü) altındadır; trampet, zil, darbuka teki ve akorlar mikrofona karışıp nota ya da
// vuruş sanılacağı için susar. Kulaklıkla bütün grup çalar.
const Band = (() => {
  let noiseBuf = null;
  function noise(a){
    if(!noiseBuf){
      const n = Math.round(a.sampleRate*0.5); noiseBuf = a.createBuffer(1, n, a.sampleRate);
      const d = noiseBuf.getChannelData(0); for(let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
    }
    const s = a.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(a, g, t, peak, dur, att = 0.003){
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(a, dest, type, f0, f1, t, peak, dur, att){
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if(f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(dur, 0.15));
    env(a, g, t, peak, dur, att); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(a, dest, type, f, q, t, peak, dur){
    const s = noise(a), bf = a.createBiquadFilter(), g = a.createGain();
    bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    env(a, g, t, peak, dur, 0.001); s.connect(bf).connect(g).connect(dest); s.start(t); s.stop(t + dur + 0.05);
  }
  // Bir olayı t anında (ses saati, saniye) çalar. beatSec: bir dörtlüğün süresi. o: { micSafe, vol: { drum, bass, chord } }
  function play(a, dest, ev, t, beatSec, o = {}){
    const vol = p => (o.vol && o.vol[p] != null ? o.vol[p] : 1);
    if(ev.part === "drum"){
      const v = vol("drum");
      if(ev.k === "K" || ev.k === "D"){
        // micSafe: 60 → 40 Hz, yumuşak başlangıç (vuruş yakalayıcının 70 Hz üstü bandına taşmaz)
        if(o.micSafe) tone(a, dest, "sine", 62, 40, t, 0.55*v, 0.25, 0.012);
        else if(ev.k === "K"){ tone(a, dest, "sine", 120, 45, t, 0.8*v, 0.3); hiss(a, dest, "lowpass", 900, 0.7, t, 0.08*v, 0.03); }
        else{ tone(a, dest, "sine", 110, 68, t, 0.75*v, 0.32); hiss(a, dest, "lowpass", 500, 0.7, t, 0.12*v, 0.06); }
      }
      if(o.micSafe) return;
      if(ev.k === "S"){ tone(a, dest, "triangle", 210, 160, t, 0.2*v, 0.09); hiss(a, dest, "bandpass", 2200, 0.8, t, 0.35*v, 0.16); }
      else if(ev.k === "h") hiss(a, dest, "highpass", 7500, 0.7, t, 0.12*v, 0.04);
      else if(ev.k === "o") hiss(a, dest, "highpass", 7000, 0.7, t, 0.12*v, 0.22);
      else if(ev.k === "T"){ tone(a, dest, "sine", 620, 560, t, 0.18*v, 0.06); hiss(a, dest, "bandpass", 3200, 2.5, t, 0.32*v, 0.07); }
      else if(ev.k === "k") hiss(a, dest, "bandpass", 3600, 3, t, 0.14*v, 0.045);
    }else if(ev.part === "bass"){
      const f = midiToFreq(ev.m), dur = Math.max(0.15, ev.dur*beatSec*0.95), v = vol("bass");
      if(o.micSafe){ tone(a, dest, "sine", f, f, t, 0.55*v, dur, 0.012); return; }
      const os = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
      os.type = "sawtooth"; os.frequency.value = f;
      lp.type = "lowpass"; lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.25);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32*v, t + 0.008);
      g.gain.setTargetAtTime(0.18*v, t + 0.05, 0.15); g.gain.setTargetAtTime(0.0001, t + dur, 0.04);
      os.connect(lp).connect(g).connect(dest); os.start(t); os.stop(t + dur + 0.3);
    }else if(ev.part === "chord"){
      if(o.micSafe) return;
      const dur = Math.max(0.15, Math.min(0.6, ev.dur*beatSec)), v = vol("chord");
      ev.ms.forEach((m, i) => tone(a, dest, "triangle", midiToFreq(m), 0, t + i*0.008, 0.07*v, dur, 0.004));
    }else if(ev.part === "lead"){
      // Ezgi: yazılı nota bir oktav pes duyulur (gitar gibi)
      const f = midiToFreq(ev.m - GUITAR_TRANSPOSE), dur = Math.max(0.12, ev.dur*beatSec*0.92), v = vol("lead");
      if(o.leadPluck){ Snd.pluck(f, t, 0.3*v); return; }           // dinlerken gitar sesiyle (mikrofon kapalı)
      const os = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
      os.type = "sawtooth"; os.frequency.value = f;
      lp.type = "lowpass"; lp.frequency.setValueAtTime(f*8, t); lp.frequency.exponentialRampToValueAtTime(f*2, t + 0.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16*v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      os.connect(lp).connect(g).connect(dest); os.start(t); os.stop(t + dur + 0.3);
    }else if(ev.part === "click"){
      Snd.click(t, !!ev.strong);
    }
  }

  // ---- Çalıcı ----
  // evs: vuruş (dörtlük) cinsinden { t, part, … } olaylar, t'ye göre sıralı. map: TempoMap (ms = ses saati × 1000).
  // 25 ms'de bir 150 ms ilerisi kurulur; konum geri kayarsa çalınmış olaylar yinelenmez, ileri sıçrarsa 120 ms'den eski
  // olaylar atlanır. hold(true): bekle (grup susar, yeni olay kurulmaz); seek(b): b vuruşundan devam.
  function player(evs, map, o = {}){
    const a = Snd.ctx(), out = a.createGain(), gain = o.gain != null ? o.gain : 0.8;
    out.gain.value = gain; out.connect(a.destination);
    let k = 0, held = !!o.held, sched = -Infinity, timer = null, ended = false;
    const end = o.end != null ? o.end : evs.length ? Math.max(...evs.map(e => e.t + (e.dur || 0))) : 0;
    const nowMs = () => a.currentTime*1000;
    function tick(){
      if(held || ended) return;
      const now = nowMs(), horizon = map.beatAt(now + 150);
      while(k < evs.length && evs[k].t <= horizon){
        const ev = evs[k++];
        if(ev.t <= sched) continue;
        const at = map.timeAt(ev.t);
        if(at < now - 120) continue;
        play(a, out, ev, Math.max(a.currentTime, at/1000), map.beatMs/1000, o);
      }
      sched = Math.max(sched, horizon);
      if(k >= evs.length && map.beatAt(now) > end + 0.2){ ended = true; if(o.onEnd) o.onEnd(); }
    }
    timer = setInterval(tick, 25); tick();
    return {
      end,
      hold(v){
        held = v;
        const t = a.currentTime; out.gain.cancelScheduledValues(t);
        out.gain.setTargetAtTime(v ? 0.0001 : gain, t, v ? 0.06 : 0.01);
        if(!v) tick();
      },
      seek(b){ k = 0; while(k < evs.length && evs[k].t < b - 1e-6) k++; sched = b - 1e-6; ended = false; },
      get held(){ return held; },
      setGain(g){ out.gain.setTargetAtTime(g, a.currentTime, 0.02); },
      stop(){ clearInterval(timer); ended = true; const t = a.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.03); setTimeout(() => out.disconnect(), 400); }
    };
  }

  // Şarkılar sekmesi için: bir ölçünün olaylarını t0 (ses saati, saniye) anından kurar; ölçü süresi barSec
  let songOut = null;
  function songBar(g, bar, chordSym, t0, barSec, o = {}){
    const a = Snd.ctx();
    if(!songOut){ songOut = a.createGain(); songOut.gain.value = 0.7; songOut.connect(a.destination); }
    songOut.gain.cancelScheduledValues(a.currentTime); songOut.gain.setValueAtTime(o.gain != null ? o.gain : 0.7, a.currentTime);
    const beatSec = barSec/g.beats;
    for(const ev of grooveBar(g, bar, () => chordSym, o.parts)) play(a, songOut, ev, t0 + ev.b*beatSec, beatSec, o);
  }
  function songStop(){ if(songOut){ const a = Snd.ctx(); songOut.gain.cancelScheduledValues(a.currentTime); songOut.gain.setTargetAtTime(0, a.currentTime, 0.03); songOut.disconnect(); songOut = null; } }

  // Kulaklık ayarı: Parçalar ve Şarkılar ortak kullanır
  let headphones = store.get("headphones", false);
  return {
    play, player, songBar, songStop,
    get headphones(){ return headphones; },
    setHeadphones(v){ headphones = !!v; store.set("headphones", headphones); Bus.emit("headphones", headphones); }
  };
})();
