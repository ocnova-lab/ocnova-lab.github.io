/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Коридор — две границы одной дорожкой: «не уже, чем …, и не шире, чем …».
   Снят с Tweakpane Essentials (interval, cocopon, 2021) и переименован по закону 3б
   девятки: коридор задаёт границы, внутри которых значение течёт само.
   Две отдельные ручки «мин» и «макс» заставляют держать пару в голове и позволяют
   поставить мин выше макса; здесь пара живёт одним органом и не выворачивается.

   Объявление:  ['pole', 'Поле, px', 'koridor', 0, 300, 4]
   Значение:    [низ, верх] — массив из двух чисел                              */
(function () {
  var STIL = '.st-koridor{flex:1;display:flex;align-items:center;gap:8px}' +
    '.st-kor-track{position:relative;flex:1;height:20px;cursor:pointer;touch-action:none}' +
    '.st-kor-track::before{content:"";position:absolute;left:0;right:0;top:9px;height:2px;' +
    'border-radius:1px;background:var(--st-track)}' +
    '.st-kor-fill{position:absolute;top:9px;height:2px;border-radius:1px;background:var(--st-accent)}' +
    '.st-kor-h{position:absolute;top:2px;width:16px;height:16px;margin-left:-8px;border-radius:50%;' +
    'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.45);cursor:grab}' +
    '.st-kor-h:active{cursor:grabbing;transform:scale(1.15)}' +
    '.st-kor-val{min-width:4ch;color:var(--st-text-2);font-variant-numeric:tabular-nums;cursor:pointer}' +
    '.st-kor-val:last-child{text-align:right}';

  StendPanel.tip('koridor', function (row, d, P, api) {
    if (!document.getElementById('st-koridor-css')) {
      var s = document.createElement('style'); s.id = 'st-koridor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var lo = d[3], hi = d[4], shag = d[5] || 1;
    if (!Array.isArray(P[d[0]])) P[d[0]] = [lo, hi];

    /* Два этажа (приёмка Сергея 02.09): имя выше, здесь — нитка по центру,
       слева число нижней границы, справа верхней, ОБА редактируемые:
       клик — точный ввод (выражения работают), стрелки ±шаг, Shift ±10. */
    row.classList.add('dva');
    var box = document.createElement('div'); box.className = 'st-koridor';
    var track = document.createElement('div'); track.className = 'st-kor-track';
    var fill = document.createElement('div'); fill.className = 'st-kor-fill';
    var hA = document.createElement('div'); hA.className = 'st-kor-h';
    var hB = document.createElement('div'); hB.className = 'st-kor-h';
    var valA = document.createElement('span'); valA.className = 'st-kor-val';
    var valB = document.createElement('span'); valB.className = 'st-kor-val';
    track.appendChild(fill); track.appendChild(hA); track.appendChild(hB);
    box.appendChild(valA); box.appendChild(track); box.appendChild(valB);
    // резерв колонки точек увода: правая вертикаль чисел общая со слайдерами
    var rezerv = document.createElement('span'); rezerv.className = 'st-uvod';
    box.appendChild(rezerv);
    row.appendChild(box);

    function dolya(v) { return (v - lo) / (hi - lo || 1); }
    function narisovat() {
      var a = P[d[0]][0], b = P[d[0]][1];
      hA.style.left = dolya(a) * 100 + '%';
      hB.style.left = dolya(b) * 100 + '%';
      fill.style.left = dolya(a) * 100 + '%';
      fill.style.width = Math.max(0, (dolya(b) - dolya(a)) * 100) + '%';
      valA.textContent = parseFloat(a.toFixed(4));
      valB.textContent = parseFloat(b.toFixed(4));
    }
    // точный ввод границы: та же механика, что у числа слайдера
    function vvod(el, storona) {
      el.title = 'клик — точный ввод';
      el.addEventListener('click', function () {
        var ked = document.createElement('input');
        ked.type = 'text'; ked.inputMode = 'decimal'; ked.className = 'val-edit';
        ked.value = parseFloat(P[d[0]][storona].toFixed(4));
        if (StendPanel.klavishi) StendPanel.klavishi(ked);
        box.replaceChild(ked, el);
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
          box.replaceChild(el, ked);
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
      });
    }
    vvod(valA, 0); vvod(valB, 1);
    function znachenie(e) {
      var r = track.getBoundingClientRect();
      var v = lo + (e.clientX - r.left) / (r.width || 1) * (hi - lo);
      v = Math.round(v / shag) * shag;
      return Math.min(hi, Math.max(lo, parseFloat(v.toFixed(6))));
    }
    var tyanem = null;
    track.addEventListener('pointerdown', function (e) {
      var v = znachenie(e);
      // берём ту границу, что ближе: край коридора не перепрыгивает соседний
      tyanem = Math.abs(v - P[d[0]][0]) <= Math.abs(v - P[d[0]][1]) ? 0 : 1;
      track.setPointerCapture(e.pointerId);
      dvigat(e);
    });
    function dvigat(e) {
      if (tyanem === null) return;
      var v = znachenie(e), z = P[d[0]].slice();
      z[tyanem] = v;
      if (z[0] > z[1]) z[tyanem === 0 ? 1 : 0] = v;   // границы не выворачиваются
      P[d[0]] = z;
      narisovat(); api.save();
    }
    track.addEventListener('pointermove', dvigat);
    track.addEventListener('pointerup', function () { tyanem = null; });
    api.controls[d[0]] = narisovat;
    narisovat();
  });
})();
