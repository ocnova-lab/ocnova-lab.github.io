/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Сегментер — закрытый список, где все варианты видны сразу, без раскрытия.
   Приём снят со стенда «7 сеток» (Миша, 2026-08): role="radiogroup" вместо селекта.
   Брать, когда вариантов 2–5 и выбор — это закон, а не настройка.
   Объявление:  ['tip', 'Тип сетки', 'segment', [['kolonnaya','Колонная'], ['lesenka','Лесенка']]]

   Режим значков (снят с дизайн-системы панелек Миши, 02.09): вместо списка —
   имя словаря, варианты нарисованы значками, подпись живёт в подсказке и в
   aria-label. Выключку узнают по значку быстрее, чем по слову.
                ['vykl', 'Выключка', 'segment', 'выключка']
   Словари: выключка (влево · по центру · вправо · по ширине), вертикаль
   (верх · середина · низ), горизонталь (слева · центр · справа), ориентация
   (квадрат · вертикаль · горизонталь), владелец (формат · содержимое ·
   контейнер — перевод Fixed / Hug / Fill из панели Фигмы: кто владеет размером).
   Свой значок в списке — третьим элементом: [['a', 'Подпись', '<svg…>']].
   Значки — свои SVG: SF Symbols в вебе не лицензированы.                    */
(function () {
  var STIL = '.st-seg{display:flex;gap:2px;margin-left:auto;background:var(--st-hairline);' +
    'padding:2px;border-radius:7px}' +
    '.st-seg button{all:unset;padding:5px 9px;font:11px/1 var(--st-font);color:var(--st-text-2);' +
    'cursor:pointer;border-radius:5px;transition:background .12s,color .12s;white-space:nowrap}' +
    '.st-seg button:hover{color:var(--st-text)}' +
    '.st-seg button[aria-checked="true"]{background:var(--st-accent);color:#fff}' +
    '.st-seg button.st-seg-z{padding:3px 7px;display:inline-flex;align-items:center}' +
    '.st-seg button svg{width:14px;height:14px;display:block;fill:none;stroke:currentColor;' +
    'stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}';
  function z(telo) { return '<svg viewBox="0 0 14 14" aria-hidden="true">' + telo + '</svg>'; }
  var SLOVARI = {
    'выключка': [
      ['left', 'Влево', z('<path d="M1 2.5h12M1 5.5h8M1 8.5h12M1 11.5h8"/>')],
      ['center', 'По центру', z('<path d="M1 2.5h12M3 5.5h8M1 8.5h12M3 11.5h8"/>')],
      ['right', 'Вправо', z('<path d="M1 2.5h12M5 5.5h8M1 8.5h12M5 11.5h8"/>')],
      ['justify', 'По ширине', z('<path d="M1 2.5h12M1 5.5h12M1 8.5h12M1 11.5h12"/>')]],
    'вертикаль': [
      ['top', 'Верх', z('<path d="M1 2h12"/><rect x="4" y="4.5" width="6" height="7" rx="1"/>')],
      ['middle', 'Середина', z('<path d="M1 7h3M10 7h3"/><rect x="4" y="3.5" width="6" height="7" rx="1"/>')],
      ['bottom', 'Низ', z('<path d="M1 12h12"/><rect x="4" y="2.5" width="6" height="7" rx="1"/>')]],
    'горизонталь': [
      ['left', 'Слева', z('<path d="M2 1v12"/><rect x="4.5" y="4" width="7" height="6" rx="1"/>')],
      ['center', 'Центр', z('<path d="M7 1v3M7 10v3"/><rect x="3.5" y="4" width="7" height="6" rx="1"/>')],
      ['right', 'Справа', z('<path d="M12 1v12"/><rect x="2.5" y="4" width="7" height="6" rx="1"/>')]],
    'ориентация': [
      ['square', 'Квадрат', z('<rect x="3" y="3" width="8" height="8" rx="1"/>')],
      ['portrait', 'Вертикаль', z('<rect x="4" y="2" width="6" height="10" rx="1"/>')],
      ['landscape', 'Горизонталь', z('<rect x="2" y="4" width="10" height="6" rx="1"/>')]],
    'владелец': [['format', 'Формат'], ['soderzhimoe', 'Содержимое'], ['konteyner', 'Контейнер']],
  };
  StendPanel.slovari = SLOVARI;

  StendPanel.tip('segment', function (row, d, P, api) {
    if (!document.getElementById('st-seg-css')) {
      var s = document.createElement('style'); s.id = 'st-seg-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var varianty = typeof d[3] === 'string' ? SLOVARI[d[3]] : d[3];
    if (!varianty) {
      if (StendPanel.pretenzii) StendPanel.pretenzii.push('сегментер «' + d[1] + '»: словаря «' + d[3] + '» нет');
      varianty = [];
    }
    var box = document.createElement('div');
    box.className = 'st-seg'; box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', d[1] || '');
    var knopki = [];
    varianty.forEach(function (opt) {
      var b = document.createElement('button'); b.type = 'button';
      if (opt[2]) { b.className = 'st-seg-z'; b.innerHTML = opt[2]; b.title = opt[1]; b.setAttribute('aria-label', opt[1]); }
      else b.textContent = opt[1];
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
    // стрелки ходят по вариантам, как в radiogroup (приёмка HIG 02.09)
    box.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      var i = knopki.findIndex(function (x) { return x[1] === P[d[0]]; });
      var j = (i + (ev.key === 'ArrowRight' ? 1 : -1) + knopki.length) % knopki.length;
      ev.preventDefault(); knopki[j][0].click(); knopki[j][0].focus();
    });
    api.controls[d[0]] = function () {
      knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === P[d[0]])); });
    };
    /* Широкий текстовый сегментер жмёт подпись в две строки — имя этажом
       выше (П16), сегментер вторым этажом справа, на общей вертикали. */
    var dlina = varianty.reduce(function (a, o) { return a + (o[2] ? 3 : String(o[1]).length); }, 0);
    if (dlina > 22) row.classList.add('dva');
    row.appendChild(box);
  });
})();
