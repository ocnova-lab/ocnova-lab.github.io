/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Набор приёмов — композиционные ходы вынесены в ручки и включаются независимо.
   Приём снят со стенда «7 сеток» (Миша, 2026-08): раздел «Приёмы» — Акцент, Выбор,
   Пропуск, Объединение. Ход, живущий в коде, нельзя ни выключить, ни сравнить;
   вынесенный в набор — становится предметом разговора.
   Объявление:  ['priemy', 'Приёмы', 'nabor', [['akcent','Акцент'], ['propusk','Пропуск']]]
   Значение:    массив включённых ключей                                          */
(function () {
  /* ХОДЫ — ТЕГИ, А НЕ СЕГМЕНТЕР (эталон Сергея 03.09): капсулы стоят
     свободным рядом и переносятся, потому что ходов бывает сколько угодно
     и они не делят одну полосу. Числа с эталона: высота 21, зазор 3,
     поле по горизонтали 8, кегль 11. */
  /* Г9: чип — общий блок ядра (.st-chip), ряд чипов — .st-chipy. Свой был
     тем же по числам, но своим по рисунку: в траектории те же капсулы
     рисовались тенью вместо рамки (правка 03.09). */
  var STIL = '.st-nabor{margin-top:5px}' +
    '.row:has(>.st-nabor){flex-wrap:wrap}';

  StendPanel.tip('nabor', function (row, d, P, api) {
    if (!document.getElementById('st-nabor-css')) {
      var s = document.createElement('style'); s.id = 'st-nabor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    if (!Array.isArray(P[d[0]])) P[d[0]] = [];
    var box = document.createElement('div');
    box.className = 'st-chipy st-nabor';
    var knopki = [];
    (d[3] || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'st-chip';
      var sp = document.createElement('span'); sp.textContent = opt[1]; b.appendChild(sp);
      b.setAttribute('aria-pressed', String(P[d[0]].indexOf(opt[0]) >= 0));
      b.addEventListener('click', function () {
        var i = P[d[0]].indexOf(opt[0]);
        if (i >= 0) P[d[0]].splice(i, 1); else P[d[0]].push(opt[0]);
        b.setAttribute('aria-pressed', String(i < 0));
        api.save();
        if (d[4] && d[4].onChange) d[4].onChange(P[d[0]].slice());
      });
      knopki.push([b, opt[0]]); box.appendChild(b);
    });
    api.controls[d[0]] = function () {
      knopki.forEach(function (x) {
        x[0].setAttribute('aria-pressed', String(P[d[0]].indexOf(x[1]) >= 0));
      });
    };
    row.appendChild(box);
  });
})();
