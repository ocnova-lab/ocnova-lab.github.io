/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Палитра — цвета показываются цветом, а не названием.
   Снята с tweakpane-plugin-chromatic (brunoimbrizi, 2023).
   Пресет-селект называет профиль словами: «Синий на светлом», «Ночь» — чтобы
   увидеть, надо выбрать. Здесь весь набор виден сразу полосами, выбор нажатием.

   Объявление:
     ['palette', 'Палитра', 'palitra', [
        ['night', 'Ночь',  { bg: '#101014', ink: '#f0f0f2', acc: '#4d8dff' }],
        ['white', 'Белая', { bg: '#ffffff', ink: '#111111', acc: '#1b2db3' }]]]
   Значение: ключ профиля; выбор раскладывает свои цвета в P.                    */
(function () {
  var STIL = '.st-palitra{width:100%;display:grid;gap:4px;margin-top:5px}' +
    '.st-pal-r{display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px;' +
    'border-radius:6px;border:0.5px solid transparent;transition:background .12s}' +
    '.st-pal-r:hover{background:var(--st-card)}' +
    '.st-pal-r[aria-checked="true"]{border-color:var(--st-accent);background:var(--st-card)}' +
    '.st-pal-p{display:flex;flex:0 0 76px;height:16px;border-radius:4px;overflow:hidden;' +
    'box-shadow:inset 0 0 0 .5px rgba(255,255,255,.14)}' +
    '.st-pal-p i{flex:1}' +
    '.st-pal-r b{font:11px/1 var(--st-font);font-weight:400;color:var(--st-text-2)}' +
    '.st-pal-r[aria-checked="true"] b{color:var(--st-text)}' +
    '.row:has(>.st-palitra){flex-wrap:wrap}';

  StendPanel.tip('palitra', function (row, d, P, api) {
    if (!document.getElementById('st-palitra-css')) {
      var s = document.createElement('style'); s.id = 'st-palitra-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var profili = d[3] || [];
    var box = document.createElement('div'); box.className = 'st-palitra';
    var stroki = [];
    profili.forEach(function (pr) {
      var r = document.createElement('div');
      r.className = 'st-pal-r';
      r.setAttribute('aria-checked', String(P[d[0]] === pr[0]));
      var polosa = document.createElement('div'); polosa.className = 'st-pal-p';
      Object.keys(pr[2] || {}).forEach(function (k) {
        var i = document.createElement('i');
        i.style.background = pr[2][k];
        polosa.appendChild(i);
      });
      var imya = document.createElement('b'); imya.textContent = pr[1];
      r.appendChild(polosa); r.appendChild(imya);
      r.addEventListener('click', function () {
        P[d[0]] = pr[0];
        Object.keys(pr[2] || {}).forEach(function (k) { P[k] = pr[2][k]; });
        // соседние ручки показывают новые цвета сразу: профиль правит их значения
        for (var ck in api.controls) if (ck !== d[0]) api.controls[ck]();
        stroki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === pr[0])); });
        api.save();
      });
      stroki.push([r, pr[0]]); box.appendChild(r);
    });
    api.controls[d[0]] = function () {
      stroki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === P[d[0]])); });
    };
    row.appendChild(box);
  });
})();
