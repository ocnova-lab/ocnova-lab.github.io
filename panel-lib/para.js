/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
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
  /* Приёмка Сергея 02.09: слайдеры-коротышки у пар не нужны — родственные
     величины правятся числами, как в Фигме: стрелки ±шаг, Shift — вдесятеро,
     выражения («700/2», «+25») принимаются. Имя пары — этажом выше. */
  var STIL = '.st-para{display:flex;gap:10px;width:100%;margin-top:4px}' +
    '.st-para-o{flex:1;min-width:0}' +
    '.st-para-o label{display:block;font:500 11px/1.4 var(--st-font);color:var(--st-text-2);' +
    'margin-bottom:3px}' +
    '.st-para-o input{width:100%;box-sizing:border-box;background:rgba(120,120,128,.22);' +
    'border:0.5px solid var(--st-hairline);border-radius:6px;color:var(--st-text);' +
    'font:12px var(--st-font);font-variant-numeric:tabular-nums;padding:5px 8px;outline:none}' +
    '.st-para-o input:focus{border-color:var(--st-accent)}' +
    '.st-para-o input.oshibka{border-color:#FF453A}' +
    '.row:has(>.st-para){flex-wrap:wrap}';

  StendPanel.tip('para', function (row, d, P, api) {
    if (!document.getElementById('st-para-css')) {
      var s = document.createElement('style'); s.id = 'st-para-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var box = document.createElement('div'); box.className = 'st-para';
    (d[3] || []).forEach(function (r) {
      var key = r[0], lo = r[2], hi = r[3], shag = r[4] || 1;
      var o = document.createElement('div'); o.className = 'st-para-o';
      var lab = document.createElement('label'); lab.textContent = r[1];
      var inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'decimal';
      function pokaz() { inp.value = parseFloat(Number(P[key]).toFixed(3)); }
      function prinyat(syroj) {
        var v = StendPanel.vyrazhenie
          ? StendPanel.vyrazhenie(syroj, Number(P[key]))
          : parseFloat(String(syroj).replace(',', '.'));
        // кривой ввод не молчит: по Enter поле краснеет и остаётся (приёмка HIG 02.09)
        if (isNaN(v)) { inp.classList.add('oshibka'); inp.setAttribute('aria-invalid', 'true'); return; }
        inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
        P[key] = Math.min(hi, Math.max(lo, v));
        pokaz(); api.save();
      }
      inp.addEventListener('input', function () {
        inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
      });
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { prinyat(inp.value); if (!inp.classList.contains('oshibka')) inp.blur(); return; }
        if (ev.key === 'Escape') { pokaz(); inp.blur(); return; }
        if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        ev.preventDefault();
        // стрелки правят сразу, как в Фигме: ±шаг, с Shift — вдесятеро
        var krupno = shag * (ev.shiftKey ? 10 : 1);
        prinyat(String(Number(P[key]) + (ev.key === 'ArrowUp' ? krupno : -krupno)));
      });
      inp.addEventListener('blur', function () {
        prinyat(inp.value);
        // уход из поля отменяет кривой ввод, как Esc
        if (inp.classList.contains('oshibka')) { inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid'); pokaz(); }
      });
      api.controls[key] = pokaz;
      pokaz();
      o.appendChild(lab); o.appendChild(inp); box.appendChild(o);
    });
    row.appendChild(box);
  });
})();
