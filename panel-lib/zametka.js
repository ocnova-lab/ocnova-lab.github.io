/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Заметка — пояснение блоком внутри секции: закон словами рядом с ручками.
   Снята с дизайн-системы панелек Миши («Заметка на всю ширину панели», 02.09);
   в очереди библиотеки с 2026-08-24 под именем infodump. Ручки нет: строка
   говорит, а не крутит, — поэтому ключ пустой и в уведённые не попадает.
   Объявление:  ['', '', 'zametka', 'Текст заметки. Перенос строки — \\n.']  */
(function () {
  var STIL = '.st-zametka{width:100%;font:12px/1.45 var(--st-font);color:var(--st-text-2);white-space:pre-line}' +
    '.row:has(>.st-zametka)>label{display:none}';
  StendPanel.tip('zametka', function (row, d) {
    if (!document.getElementById('st-zametka-css')) {
      var s = document.createElement('style'); s.id = 'st-zametka-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var z = document.createElement('div'); z.className = 'st-zametka';
    z.textContent = d[3] || d[1] || '';
    row.appendChild(z);
  });
})();
