/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Якорь 3×3 — одна точка привязки вместо двух селектов «по горизонтали / по вертикали».
   Приём снят со стенда «7 сеток» (Миша, 2026-08).
   Объявление:  ['yakor', 'Якорь', 'anchor']
   Значение:    'tl' 't' 'tr' 'l' 'c' 'r' 'bl' 'b' 'br'                        */
(function () {
  var TOCHKI = [['tl', 'Верх слева'], ['t', 'Верх'], ['tr', 'Верх справа'],
                ['l', 'Слева'], ['c', 'Центр'], ['r', 'Справа'],
                ['bl', 'Низ слева'], ['b', 'Низ'], ['br', 'Низ справа']];
  var STIL = '.st-anchor{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;width:66px;' +
    'margin-left:auto;background:var(--st-hairline);padding:2px;border-radius:6px}' +
    '.st-anchor button{all:unset;height:18px;cursor:pointer;border-radius:3px;' +
    'background:var(--st-card);transition:background .12s}' +
    '.st-anchor button:hover{background:var(--st-border)}' +
    '.st-anchor button[aria-checked="true"]{background:var(--st-accent)}';

  StendPanel.tip('anchor', function (row, d, P, api) {
    if (!document.getElementById('st-anchor-css')) {
      var s = document.createElement('style'); s.id = 'st-anchor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var box = document.createElement('div');
    box.className = 'st-anchor'; box.setAttribute('role', 'radiogroup');
    var knopki = {};
    TOCHKI.forEach(function (t) {
      var b = document.createElement('button');
      b.title = t[1];
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', P[d[0]] === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        P[d[0]] = t[0];
        Object.keys(knopki).forEach(function (k) {
          knopki[k].setAttribute('aria-checked', k === t[0] ? 'true' : 'false');
        });
        api.save();
        if (d[3] && d[3].onChange) d[3].onChange(t[0]);
      });
      knopki[t[0]] = b; box.appendChild(b);
    });
    api.controls[d[0]] = function () {
      Object.keys(knopki).forEach(function (k) {
        knopki[k].setAttribute('aria-checked', k === P[d[0]] ? 'true' : 'false');
      });
    };
    row.appendChild(box);
  });
})();
