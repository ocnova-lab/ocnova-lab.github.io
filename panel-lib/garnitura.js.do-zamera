/* Гарнитура — шрифт выбирается по своему набору, а не по названию.
   Селект показывает имена системным гротеском: чтобы увидеть гарнитуру,
   надо её выбрать, посмотреть, вернуться. Каждая проверка стоит двух правок,
   и ход «замени шрифт» приходил по журналу пять раз на трёх стендах.
   Здесь каждая строка набрана собой, выбор — нажатием.

   Список складывается из двух частей:
     алфавит свода (лежит в /fonts, работает у всех) —
     плюс личный набор, отобранный в витрине /shrifty (localStorage,
     работает на этой машине; на чужой откатывается к запасному).

   Объявление:  ['shrift', 'Гарнитура', 'garnitura']
                ['shrift', 'Гарнитура', 'garnitura', [['Times New Roman','Times']]]
                (свой список вместо алфавита — если стенду нужен именно он)
   Значение:    имя семейства, готовое к подстановке в font-family              */
(function () {
  var ALFAVIT = [
    ['Editorial New', 'антиква набора'],
    ['Dentegra Display', 'антиква титулов'],
    ['Even Mono', 'моно'],
    ['JetBrains Mono', 'моно'],
    ['Pragmatica Next VF', 'переменный гротеск'],
    ['Times New Roman', 'системная антиква']
  ];

  var STIL = '.st-garn{width:100%;display:grid;gap:2px;margin-top:5px;' +
    'max-height:230px;overflow:auto}' +
    '.st-garn-r{display:flex;align-items:baseline;gap:8px;cursor:pointer;' +
    'padding:4px 6px;border-radius:6px;border:0.5px solid transparent;' +
    'transition:background .12s}' +
    '.st-garn-r:hover{background:var(--st-card)}' +
    '.st-garn-r[aria-checked="true"]{border-color:var(--st-accent);background:var(--st-card)}' +
    '.st-garn-r i{font-style:normal;font-size:15px;line-height:1.15;color:var(--st-text);' +
    'flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.st-garn-r s{text-decoration:none;font:9px/1 var(--st-font);color:var(--st-text-2);' +
    'flex:0 0 auto}' +
    '.st-garn-net{font:10px/1.4 var(--st-font);color:var(--st-text-2);padding:4px 6px}' +
    '.row:has(>.st-garn){flex-wrap:wrap}';

  // набор из витрины шрифтов: тот же origin, поэтому виден любому стенду
  function svoi() {
    try {
      var n = JSON.parse(localStorage.getItem('shrifty-nabor') || '{}');
      return Object.keys(n).sort().map(function (im) { return [im, 'мой набор']; });
    } catch (e) { return []; }
  }

  StendPanel.tip('garnitura', function (row, d, P, api) {
    if (!document.getElementById('st-garn-css')) {
      var s = document.createElement('style'); s.id = 'st-garn-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var box = document.createElement('div'); box.className = 'st-garn';
    var stroki = [];

    function sobrat() {
      box.textContent = ''; stroki = [];
      var spisok = (d[3] && d[3].length ? d[3] : ALFAVIT.concat(svoi()));
      spisok.forEach(function (g) {
        var imya = g[0], rol = g[1] || '';
        var r = document.createElement('div');
        r.className = 'st-garn-r';
        r.setAttribute('aria-checked', String(P[d[0]] === imya));
        var pr = document.createElement('i');
        pr.textContent = imya;
        pr.style.fontFamily = '"' + imya.replace(/"/g, '') + '", serif';
        var m = document.createElement('s'); m.textContent = rol;
        r.appendChild(pr); r.appendChild(m);
        r.addEventListener('click', function () {
          P[d[0]] = imya;
          stroki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === imya)); });
          api.save();          // save уже уведомляет стенд, второй раз не нужно
        });
        stroki.push([r, imya]); box.appendChild(r);
      });
      if (!svoi().length && !(d[3] && d[3].length)) {
        var p = document.createElement('div');
        p.className = 'st-garn-net';
        p.textContent = 'свой набор пуст — отобрать в витрине /shrifty';
        box.appendChild(p);
      }
    }

    api.controls[d[0]] = function () {
      stroki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === P[d[0]])); });
    };
    sobrat();
    // набор мог пополниться в соседней вкладке, пока стенд открыт
    addEventListener('storage', function (e) { if (e.key === 'shrifty-nabor') sobrat(); });
    row.appendChild(box);
  });
})();
