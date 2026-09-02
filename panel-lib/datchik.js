/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Датчик — график прямо в строке панели: закон видно, а не воображаешь.
   Снят с leva plugin-plot (pmndrs) и с FPS-графика Tweakpane Essentials, сведён
   в один орган. Отвечает правилу «объяви закон и дай датчик»: у эффекта, заданного
   формулой, ручки крутятся вслепую, пока форму закона не видно.

   Два режима:
     закон во времени/пространстве — ['profil', 'Профиль обводки', 'datchik',
        { fn: function (x) { return P.max * Math.pow(x, P.stepen); }, x: [0, 1] }]
     значение сейчас (монитор)      — ['tempo', 'Кадры, /с', 'datchik',
        { val: function () { return fps; }, y: [0, 60] }]
   Необязательно: x: [от, до], y: [от, до] (по умолчанию подбирается по данным),
   vysota: px (по умолчанию 46).                                                 */
(function () {
  var STIL = '.st-datchik{width:100%;margin-top:5px;border-radius:6px;display:block;' +
    'background:var(--st-card);border:0.5px solid var(--st-hairline)}' +
    '.row:has(>.st-datchik){flex-wrap:wrap}';

  StendPanel.tip('datchik', function (row, d, P, api) {
    if (!document.getElementById('st-datchik-css')) {
      var s = document.createElement('style'); s.id = 'st-datchik-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var o = d[3] || {};
    var VYS = o.vysota || 46, TOCHEK = 96;
    var cv = document.createElement('canvas');
    cv.className = 'st-datchik';
    row.appendChild(cv);
    var ctx = cv.getContext('2d');
    var lenta = [];                                  // окно значений для монитора

    function razmer() {
      var dpr = window.devicePixelRatio || 1;
      var w = cv.clientWidth || 280;
      cv.width = w * dpr; cv.height = VYS * dpr;
      cv.style.height = VYS + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: VYS };
    }
    function granicy(tochki) {
      if (o.y) return o.y;
      var lo = Math.min.apply(null, tochki), hi = Math.max.apply(null, tochki);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }       // ровная линия не схлопывается
      var zapas = (hi - lo) * 0.12;
      return [lo - zapas, hi + zapas];
    }
    function risovat() {
      var r = razmer(), tochki;
      if (o.fn) {
        var x0 = (o.x || [0, 1])[0], x1 = (o.x || [0, 1])[1];
        tochki = [];
        for (var i = 0; i < TOCHEK; i++) {
          var v = o.fn(x0 + (x1 - x0) * (i / (TOCHEK - 1)));
          tochki.push(typeof v === 'number' && isFinite(v) ? v : 0);
        }
      } else if (o.val) {
        lenta.push(Number(o.val()) || 0);
        if (lenta.length > TOCHEK) lenta.shift();
        tochki = lenta;
      } else return;

      var g = granicy(tochki), lo = g[0], hi = g[1];
      ctx.clearRect(0, 0, r.w, r.h);
      // нулевая линия — видно, где закон меняет знак
      if (lo < 0 && hi > 0) {
        var y0 = r.h - (0 - lo) / (hi - lo) * r.h;
        ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(r.w, y0); ctx.stroke();
      }
      ctx.strokeStyle = api.accent(); ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round'; ctx.beginPath();
      tochki.forEach(function (v, i) {
        var x = i / (tochki.length - 1 || 1) * r.w;
        var y = r.h - (v - lo) / (hi - lo || 1) * r.h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      // крайние значения подписью: датчик без чисел читается наполовину
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.font = '9px ' + (getComputedStyle(cv).getPropertyValue('--st-font') || 'sans-serif');
      ctx.fillText(parseFloat(hi.toFixed(2)), 4, 10);
      ctx.fillText(parseFloat(lo.toFixed(2)), 4, r.h - 4);
    }

    api.repaints.push(risovat);                       // смена темы перекрашивает кривую
    api.controls[d[0] || '__datchik'] = risovat;
    document.addEventListener('stend:izmenenie', function () { if (o.fn) risovat(); });
    window.addEventListener('resize', risovat);
    if (o.val) {
      var shag = o.shag || 120, poslednii = 0;
      (function kadr(t) {
        if (t - poslednii > shag) { poslednii = t; risovat(); }
        requestAnimationFrame(kadr);
      })(0);
    }
    setTimeout(risovat, 0);                           // после вставки в DOM ширина известна
  });
})();
