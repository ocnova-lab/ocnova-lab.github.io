/* © Сергей Гуров, 2026 · панель стендов — библиотека органов управления · stendy.vercel.app */
/* Коридор — две границы одной дорожкой: «не уже, чем …, и не шире, чем …».
   Снят с Tweakpane Essentials (interval, cocopon, 2021) и переименован по закону 3б
   девятки: коридор задаёт границы, внутри которых значение течёт само.
   Две отдельные ручки «мин» и «макс» заставляют держать пару в голове и позволяют
   поставить мин выше макса; здесь пара живёт одним органом и не выворачивается.

   Объявление:  ['pole', 'Поле, px', 'koridor', 0, 300, 4]
   Значение:    [низ, верх] — массив из двух чисел                              */
(function () {
  var STIL = '.st-koridor{flex:1;display:flex;align-items:center;gap:8px;margin-left:10px}' +
    '.st-kor-track{position:relative;flex:1;height:14px;cursor:pointer;touch-action:none}' +
    '.st-kor-track::before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;' +
    'border-radius:1px;background:var(--st-track)}' +
    '.st-kor-fill{position:absolute;top:6px;height:2px;border-radius:1px;background:var(--st-accent)}' +
    '.st-kor-h{position:absolute;top:1px;width:12px;height:12px;margin-left:-6px;border-radius:50%;' +
    'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.45);cursor:grab}' +
    '.st-kor-h:active{cursor:grabbing;transform:scale(1.15)}' +
    '.st-kor-val{min-width:7ch;text-align:right;color:var(--st-text-2);font-variant-numeric:tabular-nums}';

  StendPanel.tip('koridor', function (row, d, P, api) {
    if (!document.getElementById('st-koridor-css')) {
      var s = document.createElement('style'); s.id = 'st-koridor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var lo = d[3], hi = d[4], shag = d[5] || 1;
    if (!Array.isArray(P[d[0]])) P[d[0]] = [lo, hi];

    var box = document.createElement('div'); box.className = 'st-koridor';
    var track = document.createElement('div'); track.className = 'st-kor-track';
    var fill = document.createElement('div'); fill.className = 'st-kor-fill';
    var hA = document.createElement('div'); hA.className = 'st-kor-h';
    var hB = document.createElement('div'); hB.className = 'st-kor-h';
    var val = document.createElement('span'); val.className = 'st-kor-val';
    track.appendChild(fill); track.appendChild(hA); track.appendChild(hB);
    box.appendChild(track); box.appendChild(val); row.appendChild(box);

    function dolya(v) { return (v - lo) / (hi - lo || 1); }
    function narisovat() {
      var a = P[d[0]][0], b = P[d[0]][1];
      hA.style.left = dolya(a) * 100 + '%';
      hB.style.left = dolya(b) * 100 + '%';
      fill.style.left = dolya(a) * 100 + '%';
      fill.style.width = Math.max(0, (dolya(b) - dolya(a)) * 100) + '%';
      val.textContent = parseFloat(a.toFixed(4)) + '…' + parseFloat(b.toFixed(4));
    }
    function znachenie(e) {
      var r = track.getBoundingClientRect();
      var v = lo + (e.clientX - r.left) / (r.width || 1) * (hi - lo);
      v = Math.round(v / shag) * shag;
      return Math.min(hi, Math.max(lo, parseFloat(v.toFixed(6))));
    }
    var tyanem = null;
    track.addEventListener('pointerdown', function (e) {
      var v = znachenie(e);
      // берём ту границу, что ближе: край коридора не перепрыгивает соседний
      tyanem = Math.abs(v - P[d[0]][0]) <= Math.abs(v - P[d[0]][1]) ? 0 : 1;
      track.setPointerCapture(e.pointerId);
      dvigat(e);
    });
    function dvigat(e) {
      if (tyanem === null) return;
      var v = znachenie(e), z = P[d[0]].slice();
      z[tyanem] = v;
      if (z[0] > z[1]) z[tyanem === 0 ? 1 : 0] = v;   // границы не выворачиваются
      P[d[0]] = z;
      narisovat(); api.save();
    }
    track.addEventListener('pointermove', dvigat);
    track.addEventListener('pointerup', function () { tyanem = null; });
    api.controls[d[0]] = narisovat;
    narisovat();
  });
})();
