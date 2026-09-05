/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Счёт — степпер «− n +» для малых целых: колонки, точки, модули в строке.
   Снят с дизайн-системы панелек Миши (02.09): у величины, где шагов мало,
   каждый щелчок должен быть виден, а нитка на дюжину делений — не орган.
   Принцип 9: форма органа выводится из природы выбора.
   Объявление:  ['tochki', 'Точки', 'schyot', 2, 12, 1]
   Значение:    число; стрелки ±шаг, Shift — вдесятеро, выражения принимаются. */
(function () {
  /* Г9: степпер — общий блок ядра (.st-stepper). Свой был высотой 24 против
     22 по Г8 и рисовался заново — то же самое, но чуть иначе (правка 03.09).
     Здесь остаётся только то, что про место органа в строке. */
  var STIL = '.st-schyot{margin-left:auto}';

  StendPanel.tip('schyot', function (row, d, P, api) {
    if (!document.getElementById('st-schyot-css')) {
      var s = document.createElement('style'); s.id = 'st-schyot-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var lo = d[3] !== undefined ? d[3] : 0, hi = d[4] !== undefined ? d[4] : 12, shag = d[5] || 1;
    var box = document.createElement('div'); box.className = 'st-stepper st-schyot';
    function knopka(znak, podpis) {
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = znak; b.title = podpis; b.setAttribute('aria-label', podpis + ': ' + d[1]);
      return b;
    }
    var minus = knopka('−', 'меньше'), plus = knopka('+', 'больше');
    var inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.setAttribute('aria-label', d[1]);
    inp.title = 'клик — точный ввод; выражения: 12/2, +1';
    function pokaz() {
      inp.value = String(P[d[0]]);
      minus.disabled = P[d[0]] <= lo; plus.disabled = P[d[0]] >= hi;
      inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
    }
    function postavit(v) {
      if (isNaN(v)) { inp.classList.add('oshibka'); inp.setAttribute('aria-invalid', 'true'); return; }
      v = Math.min(hi, Math.max(lo, v));
      v = parseFloat((Math.round(v / shag) * shag).toFixed(4));   // на решётку шага
      P[d[0]] = v; pokaz(); api.save();
    }
    minus.addEventListener('click', function (ev) { postavit(Number(P[d[0]]) - shag * (ev.shiftKey ? 10 : 1)); });
    plus.addEventListener('click', function (ev) { postavit(Number(P[d[0]]) + shag * (ev.shiftKey ? 10 : 1)); });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { postavit(StendPanel.vyrazhenie(inp.value, Number(P[d[0]]))); if (!inp.classList.contains('oshibka')) inp.blur(); return; }
      if (ev.key === 'Escape') { pokaz(); inp.blur(); return; }
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      ev.preventDefault();
      postavit(Number(P[d[0]]) + (ev.key === 'ArrowUp' ? 1 : -1) * shag * (ev.shiftKey ? 10 : 1));
    });
    inp.addEventListener('input', function () { inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid'); });
    inp.addEventListener('blur', function () {
      var v = StendPanel.vyrazhenie(inp.value, Number(P[d[0]]));
      if (isNaN(v)) pokaz(); else postavit(v);   // уход из поля отменяет кривой ввод
    });
    api.controls[d[0]] = pokaz;
    pokaz();
    box.appendChild(minus); box.appendChild(inp); box.appendChild(plus);
    row.appendChild(box);
  });
})();
