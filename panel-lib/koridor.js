/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Коридор — две границы одной дорожкой: «не уже, чем …, и не шире, чем …».
   Снят с Tweakpane Essentials (interval, cocopon, 2021) и переименован по закону 3б
   девятки: коридор задаёт границы, внутри которых значение течёт само.
   Две отдельные ручки «мин» и «макс» заставляют держать пару в голове и позволяют
   поставить мин выше макса; здесь пара живёт одним органом и не выворачивается.

   Объявление:  ['pole', 'Поле, px', 'koridor', 0, 300, 4]
   Значение:    [низ, верх] — массив из двух чисел
   Без нитки:   ['ttl', 'Титул: коридор кегля, px', 'koridor', 20, 140, 1, { nitka: false }]
                — две границы двумя полями ввода: кегль правят числом, не ниткой
                (правило Сергея 02.09, П16); тип «кегль» ставит это сам.        */
(function () {
  /* Эталон Сергея (Figma «Frame 4», 03.09) для ниток с двумя параметрами:
     имя и точка увода первым этажом, нитка во всю ширину, числа под
     рукоятками. Рукоятка 20 ходит от 10 px до W−10, как шайба слайдера. */
  /* Г8: высота малого органа 22 — по ней живут и нитка, и цель под ней.
     Коридор стоял на 20 и центрировал линию по 10, а пилюля высотой 22 — по
     11: линия входила в пилюлю на пиксель выше центра (правка 03.09). */
  var STIL = '.st-koridor{position:relative;flex:1 1 100%;height:22px}' +
    '.st-kor-track{position:absolute;left:0;right:0;top:0;height:22px;cursor:pointer;touch-action:none}' +
    '.st-kor-track::before{content:"";position:absolute;left:0;right:0;top:50%;margin-top:-1.5px;height:3px;' +
    'border-radius:1.5px;background:var(--st-track)}' +
    '.st-kor-fill{position:absolute;top:50%;margin-top:-1.5px;height:3px;border-radius:1.5px;background:var(--st-accent)}' +
    '.st-kor-val{cursor:pointer}' +
    /* Поля коридора — общий блок ядра (.st-pole-blok, подпись сверху).
       Своё рисовалось теми же числами: 24, скругление 6, тот же фон —
       «похожее, но своё», за что и ругает Г9 (улов линтера 04.09).
       Здесь остаётся только ряд: он про место, а не про вид поля. */
    '.st-kor-polya{display:flex;gap:2px;width:100%;align-items:flex-end}';

  StendPanel.tip('koridor', function (row, d, P, api) {
    if (!document.getElementById('st-koridor-css')) {
      var s = document.createElement('style'); s.id = 'st-koridor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var lo = d[3], hi = d[4], shag = d[5] || 1, opts = d[6] || {};
    if (!Array.isArray(P[d[0]])) P[d[0]] = [lo, hi];

    if (opts.nitka === false) {
      /* Границы двумя полями, без нитки: кегль и родня правятся числом.
         Механика границ та же — клампы и невыворачивание. */
      row.classList.add('dva');
      var polya = document.createElement('div'); polya.className = 'st-kor-polya';
      var vvody = [];
      [['от', 0], ['до', 1]].forEach(function (st) {
        /* Поле — общий блок ядра с подписью сверху: своё рисовалось теми же
           числами, и это ровно «похожее, но своё» (Г9, улов линтера 04.09). */
        var blok = StendPanel.poleBlok(st[0], { sverhu: true, dlyaPolya: true,
                                                imya: (d[1] || '') + ' · ' + st[0] });
        var o = blok.box; o.classList.add('st-kor-o');
        var lab = blok.nad, inp = blok.inp;
        var tochka;   // точка увода внутри поля, справа
        function pokaz() {
          inp.value = parseFloat(Number(P[d[0]][st[1]]).toFixed(4));
          inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid');
          if (tochka) tochka.obnovit();
        }
        function prinyat(syroj) {
          var v = StendPanel.vyrazhenie(syroj, P[d[0]][st[1]]);
          if (isNaN(v)) { inp.classList.add('oshibka'); inp.setAttribute('aria-invalid', 'true'); return; }
          v = Math.min(hi, Math.max(lo, v));
          var z = P[d[0]].slice(); z[st[1]] = v;
          if (z[0] > z[1]) z[st[1] === 0 ? 1 : 0] = v;   // не выворачивается
          P[d[0]] = z; vvody.forEach(function (f) { f(); }); api.save();
        }
        inp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { prinyat(inp.value); if (!inp.classList.contains('oshibka')) inp.blur(); return; }
          if (ev.key === 'Escape') { pokaz(); inp.blur(); return; }
          if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
          ev.preventDefault();
          var krupno = shag * (ev.shiftKey ? 10 : 1);
          prinyat(String(Number(P[d[0]][st[1]]) + (ev.key === 'ArrowUp' ? krupno : -krupno)));
        });
        inp.addEventListener('input', function () { inp.classList.remove('oshibka'); inp.removeAttribute('aria-invalid'); });
        // правят число целиком, а не букву в середине (жалоба Сергея 03.09)
        inp.addEventListener('focus', function () { setTimeout(function () { inp.select(); }, 0); });
        inp.addEventListener('blur', function () { if (isNaN(StendPanel.vyrazhenie(inp.value, 0))) pokaz(); else prinyat(inp.value); });
        var um = api.defaults && api.defaults[d[0]];
        tochka = StendPanel.tochkaUvoda(inp,
          function () { return Array.isArray(um) && String(P[d[0]][st[1]]) !== String(um[st[1]]); },
          function () {
            if (!Array.isArray(um)) return;
            var z = P[d[0]].slice(); z[st[1]] = um[st[1]];
            if (z[0] > z[1]) z[st[1] === 0 ? 1 : 0] = um[st[1]];
            P[d[0]] = z; vvody.forEach(function (f) { f(); }); api.save();
          });
        vvody.push(pokaz); pokaz();
        o.appendChild(lab); o.appendChild(tochka.obl); polya.appendChild(o);
      });
      row.appendChild(polya);
      api.controls[d[0]] = function () { vvody.forEach(function (f) { f(); }); };
      return;
    }

    /* Три этажа по эталону: имя + точка увода; нитка во всю ширину с двумя
       рукоятками; числа под рукоятками, ОБА редактируемые: клик — точный
       ввод (выражения работают), стрелки ±шаг, Shift ±10. */
    row.classList.add('dva');
    var lab = row.querySelector('label');
    var imya = document.createElement('div'); imya.className = 'st-imya';
    if (lab) imya.appendChild(lab);
    var uvod = document.createElement('button'); uvod.type = 'button'; uvod.className = 'st-uvod';
    uvod.title = 'уведено от умолчания — вернуть';
    var um = api.defaults && api.defaults[d[0]];
    function uvodObnovit() {
      uvod.classList.toggle('on', Array.isArray(um) && JSON.stringify(P[d[0]]) !== JSON.stringify(um));
    }
    uvod.addEventListener('click', function () {
      if (!Array.isArray(um)) return;
      P[d[0]] = um.slice(); narisovat(); api.save();
    });
    imya.appendChild(uvod);
    var box = document.createElement('div'); box.className = 'st-koridor';
    var track = document.createElement('div'); track.className = 'st-kor-track';
    var fill = document.createElement('div'); fill.className = 'st-kor-fill';
    /* Две пилюли на одной нитке. СТРЕЛКИ СНЯТЫ И ЗДЕСЬ (правка 03.09):
       ход 34 снял их со слайдера в ядре, а коридор их продолжал строить —
       и после того, как из panel.css убрали `.st-pil-str`, браузер рисовал
       голые кнопки: белые плашки по бокам числа. Это и были «артефакты на
       бегунках» со снимка Сергея. Пилюля показывает число и тянется,
       границу вводят кликом по числу — как у всякой нитки. */
    var valA = document.createElement('span'); valA.className = 'val st-kor-val';
    var valB = document.createElement('span'); valB.className = 'val st-kor-val';
    var nazhata = null;              // какая пилюля под рукой и ходила ли она
    function pilyulya(val, storona) {
      var pil = document.createElement('span'); pil.className = 'st-pil';
      pil.appendChild(val);
      /* ОДНА ЦЕЛЬ, ДВА ЖЕСТА, РАЗВЕДЁННЫЕ ХОДОМ РУКИ. Целая пилюля тянется;
         нажатие без хода (меньше 3 px) — это клик, он открывает точный ввод.
         Так у границы остаётся цель в 22 px и на тягу, и на ввод: делить
         пилюлю на «тело тянет, число вводит» значило бы вернуть те же 8 px,
         из-за которых сняли стрелки. */
      pil.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        // захват уходит на трек — он же и разбирает, тяга это была или клик
        nazhata = { val: val, storona: storona, x: e.clientX, y: e.clientY, hodil: false };
        tyanem = storona; track.setPointerCapture(e.pointerId); pil.classList.add('tyanem');
      });
      return pil;
    }
    var pilA = pilyulya(valA, 0), pilB = pilyulya(valB, 1);
    track.appendChild(fill); track.appendChild(pilA); track.appendChild(pilB);
    box.appendChild(track);
    row.appendChild(imya); row.appendChild(box);

    function dolya(v) { return (v - lo) / (hi - lo || 1); }
    function hw(pil) { return (pil.offsetWidth || 39) / 2; }
    // центр пилюли ходит от половины её ширины до W − половина
    function centr(q, pil) { var h = hw(pil); return 'calc(' + h + 'px + ' + q + ' * (100% - ' + h * 2 + 'px))'; }
    function postavit(storona, v) {
      v = Math.min(hi, Math.max(lo, parseFloat((Math.round((v - lo) / shag) * shag + lo).toFixed(6))));
      var z = P[d[0]].slice(); z[storona] = v;
      if (z[0] > z[1]) z[storona === 0 ? 1 : 0] = v;   // не выворачивается
      P[d[0]] = z; narisovat(); api.save();
    }
    function narisovat() {
      var a = P[d[0]][0], b = P[d[0]][1], qa = dolya(a), qb = dolya(b);
      valA.textContent = parseFloat(a.toFixed(4));
      valB.textContent = parseFloat(b.toFixed(4));
      pilA.style.left = centr(qa, pilA); pilB.style.left = centr(qb, pilB);
      /* Заливка кончается ровно в центрах пилюль. Ширина считалась от общего
         хода, а он у пилюль разной ширины («90» и «125») разный — правый
         конец заливки уезжал из-под пилюли (правка 03.09). Берём оба края
         тем же calc, что и ход. */
      fill.style.left = centr(qa, pilA);
      fill.style.width = '';
      fill.style.right = 'calc(100% - (' + centr(qb, pilB) + '))';
      uvodObnovit();
    }
    if (window.ResizeObserver) { var ro = new ResizeObserver(narisovat); ro.observe(pilA); ro.observe(pilB); }
    // точный ввод границы: та же механика, что у числа слайдера
    function otkrytVvod(el, storona) {
      if (!el.parentNode) return;                 // поле уже открыто
      (function () {
        var ked = document.createElement('input');
        ked.type = 'text'; ked.inputMode = 'decimal'; ked.className = 'val-edit';
        ked.value = parseFloat(P[d[0]][storona].toFixed(4));
        if (StendPanel.klavishi) StendPanel.klavishi(ked);
        el.parentNode.replaceChild(ked, el);
        ked.focus(); ked.select();
        var gotovo = false;
        function prinyat(ok, myagko) {
          if (gotovo) return; gotovo = true;
          var v = StendPanel.vyrazhenie
            ? StendPanel.vyrazhenie(ked.value, P[d[0]][storona])
            : parseFloat(String(ked.value).replace(',', '.'));
          if (ok && isNaN(v) && myagko) {   // кривой ввод по Enter: поле остаётся и краснеет
            gotovo = false; ked.classList.add('oshibka'); ked.setAttribute('aria-invalid', 'true');
            return;
          }
          ked.parentNode.replaceChild(el, ked);
          if (ok && !isNaN(v)) {
            v = Math.min(hi, Math.max(lo, v));
            var z = P[d[0]].slice();
            z[storona] = v;
            if (z[0] > z[1]) z[storona === 0 ? 1 : 0] = v;  // не выворачивается
            P[d[0]] = z;
            api.save();
          }
          narisovat();
        }
        ked.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') prinyat(true, true);
          else if (ev.key === 'Escape') prinyat(false);
        });
        ked.addEventListener('blur', function () { prinyat(true); });
      })();
    }
    valA.title = valB.title = 'потянуть — двигать границу, клик — точный ввод';
    function znachenie(e) {
      var r = track.getBoundingClientRect(), h = hw(tyanem === 1 ? pilB : pilA);
      // ход пилюли: от половины её ширины до W − половина
      var v = lo + (e.clientX - r.left - h) / ((r.width - 2 * h) || 1) * (hi - lo);
      v = Math.round(v / shag) * shag;
      return Math.min(hi, Math.max(lo, parseFloat(v.toFixed(6))));
    }
    var tyanem = null;
    track.addEventListener('pointerdown', function (e) {
      if (e.target !== track && e.target !== fill) return;   // пилюля берёт нажатие себе
      nazhata = null;
      var v = znachenie(e);
      // берём ту границу, что ближе: край коридора не перепрыгивает соседний
      tyanem = Math.abs(v - P[d[0]][0]) <= Math.abs(v - P[d[0]][1]) ? 0 : 1;
      track.setPointerCapture(e.pointerId);
      dvigat(e);
    });
    function dvigat(e) {
      if (tyanem === null) return;
      if (nazhata) {
        // порог хода: до 3 px это ещё клик, значение не трогаем
        if (Math.abs(e.clientX - nazhata.x) + Math.abs(e.clientY - nazhata.y) <= 3) return;
        nazhata.hodil = true;
      }
      var v = znachenie(e), z = P[d[0]].slice();
      z[tyanem] = v;
      if (z[0] > z[1]) z[tyanem === 0 ? 1 : 0] = v;   // границы не выворачиваются
      P[d[0]] = z;
      narisovat(); api.save();
    }
    track.addEventListener('pointermove', dvigat);
    track.addEventListener('pointerup', function () {
      tyanem = null; pilA.classList.remove('tyanem'); pilB.classList.remove('tyanem');
      if (nazhata && !nazhata.hodil) otkrytVvod(nazhata.val, nazhata.storona);
      nazhata = null;
    });
    track.addEventListener('pointercancel', function () {
      tyanem = null; nazhata = null;
      pilA.classList.remove('tyanem'); pilB.classList.remove('tyanem');
    });
    api.controls[d[0]] = narisovat;
    narisovat();
  });
})();
