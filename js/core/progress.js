// İlerleme: günlük çalışma süresi, seri, son günler ve başarı kayıtlarından rekorlar. Saf mantık (tarayıcı + Node testleri).
// Gün anahtarı yerel tarih "YYYY-AA-GG". Çalışma süresi saniye; bir gün "çalışılmış" sayılması için en az PRACTICE_MIN saniye.
const PRACTICE_MIN = 60;
function dayKey(d){ const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
function addDays(key, n){ const [y, m, d] = key.split("-").map(Number), x = new Date(y, m - 1, d + n); return dayKey(x); }
// Bugünden geriye kesintisiz çalışılan gün sayısı; bugün henüz çalışılmadıysa dünden sayılır (seri bozulmaz)
function streak(days, today){
  let k = (days[today] || 0) >= PRACTICE_MIN ? today : addDays(today, -1), n = 0;
  while((days[k] || 0) >= PRACTICE_MIN){ n++; k = addDays(k, -1); }
  return n;
}
function bestStreak(days){
  const ks = Object.keys(days).filter(k => days[k] >= PRACTICE_MIN).sort();
  let best = 0, run = 0, prev = null;
  for(const k of ks){ run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}
// Son n gün (eskiden yeniye): [{ key, sec }]
function lastDays(days, today, n = 14){ return Array.from({ length:n }, (_, i) => { const key = addDays(today, i - n + 1); return { key, sec: days[key] || 0 }; }); }
function weekTotal(days, today, back = 0){ return lastDays(days, addDays(today, -7*back), 7).reduce((s, d) => s + d.sec, 0); }
// Başarı kaydından rekorlar: (tür, kimlik) başına en iyi yüzde ve deneme sayısı. log: [{ t, type, id, pct, … }]
function records(log){
  const m = new Map();
  for(const e of log){
    const key = e.type + ":" + (e.id || e.chord || (e.pair && e.pair.join("-")) || e.mode || "");
    const r = m.get(key) || { type: e.type, id: e.id || e.chord || (e.pair && e.pair.join("–")) || e.mode || "", title: e.title, best: null, n: 0, last: 0 };
    r.n++; r.last = Math.max(r.last, e.t || 0);
    const v = e.pct != null ? e.pct : e.perMin != null ? e.perMin : e.correct != null ? Math.round(e.correct/e.total*100) : null;
    if(v != null && (r.best == null || v > r.best)) r.best = v;
    if(e.title) r.title = e.title;
    m.set(key, r);
  }
  return [...m.values()].sort((a, b) => b.last - a.last);
}
