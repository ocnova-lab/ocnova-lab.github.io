/* Градиент — палитра формулой вместо списка цветов.
   Косинусный градиент Иньиго Килеза (iquilezles.org/articles/palettes):

     цвет(t) = A + B · cos( 2π · (C·t + D) )

   где A — середина, B — размах, C — частота, D — фаза; каждое — вектор RGB.
   Родственные оттенки получаются по построению: шкала непрерывна, соседние
   значения не разъезжаются, любое число ступеней снимается с одной кривой.
   Палитра перестаёт быть перечнем и становится законом с ручками — то,
   чего свод требует от всего остального. Списочная palitra остаётся там,
   где цвета названы поимённо (бумага, краска, акцент): это два инструмента.

   Двенадцать чисел никто крутить не будет: вектора дают пресеты Килеза,
   четыре ручки правят их скалярами — середина и размах множатся, частота
   множится, сдвиг прибавляется к фазе.

   Панель и стенд считают ОДНУ формулу: вычислитель отдан наружу как
   StendPanel.gradient(z) → функция t(0…1) → [r, g, b] (0…1).

   Объявление:  ['pal', 'Семейство оттенков', 'gradient']
   Значение:    [пресет, середина, размах, частота, сдвиг]                  */
(function () {
  var STIL = '.st-grad{width:100%;margin-top:5px}' +
    '.st-grad-cv{width:100%;height:22px;display:block;border-radius:6px;' +
    'border:0.5px solid var(--st-hairline)}' +
    '.st-grad-row{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:11px;' +
    'color:var(--st-text-2)}' +
    '.st-grad-row b{min-width:8ch;font-weight:400}' +
    '.st-grad-row input{flex:1;accent-color:var(--st-accent);height:14px}' +
    '.st-grad-row span{min-width:4ch;text-align:right;font-variant-numeric:tabular-nums}' +
    '.row:has(>.st-grad){flex-wrap:wrap}';

  // Семь канонических семейств Килеза; имена свои, по тому, что видно.
  var PRESETY = [
    ['радуга', [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.00, 0.33, 0.67]],
    ['закат',  [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.00, 0.10, 0.20]],
    ['песок',  [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.30, 0.20, 0.20]],
    ['луг',    [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 0.5], [0.80, 0.90, 0.30]],
    ['медь',   [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 0.7, 0.4], [0.00, 0.15, 0.20]],
    ['вода',   [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [2, 1.0, 0.0], [0.50, 0.20, 0.25]],
    ['глина',  [0.8, 0.5, 0.4], [0.2, 0.4, 0.2], [2, 1.0, 1.0], [0.00, 0.25, 0.25]],
  ];
  var TAU = Math.PI * 2;

  function vychislitel(z) {
    var pr = PRESETY[Math.max(0, Math.min(PRESETY.length - 1, Math.round(z[0])))] || PRESETY[0];
    var A = pr[1], B = pr[2], C = pr[3], D = pr[4];
    var a = z[1], b = z[2], c = z[3], d = z[4];
    return function (t) {
      var out = [0, 0, 0];
      for (var i = 0; i < 3; i++) {
        out[i] = Math.max(0, Math.min(1,
          A[i] * a + B[i] * b * Math.cos(TAU * (C[i] * c * t + D[i] + d))));
      }
      return out;
    };
  }
  StendPanel.gradient = vychislitel;

  StendPanel.tip('gradient', function (row, d, P, api) {
    if (!document.getElementById('st-grad-css')) {
      var st = document.createElement('style'); st.id = 'st-grad-css';
      st.textContent = STIL; document.head.appendChild(st);
    }
    if (!Array.isArray(P[d[0]])) P[d[0]] = [0, 1, 1, 1, 0];

    // селект пресета — в строке, рядом с подписью
    var sel = document.createElement('select');
    PRESETY.forEach(function (pr, i) {
      var opt = document.createElement('option');
      opt.value = i; opt.textContent = pr[0];
      sel.appendChild(opt);
    });
    row.appendChild(sel);

    var box = document.createElement('div'); box.className = 'st-grad';
    var cv = document.createElement('canvas'); cv.className = 'st-grad-cv';
    box.appendChild(cv);

    var polzunki = [];
    // ручки — скаляры поверх векторов пресета
    [['Середина', 1, 0, 1.5, 0.05], ['Размах', 2, 0, 1.5, 0.05],
     ['Частота', 3, 0.25, 3, 0.05], ['Сдвиг', 4, 0, 1, 0.01]].forEach(function (r) {
      var rw = document.createElement('div'); rw.className = 'st-grad-row';
      var lb = document.createElement('b'); lb.textContent = r[0];
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = r[2]; inp.max = r[3]; inp.step = r[4];
      inp.value = P[d[0]][r[1]];
      var val = document.createElement('span'); val.textContent = P[d[0]][r[1]];
      inp.addEventListener('input', function () {
        var z = P[d[0]].slice();
        z[r[1]] = +inp.value;
        P[d[0]] = z;
        risuj(); api.save();
      });
      polzunki.push(function () {
        inp.value = P[d[0]][r[1]];
        val.textContent = parseFloat((+P[d[0]][r[1]]).toFixed(2));
      });
      rw.appendChild(lb); rw.appendChild(inp); rw.appendChild(val);
      box.appendChild(rw);
    });
    row.appendChild(box);

    sel.addEventListener('input', function () {
      var z = P[d[0]].slice();
      z[0] = +sel.value;
      P[d[0]] = z;
      risuj(); api.save();
    });

    function risuj() {
      var w = cv.clientWidth || 280, h = 22;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr; cv.height = h * dpr;
      var ctx = cv.getContext('2d');
      var f = vychislitel(P[d[0]]);
      for (var x = 0; x < cv.width; x++) {
        var c = f(x / (cv.width - 1));
        ctx.fillStyle = 'rgb(' + Math.round(c[0] * 255) + ',' +
          Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
        ctx.fillRect(x, 0, 1, cv.height);
      }
      sel.value = Math.round(P[d[0]][0]);
      polzunki.forEach(function (f2) { f2(); });
    }
    api.controls[d[0]] = risuj;
    api.repaints.push(risuj);
    requestAnimationFrame(risuj);
  });
})();
