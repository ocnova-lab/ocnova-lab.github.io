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
                  ['padB', 'снизу',  0, 300, 4]]]

   Сцепка (с панели автолейаута Фигмы, замок у Gap / Padding, оценка 02.09):
   пока сцеплено — одно число правит все поля пары; расцепил — поля врозь.
   Закон для всех сторон, потом отступление по стороне: три этажа в миниатюре.
                ['', 'Зазоры, px', 'para', [...], { scepka: true }]
   Состояние замка — привычка руки, хранится на стенд, не в параметрах.      */
(function () {
  /* Приёмка Сергея 02.09: слайдеры-коротышки у пар не нужны — родственные
     величины правятся числами, как в Фигме: стрелки ±шаг, Shift — вдесятеро,
     выражения («700/2», «+25») принимаются. Имя пары — этажом выше. */
  /* Пробелы по макету Сергея (Figma «Строка/Пара», 03.09): поля через 2 px —
     читаются одной группой; имя → поля 6 (этажи), подпись → поле 3. */
  var STIL = '.st-para{display:flex;gap:2px;width:100%;align-items:flex-end}' +
    /* Поля пары — общий блок ядра (.st-pole-blok, подпись сверху): тот же
       вид рисовался здесь заново (Г9, улов линтера 04.09). */
    '.st-para-zamok{all:unset;flex:none;width:24px;height:24px;display:inline-flex;align-items:center;' +
    'justify-content:center;cursor:pointer;border-radius:6px;color:var(--st-text-2);margin-bottom:1px}' +
    '.st-para-zamok:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-para-zamok[aria-pressed="true"]{color:var(--st-accent)}' +
    '.st-para-zamok svg{width:14px;height:14px;display:block;fill:none;stroke:currentColor;' +
    'stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}' +
    '.row:has(>.st-para){flex-wrap:wrap}';
  var ZAMOK = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M5.5 8.5 8.5 5.5"/>' +
    '<path d="M6 3.5 7.2 2.3a2.3 2.3 0 0 1 3.3 3.3L9.3 6.8"/><path d="M8 10.5 6.8 11.7a2.3 2.3 0 0 1-3.3-3.3L4.7 7.2"/></svg>';
  var RAZOMKNUT = '<svg viewBox="0 0 14 14" aria-hidden="true">' +
    '<path d="M6 3.5 7.2 2.3a2.3 2.3 0 0 1 3.3 3.3L9.3 6.8"/><path d="M8 10.5 6.8 11.7a2.3 2.3 0 0 1-3.3-3.3L4.7 7.2"/></svg>';

  StendPanel.tip('para', function (row, d, P, api) {
    if (!document.getElementById('st-para-css')) {
      var s = document.createElement('style'); s.id = 'st-para-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var opts = d[4] || {};
    row.classList.add('dva');   // имя этажом выше, зазор этажей 6
    var box = document.createElement('div'); box.className = 'st-para';
    var polya = [];
    var klyuchi = (d[3] || []).map(function (r) { return r[0]; });
    var ZAMOK_KEY = api.storageKey + ':scepka:' + klyuchi.join('+');
    var scepleno = false;
    if (opts.scepka) {
      var ravny = klyuchi.every(function (k) { return String(P[k]) === String(P[klyuchi[0]]); });
      try { var z = localStorage.getItem(ZAMOK_KEY); scepleno = z === null ? ravny : z === '1'; } catch (e) { scepleno = ravny; }
    }
    function klamp(p, v) { return Math.min(p.hi, Math.max(p.lo, v)); }
    (d[3] || []).forEach(function (r) {
      var key = r[0], lo = r[2], hi = r[3], shag = r[4] || 1;
      var blok = StendPanel.poleBlok(r[1], { sverhu: true, dlyaPolya: true,
                                             imya: (d[1] || '') + ' · ' + r[1] });
      var o = blok.box; o.classList.add('st-para-o');
      var lab = blok.nad, inp = blok.inp;
      var pole = { key: key, lo: lo, hi: hi, pokaz: pokaz };
      var tochka;   // точка увода внутри поля, справа
      function pokaz() { inp.value = parseFloat(Number(P[key]).toFixed(3)); if (tochka) tochka.obnovit(); }
      function prinyat(syroj) {
        var v = StendPanel.vyrazhenie
          ? StendPanel.vyrazhenie(syroj, Number(P[key]))
          : parseFloat(String(syroj).replace(',', '.'));
        // кривой ввод не молчит: по Enter поле краснеет и остаётся (приёмка HIG 02.09)
        if (isNaN(v)) { inp.classList.add('oshibka'); inp.setAttribute('aria-invalid', 'true'); return; }
        inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
        if (scepleno) {
          // сцеплено: одно число на все поля, каждое в своих границах
          polya.forEach(function (p) { P[p.key] = klamp(p, v); p.pokaz(); });
        } else {
          P[key] = klamp(pole, v); pokaz();
        }
        api.save();
      }
      inp.addEventListener('input', function () {
        inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
      });
      // правят число целиком, а не букву в середине (жалоба Сергея 03.09)
      inp.addEventListener('focus', function () { setTimeout(function () { inp.select(); }, 0); });
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
      tochka = StendPanel.tochkaUvoda(inp,
        function () { return api.defaults && api.defaults[key] !== undefined && String(P[key]) !== String(api.defaults[key]); },
        function () { P[key] = api.defaults[key]; pokaz(); api.save(); });
      api.controls[key] = pokaz;
      pokaz();
      polya.push(pole);
      o.appendChild(lab); o.appendChild(tochka.obl); box.appendChild(o);
    });
    if (opts.scepka) {
      var zamok = document.createElement('button'); zamok.type = 'button'; zamok.className = 'st-para-zamok';
      function zamokPokaz() {
        zamok.innerHTML = scepleno ? ZAMOK : RAZOMKNUT;
        zamok.setAttribute('aria-pressed', String(scepleno));
        zamok.title = scepleno ? 'сцеплено: одно число на все — расцепить' : 'врозь — сцепить';
      }
      zamok.addEventListener('click', function () {
        scepleno = !scepleno;
        try { localStorage.setItem(ZAMOK_KEY, scepleno ? '1' : '0'); } catch (e) {}
        if (scepleno) {
          // сцепили: первое поле становится законом для всех
          var v = Number(P[polya[0].key]);
          polya.forEach(function (p) { P[p.key] = klamp(p, v); p.pokaz(); });
          api.save();
        }
        zamokPokaz();
      });
      zamokPokaz();
      box.appendChild(zamok);
    }
    row.appendChild(box);
  });
})();
