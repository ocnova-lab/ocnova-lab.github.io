/* © Сергей Гуров, 2026 · панель стендов — библиотека органов управления · stendy.vercel.app */
/* Пара — две родственные ручки в одной строке вместо двух строк.
   Снята с tweakpane-compact-kit (split-layout, 2026): панель из 26 ручек
   прокручивается, и связанные величины разъезжаются так далеко, что перестают
   читаться как пара. «Сверху» и «снизу», «мин» и «макс» ходят вместе — пусть
   и стоят вместе.

   Отличается от коридора: коридор — ОДНА величина с двумя границами
   (значение [низ, верх]), пара — ДВЕ независимые величины, каждая со своим
   ключом; их можно крутить врозь, и одна не ограничивает другую.

   Объявление:  ['', 'Поле, px', 'para', [
                  ['padT', 'сверху', 0, 300, 4],
                  ['padB', 'снизу',  0, 300, 4]]]                               */
(function () {
  var STIL = '.st-para{display:flex;gap:10px;width:100%;margin-top:4px}' +
    '.st-para-o{flex:1;min-width:0}' +
    '.st-para-o label{display:block;font:10px/1.4 var(--st-font);color:var(--st-text-3);' +
    'margin-bottom:2px}' +
    '.st-para-o div{display:flex;align-items:center;gap:6px}' +
    '.st-para-o input{flex:1;min-width:0;accent-color:var(--st-accent);height:14px}' +
    '.st-para-o span{min-width:3ch;text-align:right;font:11px/1 var(--st-font);' +
    'color:var(--st-text-2);font-variant-numeric:tabular-nums}' +
    '.row:has(>.st-para){flex-wrap:wrap}';

  StendPanel.tip('para', function (row, d, P, api) {
    if (!document.getElementById('st-para-css')) {
      var s = document.createElement('style'); s.id = 'st-para-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var box = document.createElement('div'); box.className = 'st-para';
    (d[3] || []).forEach(function (r) {
      var key = r[0];
      var o = document.createElement('div'); o.className = 'st-para-o';
      var lab = document.createElement('label'); lab.textContent = r[1];
      var stroka = document.createElement('div');
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = r[2]; inp.max = r[3]; inp.step = r[4];
      inp.value = P[key];
      var val = document.createElement('span');
      val.textContent = parseFloat(Number(P[key]).toFixed(3));
      inp.addEventListener('input', function () {
        P[key] = parseFloat(inp.value);
        val.textContent = parseFloat(P[key].toFixed(3));
        api.save();
      });
      api.controls[key] = function () {
        inp.value = P[key];
        val.textContent = parseFloat(Number(P[key]).toFixed(3));
      };
      stroka.appendChild(inp); stroka.appendChild(val);
      o.appendChild(lab); o.appendChild(stroka); box.appendChild(o);
    });
    row.appendChild(box);
  });
})();
