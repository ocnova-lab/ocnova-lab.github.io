/* Угол — кольцо вместо дорожки: направление видно, а не вычисляется из числа.
   Снят с Tweakpane camerakit (cameraring, cocopon) и euler-режима
   @0b5vr/tweakpane-plugin-rotation. Трёхмерный гизмо не переносил: в стендах
   углы плоские — завал оси, наклон кольца, разворот рамки.

   Слайдер под угол врёт формой: он прямой, а величина круговая, и «85°» на
   дорожке ничем не отличается от «85 чего угодно». Кольцо показывает угол углом.

   Правка 2026-09-01 по замечанию Сергея: кольцо в 30 px было мишенью меньше
   ногтя — «неудобно для руки». Круг вырос вдвое (площадь хвата — вчетверо),
   радиус-линия ведётся от центра, конец с рукояткой; число справа осталось
   и правится щелчком, дабл-клик по кругу возвращает исходный угол.

   Объявление:  ['ugol', 'Угол, °', 'ugol', 45, 90]        — сектор допустимого
                ['ugol', 'Поворот, °', 'ugol', 0, 360, { shag: 5 }]
   Значение:    число в градусах                                                */
(function () {
  var STIL = '.st-ugol{display:flex;align-items:center;gap:10px;margin-left:auto;padding:4px 0}' +
    '.st-ugol canvas{display:block;cursor:grab;touch-action:none}' +
    '.st-ugol canvas:active{cursor:grabbing}' +
    '.st-ugol span{min-width:4ch;text-align:right;color:var(--st-text-2);' +
    'font-variant-numeric:tabular-nums;cursor:pointer}';

  StendPanel.tip('ugol', function (row, d, P, api) {
    if (!document.getElementById('st-ugol-css')) {
      var s = document.createElement('style'); s.id = 'st-ugol-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var ot = typeof d[3] === 'number' ? d[3] : 0;
    var do_ = typeof d[4] === 'number' ? d[4] : 360;
    var o = (typeof d[4] === 'object' ? d[4] : d[5]) || {};
    var shag = o.shag || 1, R = o.razmer || 56; // служебная геометрия панели

    var box = document.createElement('div'); box.className = 'st-ugol';
    var cv = document.createElement('canvas');
    var val = document.createElement('span');
    val.title = 'точный ввод числом';
    box.appendChild(cv); box.appendChild(val); row.appendChild(box);
    var ctx = cv.getContext('2d');

    function risovat() {
      var dpr = window.devicePixelRatio || 1;
      cv.width = R * dpr; cv.height = R * dpr;
      cv.style.width = R + 'px'; cv.style.height = R + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = R / 2, r = R / 2 - 5, a = P[d[0]] * Math.PI / 180;
      ctx.clearRect(0, 0, R, R);
      // полный круг — бледной волосяной линией, чтобы форма читалась всегда
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c, c, r, 0, 6.284); ctx.stroke();
      // сектор допустимого: видно, куда угол ходить не может
      if (do_ - ot < 360) {
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c, r, -do_ * Math.PI / 180, -ot * Math.PI / 180);
        ctx.stroke();
      }
      // радиус от центра к рукоятке — сам угол
      var hx = c + Math.cos(-a) * r, hy = c + Math.sin(-a) * r;
      ctx.strokeStyle = api.accent(); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = api.accent();
      ctx.beginPath(); ctx.arc(c, c, 2.2, 0, 6.284); ctx.fill();       // ось
      ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 6.284); ctx.fill();      // рукоятка
      val.textContent = parseFloat(P[d[0]].toFixed(2));
    }
    function ot_myshi(e) {
      var b = cv.getBoundingClientRect();
      var a = Math.atan2(-(e.clientY - b.top - b.height / 2), e.clientX - b.left - b.width / 2);
      var gr = a * 180 / Math.PI;
      if (gr < 0) gr += 360;
      gr = Math.round(gr / shag) * shag;
      return Math.min(do_, Math.max(ot, gr));      // за сектор не выходим
    }
    var tyanem = false;
    cv.addEventListener('pointerdown', function (e) {
      tyanem = true; cv.setPointerCapture(e.pointerId);
      P[d[0]] = ot_myshi(e); risovat(); api.save();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!tyanem) return;
      P[d[0]] = ot_myshi(e); risovat(); api.save();
    });
    cv.addEventListener('pointerup', function () { tyanem = false; });
    // дабл-клик — откат этой ручки к исходному, как у слайдеров
    cv.addEventListener('dblclick', function () {
      if (api.defaults && api.defaults[d[0]] !== undefined) {
        P[d[0]] = api.defaults[d[0]];
        risovat(); api.save();
      }
    });
    // клик по числу — точный ввод (Enter/уход — принять, Esc — отмена)
    val.addEventListener('click', function () {
      var ked = document.createElement('input');
      ked.type = 'number'; ked.className = 'val-edit'; ked.step = 'any';
      ked.value = parseFloat(P[d[0]].toFixed(2));
      box.replaceChild(ked, val);
      ked.focus(); ked.select();
      var gotovo = false;
      function prinyat(ok) {
        if (gotovo) return; gotovo = true;
        box.replaceChild(val, ked);
        var v = parseFloat(ked.value);
        if (ok && !isNaN(v)) { P[d[0]] = Math.min(do_, Math.max(ot, v)); api.save(); }
        risovat();
      }
      ked.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') prinyat(true);
        else if (ev.key === 'Escape') prinyat(false);
      });
      ked.addEventListener('blur', function () { prinyat(true); });
    });
    api.repaints.push(risovat);
    api.controls[d[0]] = risovat;
    setTimeout(risovat, 0);
  });
})();
