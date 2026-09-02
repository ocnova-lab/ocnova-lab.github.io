/* © Сергей Гуров, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Сегментер — закрытый список, где все варианты видны сразу, без раскрытия.
   Приём снят со стенда «7 сеток» (Миша, 2026-08): role="radiogroup" вместо селекта.
   Брать, когда вариантов 2–5 и выбор — это закон, а не настройка.
   Объявление:  ['tip', 'Тип сетки', 'segment', [['kolonnaya','Колонная'], ['lesenka','Лесенка']]]  */
(function () {
  var STIL = '.st-seg{display:flex;gap:2px;margin-left:auto;background:var(--st-hairline);' +
    'padding:2px;border-radius:7px}' +
    '.st-seg button{all:unset;padding:3px 8px;font:11px/1 var(--st-font);color:var(--st-text-2);' +
    'cursor:pointer;border-radius:5px;transition:background .12s,color .12s;white-space:nowrap}' +
    '.st-seg button:hover{color:var(--st-text)}' +
    '.st-seg button[aria-checked="true"]{background:var(--st-accent);color:#fff}';

  StendPanel.tip('segment', function (row, d, P, api) {
    if (!document.getElementById('st-seg-css')) {
      var s = document.createElement('style'); s.id = 'st-seg-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var box = document.createElement('div');
    box.className = 'st-seg'; box.setAttribute('role', 'radiogroup');
    var knopki = [];
    (d[3] || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.textContent = opt[1];
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(P[d[0]] === opt[0]));
      b.addEventListener('click', function () {
        P[d[0]] = opt[0];
        knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === opt[0])); });
        api.save();
        if (d[4] && d[4].onChange) d[4].onChange(opt[0]);
      });
      knopki.push([b, opt[0]]); box.appendChild(b);
    });
    api.controls[d[0]] = function () {
      knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === P[d[0]])); });
    };
    row.appendChild(box);
  });
})();
