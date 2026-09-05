/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Фазы — переход одной строкой: фаза · пауза · фаза, доли времени видны полосой.
   Снят с дизайн-системы панелек Миши (timeline «фаза 1 · 700 / 150 / фаза 2 · 700»,
   02.09). Временная рельса библиотеки была бедна: длительности жили порознь,
   и соотношение фаз не было видно. Полоса показывает время как время;
   делитель между соседями переливает длительность из одной в другую (сумма
   не меняется), поля правят числа. Кривые фаз объявляются своими строками
   'ease' (П4: время без кривой — недоделанная ручка).
   Объявление:  ['', 'Переход, мс', 'fazy', [
                  ['f1', 'фаза 1', 0, 2000, 10],
                  ['pz', 'пауза',  0, 1000, 10, { pauza: true }],
                  ['f2', 'фаза 2', 0, 2000, 10]]]
   Значение:    каждая фаза — свой ключ, число.                                  */
(function () {
  var STIL = '.st-fazy{width:100%}' +
    '.st-fazy-polosa{position:relative;display:flex;height:20px;gap:2px;margin-bottom:6px;touch-action:none}' +
    '.st-fazy-seg{position:relative;height:6px;margin-top:7px;border-radius:3px;background:var(--st-accent);min-width:2px}' +
    '.st-fazy-seg.pauza{background:var(--st-track)}' +
    '.st-fazy-del{position:absolute;top:0;width:14px;height:20px;margin-left:-7px;cursor:ew-resize;display:flex;justify-content:center}' +
    '.st-fazy-del::after{content:"";width:2px;height:14px;margin-top:3px;border-radius:1px;background:#fff;opacity:.85;box-shadow:0 0 0 .5px rgba(0,0,0,.3)}' +
    '.st-fazy-polya{display:flex;gap:2px;align-items:flex-end}' +
    /* Поля фаз — общий блок ядра (.st-pole-blok, подпись сверху). Своё
       отстало от системы сильнее прочих: кегль 12 против 11 и поля 5/8
       против высоты 24 — тот самый разнобой, который Г9 и ловит
       (улов линтера 04.09). */
    '.st-fazy-summa{flex:none;font:11px/1 var(--st-font);color:var(--st-text-2);padding:0 0 9px 8px;' +
    'font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.row:has(>.st-fazy){flex-wrap:wrap}';

  StendPanel.tip('fazy', function (row, d, P, api) {
    if (!document.getElementById('st-fazy-css')) {
      var s = document.createElement('style'); s.id = 'st-fazy-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var fazy = (d[3] || []).map(function (r) {
      return { key: r[0], imya: r[1], lo: r[2] || 0, hi: r[3] || 2000, shag: r[4] || 1, pauza: !!(r[5] && r[5].pauza) };
    });
    var ed = (d[4] && d[4].ed) || ((d[1] || '').split(', ')[1]) || 'мс';
    row.classList.add('dva');
    var box = document.createElement('div'); box.className = 'st-fazy';
    var polosa = document.createElement('div'); polosa.className = 'st-fazy-polosa';
    var polya = document.createElement('div'); polya.className = 'st-fazy-polya';
    var summa = document.createElement('span'); summa.className = 'st-fazy-summa';
    var segi = [], deli = [], vvody = [];
    function znach(f) { return Math.max(0, Number(P[f.key]) || 0); }
    function vsego() { return fazy.reduce(function (a, f) { return a + znach(f); }, 0); }
    function narisovat() {
      var t = vsego() || 1, nakop = 0;
      fazy.forEach(function (f, i) {
        segi[i].style.flex = znach(f) + ' 1 0';
        if (i < fazy.length - 1) { nakop += znach(f); deli[i].style.left = (nakop / t * 100) + '%'; }
      });
      vvody.forEach(function (v) { v.pokaz(); });
      summa.textContent = 'Σ ' + parseFloat(vsego().toFixed(2)) + ' ' + ed;
    }
    function klamp(f, v) { return parseFloat(Math.min(f.hi, Math.max(f.lo, v)).toFixed(4)); }
    fazy.forEach(function (f, i) {
      var seg = document.createElement('div'); seg.className = 'st-fazy-seg' + (f.pauza ? ' pauza' : '');
      seg.title = f.imya; segi.push(seg); polosa.appendChild(seg);
      // поле числа под полосой
      var blok = StendPanel.poleBlok(f.imya, { sverhu: true, dlyaPolya: true,
                                               imya: (d[1] || '') + ' · ' + f.imya });
      var o = blok.box; o.classList.add('st-fazy-o');
      var lab = blok.nad, inp = blok.inp;
      var tochka;   // точка увода внутри поля, справа
      function pokaz() {
        inp.value = parseFloat(Number(P[f.key]).toFixed(3));
        inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
        if (tochka) tochka.obnovit();
      }
      function prinyat(syroj) {
        var v = StendPanel.vyrazhenie(syroj, Number(P[f.key]));
        if (isNaN(v)) { inp.classList.add('oshibka'); inp.setAttribute('aria-invalid', 'true'); return; }
        P[f.key] = klamp(f, v); narisovat(); api.save();
      }
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { prinyat(inp.value); if (!inp.classList.contains('oshibka')) inp.blur(); return; }
        if (ev.key === 'Escape') { pokaz(); inp.blur(); return; }
        if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        ev.preventDefault();
        var krupno = f.shag * (ev.shiftKey ? 10 : 1);
        prinyat(String(Number(P[f.key]) + (ev.key === 'ArrowUp' ? krupno : -krupno)));
      });
      inp.addEventListener('input', function () { inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid'); });
      inp.addEventListener('blur', function () { if (isNaN(StendPanel.vyrazhenie(inp.value, 0))) pokaz(); else prinyat(inp.value); });
      tochka = StendPanel.tochkaUvoda(inp,
        function () { return api.defaults && api.defaults[f.key] !== undefined && String(P[f.key]) !== String(api.defaults[f.key]); },
        function () { P[f.key] = api.defaults[f.key]; narisovat(); api.save(); });
      vvody.push({ pokaz: pokaz });
      api.controls[f.key] = narisovat;
      o.appendChild(lab); o.appendChild(tochka.obl); polya.appendChild(o);
    });
    // делители: тянешь — время переливается между соседями, сумма стоит
    fazy.slice(0, -1).forEach(function (f, i) {
      var del = document.createElement('div'); del.className = 'st-fazy-del';
      del.title = f.imya + ' ⇄ ' + fazy[i + 1].imya;
      del.setAttribute('role', 'separator'); del.tabIndex = 0;
      var x0 = 0, a0 = 0, b0 = 0;
      del.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); del.setPointerCapture(ev.pointerId);
        x0 = ev.clientX; a0 = znach(f); b0 = znach(fazy[i + 1]);
      });
      del.addEventListener('pointermove', function (ev) {
        if (!del.hasPointerCapture(ev.pointerId)) return;
        var w = polosa.getBoundingClientRect().width || 1;
        var delta = (ev.clientX - x0) / w * vsego();
        var a = klamp(f, a0 + delta), b = klamp(fazy[i + 1], b0 - (a - a0));
        // сосед упёрся в границу — отдаём столько, сколько он берёт
        a = klamp(f, a0 + (b0 - b));
        P[f.key] = a; P[fazy[i + 1].key] = b; narisovat();
      });
      del.addEventListener('pointerup', function () { api.save(); });
      del.addEventListener('keydown', function (ev) {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
        ev.preventDefault();
        var sh = f.shag * (ev.shiftKey ? 10 : 1) * (ev.key === 'ArrowRight' ? 1 : -1);
        var a = klamp(f, znach(f) + sh), b = klamp(fazy[i + 1], znach(fazy[i + 1]) - (a - znach(f)));
        P[f.key] = klamp(f, znach(f) + (znach(fazy[i + 1]) - b)); P[fazy[i + 1].key] = b;
        narisovat(); api.save();
      });
      deli.push(del); polosa.appendChild(del);
    });
    polya.appendChild(summa);
    box.appendChild(polosa); box.appendChild(polya);
    narisovat();
    row.appendChild(box);
  });
})();
