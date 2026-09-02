/* © Сергей Гуров, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Пружина — период и затухание одним органом, с живым предпросмотром отклика.
   Снята с leva plugin-spring (pmndrs): формула затухающих колебаний с тремя
   случаями — с отскоком, критическая, вязкая. Параметризация оставлена своя:
   там tension/friction/mass (физика движка), здесь период в мс и затухание —
   то, чем стенды уже говорят («Период, мс», «Затухание отскока» в novosti).

   Панель и стенд считают ОДНУ физику: вычислитель отдан наружу как
   StendPanel.pruzhina([период, затухание]) → функция t(мс) → 0…1 и дальше.
   Иначе кривая в панели показывает одно, а на экране движется другое.

   Объявление:  ['spring', 'Пружина', 'pruzhina']
                ['spring', 'Пружина', 'pruzhina', { period: [80, 900], shag: 10 }]
   Значение:    [период мс, затухание]                                          */
(function () {
  var STIL = '.st-pruzhina{width:100%;margin-top:5px}' +
    '.st-pr-cv{width:100%;display:block;border-radius:6px;background:var(--st-card);' +
    'border:0.5px solid var(--st-hairline)}' +
    '.st-pr-row{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:11px;' +
    'color:var(--st-text-2)}' +
    '.st-pr-row input{flex:1;accent-color:var(--st-accent);height:14px}' +
    '.st-pr-row span{min-width:5ch;text-align:right;font-variant-numeric:tabular-nums}' +
    '.row:has(>.st-pruzhina){flex-wrap:wrap}';

  // Отклик пружины: 0 в момент 0, 1 в покое. t — миллисекунды.
  function otklik(period, zeta) {
    var w0 = 2 * Math.PI / Math.max(1, period);          // рад/мс
    var x0 = -1;
    if (zeta < 1) {                                      // с отскоком
      var w1 = w0 * Math.sqrt(1 - zeta * zeta);
      return function (t) {
        return 1 + Math.exp(-zeta * w0 * t) *
          ((zeta * w0 * x0) / w1 * Math.sin(w1 * t) + x0 * Math.cos(w1 * t));
      };
    }
    if (zeta === 1) {                                    // критическая: без отскока, быстро
      return function (t) { return 1 + Math.exp(-w0 * t) * (x0 + w0 * x0 * t); };
    }
    var w2 = w0 * Math.sqrt(zeta * zeta - 1);            // вязкая: ползёт
    return function (t) {
      return 1 + Math.exp(-zeta * w0 * t) *
        ((zeta * w0 * x0) * Math.sinh(w2 * t) + w2 * x0 * Math.cosh(w2 * t)) / w2;
    };
  }
  StendPanel.pruzhina = function (z) { return otklik(z[0], z[1]); };

  StendPanel.tip('pruzhina', function (row, d, P, api) {
    if (!document.getElementById('st-pruzhina-css')) {
      var s = document.createElement('style'); s.id = 'st-pruzhina-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var o = d[3] || {};
    var PER = o.period || [60, 1200], ZAT = o.zatuhanie || [0.05, 1.6];
    var VYS = o.vysota || 54;
    if (!Array.isArray(P[d[0]])) P[d[0]] = [320, 0.35];

    var box = document.createElement('div'); box.className = 'st-pruzhina';
    var cv = document.createElement('canvas'); cv.className = 'st-pr-cv';
    box.appendChild(cv);
    var polzunki = [];
    [['период, мс', 0, PER[0], PER[1], o.shag || 10],
     ['затухание', 1, ZAT[0], ZAT[1], 0.01]].forEach(function (p) {
      var r = document.createElement('div'); r.className = 'st-pr-row';
      var lab = document.createElement('label'); lab.textContent = p[0];
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = p[2]; inp.max = p[3]; inp.step = p[4];
      inp.value = P[d[0]][p[1]];
      var val = document.createElement('span'); val.textContent = P[d[0]][p[1]];
      inp.addEventListener('input', function () {
        var z = P[d[0]].slice();
        z[p[1]] = parseFloat(inp.value);
        P[d[0]] = z;
        val.textContent = parseFloat(z[p[1]].toFixed(3));
        pusk(); api.save();
      });
      polzunki.push(function () { inp.value = P[d[0]][p[1]]; val.textContent = parseFloat(P[d[0]][p[1]].toFixed(3)); });
      r.appendChild(lab); r.appendChild(inp); r.appendChild(val); box.appendChild(r);
    });
    row.appendChild(box);

    var ctx = cv.getContext('2d'), t0 = 0, kadr = null;
    function risovat(fazaMs) {
      var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 280;
      cv.width = w * dpr; cv.height = VYS * dpr; cv.style.height = VYS + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var f = otklik(P[d[0]][0], P[d[0]][1]);
      var okno = P[d[0]][0] * 3.2;                       // три периода — видно и отскок, и покой
      /* Окно по вертикали подгоняется под саму кривую: слабое затухание
         забрасывает пружину выше, и зашитая рамка её резала (правка
         2026-09-01 — «чтобы кривая всегда помещалась в превью»). Меряем
         размах отклика и дышим рамкой, а не карточкой: высота карточки
         постоянна, иначе панель дёргалась бы при каждом движении ползунка. */
      var razmah_lo = 0, razmah_hi = 1;
      for (var pr = 0; pr < 110; pr++) {
        var vv = f(okno * pr / 109);
        if (vv < razmah_lo) razmah_lo = vv;
        if (vv > razmah_hi) razmah_hi = vv;
      }
      var zapas = (razmah_hi - razmah_lo) * 0.1;
      var lo = razmah_lo - zapas, hi = razmah_hi + zapas;
      function ekran(v) { return VYS - (v - lo) / (hi - lo) * VYS; }
      ctx.clearRect(0, 0, w, VYS);
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ekran(1)); ctx.lineTo(w, ekran(1)); ctx.stroke();
      ctx.strokeStyle = api.accent(); ctx.lineWidth = 1.5; ctx.beginPath();
      for (var i = 0; i < 110; i++) {
        var x = i / 109 * w, y = ekran(f(okno * i / 109));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (fazaMs != null) {                              // бегущая точка: движение видно, а не гадается
        var tt = fazaMs % (okno * 1.35);
        if (tt <= okno) {
          ctx.fillStyle = api.accent();
          ctx.beginPath(); ctx.arc(tt / okno * w, ekran(f(tt)), 3, 0, 6.284); ctx.fill();
        }
      }
    }
    function pusk() {
      cancelAnimationFrame(kadr); t0 = 0;
      (function shag(t) {
        if (!t0) t0 = t;
        risovat(t - t0);
        kadr = requestAnimationFrame(shag);
      })(0);
    }
    api.repaints.push(function () { risovat(null); });
    api.controls[d[0]] = function () { polzunki.forEach(function (f) { f(); }); pusk(); };
    window.addEventListener('resize', function () { risovat(null); });
    setTimeout(pusk, 0);
  });
})();
