/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Набор приёмов — композиционные ходы вынесены в ручки и включаются независимо.
   Приём снят со стенда «7 сеток» (Миша, 2026-08): раздел «Приёмы» — Акцент, Выбор,
   Пропуск, Объединение. Ход, живущий в коде, нельзя ни выключить, ни сравнить;
   вынесенный в набор — становится предметом разговора.
   Объявление:  ['priemy', 'Приёмы', 'nabor', [['akcent','Акцент'], ['propusk','Пропуск']]]
   Значение:    массив включённых ключей                                          */
(function () {
  var STIL = '.st-nabor{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;width:100%}' +
    '.st-nabor button{all:unset;padding:3px 8px;font:11px/1 var(--st-font);' +
    'color:var(--st-text-2);cursor:pointer;border-radius:5px;background:var(--st-card);' +
    'border:0.5px solid var(--st-hairline);transition:background .12s,color .12s}' +
    '.st-nabor button:hover{color:var(--st-text)}' +
    '.st-nabor button[aria-pressed="true"]{background:var(--st-accent);color:#fff;border-color:transparent}' +
    '.row:has(>.st-nabor){flex-wrap:wrap}';

  StendPanel.tip('nabor', function (row, d, P, api) {
    if (!document.getElementById('st-nabor-css')) {
      var s = document.createElement('style'); s.id = 'st-nabor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    if (!Array.isArray(P[d[0]])) P[d[0]] = [];
    var box = document.createElement('div');
    box.className = 'st-nabor';
    var knopki = [];
    (d[3] || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.textContent = opt[1];
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
