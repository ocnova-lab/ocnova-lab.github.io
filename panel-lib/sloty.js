/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Слоты — пять снимков состояния панели: запомнить, вернуть, сравнить.
   Сняты с дизайн-системы панелек Миши («Пресеты 1–5», 02.09). Буфер и адрес
   с параметрами уносят состояние наружу; слот держит его под рукой, чтобы
   щёлкать между двумя вариантами и смотреть глазами. Не набор и не пресет:
   слот запоминает всё состояние, а не пачку заранее названных ручек.
   Объявление:  ['', 'Снимки', 'sloty']   или   ['', 'Снимки', 'sloty', { n: 5 }]
   Клик по пустому — запомнить; по занятому — вернуть; Shift+клик — перезаписать;
   Alt+клик — очистить. Точка на слоте — он совпадает с текущим состоянием.
   Хранение: localStorage «<storageKey>:sloty», на стенд.                       */
(function () {
  var STIL = '.st-sloty{display:flex;gap:4px;margin-left:auto}' +
    '.st-sloty button{all:unset;position:relative;width:22px;height:22px;box-sizing:border-box;text-align:center;' +
    'font:11px/20px var(--st-font);color:var(--st-text-2);cursor:pointer;border-radius:5px;' +
    'border:1px dashed var(--st-border);transition:background .12s,color .12s}' +
    '.st-sloty button:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-sloty button.zanyat{border:1px solid transparent;background:var(--st-border);color:var(--st-text)}' +
    '.st-sloty button.aktiven{background:var(--st-accent);color:#fff}' +
    '.st-sloty button.aktiven::after{content:"";position:absolute;right:2px;top:2px;width:4px;height:4px;border-radius:50%;background:#fff}';

  StendPanel.tip('sloty', function (row, d, P, api) {
    if (!document.getElementById('st-sloty-css')) {
      var s = document.createElement('style'); s.id = 'st-sloty-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var n = (d[3] && d[3].n) || 5;
    var KEY = api.storageKey + ':sloty';
    var sloty = [];
    try { sloty = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(sloty)) sloty = [];
    while (sloty.length < n) sloty.push(null);
    function zapisat() { try { localStorage.setItem(KEY, JSON.stringify(sloty)); } catch (e) {} }
    var box = document.createElement('div'); box.className = 'st-sloty';
    var knopki = [];
    function tekushchee() { return JSON.stringify(P); }
    function obnovit() {
      var tek = tekushchee();
      knopki.forEach(function (b, i) {
        var est = !!sloty[i];
        b.classList.toggle('zanyat', est);
        b.classList.toggle('aktiven', est && sloty[i] === tek);
        b.title = est
          ? 'слот ' + (i + 1) + ': вернуть · Shift — перезаписать · Alt — очистить'
          : 'слот ' + (i + 1) + ': запомнить текущее состояние';
        b.setAttribute('aria-pressed', String(est && sloty[i] === tek));
      });
    }
    for (var i = 0; i < n; i++) (function (i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = String(i + 1);
      b.setAttribute('aria-label', 'снимок ' + (i + 1));
      b.addEventListener('click', function (ev) {
        if (ev.altKey) { sloty[i] = null; }
        else if (!sloty[i] || ev.shiftKey) { sloty[i] = tekushchee(); }
        else {
          // вернуть снимок: значения — копиями, ручки перерисовать, стенд известить
          Object.assign(P, JSON.parse(sloty[i]));
          for (var k in api.controls) api.controls[k]();
          api.save();
        }
        zapisat(); obnovit();
      });
      knopki.push(b); box.appendChild(b);
    })(i);
    document.addEventListener('stend:izmenenie', function (e) {
      if (e.detail && e.detail.storageKey !== api.storageKey) return;
      obnovit();
    });
    api.controls[d[0] || '__sloty'] = obnovit;
    obnovit();
    row.appendChild(box);
  });
})();
