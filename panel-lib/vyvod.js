/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Вывод — число, которое не крутят, а получают. Снято с панели настроек Миши
   (`DerivedSetting`, `github.com/Veevtamm/settings-panel`, 11.09).

   Свод требует, чтобы каждое число выводилось из доли, коридора или модуля
   (П2). Вывод при этом живёт в коде и на экране не виден: панель показывает
   слагаемые, а результат — нет. «Ход в каталог 1120 мс» и «ярлыки приходят с
   45 %» стоят рядом, а сколько идут сами ярлыки — считай в уме. Строка вывода
   показывает результат и, если объявлен расчёт, само действие: 1120 × 55 %.

   Значения в P у вывода нет: он не хранится, не попадает в уведённые и не
   переживает перезагрузку — его незачем хранить, он считается заново.

   ВЫВОД ОБЯЗАН НАЗВАТЬ, ИЗ ЧЕГО ОН ВЫВЕДЕН. `ot` — не подписка ради удобства,
   а само объявление связи: число, которое не может перечислить свои
   слагаемые, — не вывод, а просто число. Без `ot` орган говорит об этом вслух
   и обновляется только вместе со всей панелью.

   Объявление:  ['', 'Ярлыки идут', 'вывод', { opcii: {
                  ot: ['vhodMs', 'yarlykiOt'], ed: 'мс',
                  schitat:  function (P) { return P.vhodMs * (100 - P.yarlykiOt) / 100; },
                  raschyot: function (P) { return P.vhodMs + ' × ' + (100 - P.yarlykiOt) + ' %'; } } }]  */
(function () {
  var STIL = '.st-vyvod{display:flex;align-items:baseline;gap:6px;margin-left:auto;' +
    'font:12px/1.6 var(--st-font);color:var(--st-text);font-variant-numeric:tabular-nums}' +
    '.st-vyvod-ed{font-size:11px;color:var(--st-text-2)}' +
    /* Расчёт — вторым этажом и приглушённо: он объясняет число, а не спорит
       с ним за внимание. */
    '.st-vyvod-rasch{width:100%;margin-top:2px;text-align:right;' +
    'font:10px/1.4 var(--st-font);color:var(--st-text-2);font-variant-numeric:tabular-nums}' +
    '.row:has(>.st-vyvod){flex-wrap:wrap}';

  StendPanel.tip('vyvod', function (row, d, P, api) {
    if (!document.getElementById('st-vyvod-css')) {
      var s = document.createElement('style'); s.id = 'st-vyvod-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var o = d[4] || d[3] || {};   // опции приходят пятым: так их кладёт компилятор объявления
    var schitat = o.schitat || function () { return 0; };
    var ed = o.ed || '';
    var tochnost = o.tochnost === undefined ? 0 : o.tochnost;

    var box = document.createElement('div'); box.className = 'st-vyvod';
    var chislo = document.createElement('span');
    var edin = document.createElement('span'); edin.className = 'st-vyvod-ed'; edin.textContent = ed;
    box.appendChild(chislo); if (ed) box.appendChild(edin);
    var rasch = o.raschyot ? document.createElement('div') : null;
    if (rasch) rasch.className = 'st-vyvod-rasch';

    function obnovit() {
      var v = schitat(P);
      chislo.textContent = (typeof v === 'number' && isFinite(v))
        ? String(parseFloat(v.toFixed(tochnost))) : String(v);
      if (rasch) rasch.textContent = o.raschyot(P);
    }

    /* Показ ключа склеивается, а не затирается: ту же ручку держат её
       собственная строка и отражения в других кластерах. */
    var ot = o.ot || [];
    if (!ot.length) {
      console.warn('Панель: вывод «' + (d[1] || '') + '» не назвал, из чего он выведен (ot) — ' +
        'обновится только вместе со всей панелью.');
    }
    ot.forEach(function (k) {
      var bylo = api.controls[k];
      api.controls[k] = bylo ? function () { bylo(); obnovit(); } : obnovit;
    });

    row.appendChild(box);
    if (rasch) row.appendChild(rasch);
    obnovit();
  });
})();
