/* Угол — кольцо вместо дорожки: направление видно, а не вычисляется из числа.
   Снят с Tweakpane camerakit (cameraring, cocopon) и euler-режима
   @0b5vr/tweakpane-plugin-rotation. Трёхмерный гизмо не переносил: в стендах
   углы плоские — завал оси, наклон кольца, разворот рамки.

   Слайдер под угол врёт формой: он прямой, а величина круговая, и «85°» на
   дорожке ничем не отличается от «85 чего угодно». Кольцо показывает угол углом.

   Объявление:  ['ugol', 'Угол, °', 'ugol', 45, 90]        — сектор допустимого
                ['ugol', 'Поворот, °', 'ugol', 0, 360, { shag: 5 }]
   Значение:    число в градусах                                                */
(function () {
  var STIL = '.st-ugol{display:flex;align-items:center;gap:9px;margin-left:auto}' +
    '.st-ugol canvas{display:block;cursor:grab;touch-action:none}' +
    '.st-ugol canvas:active{cursor:grabbing}' +
    '.st-ugol span{min-width:4ch;text-align:right;color:var(--st-text-2);' +
    'font-variant-numeric:tabular-nums}';

  StendPanel.tip('ugol', function (row, d, P, api) {
    if (!document.getElementById('st-ugol-css')) {
      var s = document.createElement('style'); s.id = 'st-ugol-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var ot = typeof d[3] === 'number' ? d[3] : 0;
    var do_ = typeof d[4] === 'number' ? d[4] : 360;
    var o = (typeof d[4] === 'object' ? d[4] : d[5]) || {};
    var shag = o.shag || 1, R = o.razmer || 30;

    var box = document.createElement('div'); box.className = 'st-ugol';
    var cv = document.createElement('canvas');
    var val = document.createElement('span');
    box.appendChild(cv); box.appendChild(val); row.appendChild(box);
    var ctx = cv.getContext('2d');

    function risovat() {
      var dpr = window.devicePixelRatio || 1;
      cv.width = R * dpr; cv.height = R * dpr;
      cv.style.width = R + 'px'; cv.style.height = R + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = R / 2, r = R / 2 - 3, a = P[d[0]] * Math.PI / 180;
      ctx.clearRect(0, 0, R, R);
      // сектор допустимого: видно, куда угол ходить не может
      if (do_ - ot < 360) {
        ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c, r, -do_ * Math.PI / 180, -ot * Math.PI / 180);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c, c, r, 0, 6.284); ctx.stroke();
      }
      ctx.strokeStyle = api.accent(); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(-a) * r, c + Math.sin(-a) * r); ctx.stroke();
      ctx.fillStyle = api.accent();
      ctx.beginPath(); ctx.arc(c + Math.cos(-a) * r, c + Math.sin(-a) * r, 2.6, 0, 6.284); ctx.fill();
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
    api.repaints.push(risovat);
    api.controls[d[0]] = risovat;
    setTimeout(risovat, 0);
  });
})();
