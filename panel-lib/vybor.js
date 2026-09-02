/* © Сергей Гуров, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Выбор с превью — вариант показывается по наведению, до нажатия.
   Снят с tweakpane-plugin-preview-select (cosmicshelter, 2024). Там превью —
   картинка по URL; здесь добавлен второй режим: превью рисуется функцией стенда,
   поэтому годится для композиций и сеток, у которых картинки нет.
   Родня квадратному превью из стенда «Сетка» — приём подтверждён с двух сторон.

   Суть: сравнить варианты, ничего не выбирая. Селект заставляет выбрать, чтобы
   увидеть, и вернуться, если не подошло; каждая проверка стоит двух правок.

   Объявление:
     ['kompoziciya', 'Композиция', 'vybor', [['A', 'A'], ['B', 'B']], {
        risovat: function (ctx, w, h, znachenie) { … },   // либо
        src: function (znachenie) { return '/img/' + znachenie + '.jpg'; },
        vysota: 60 }]                                                            */
(function () {
  var STIL = '.st-vybor{width:100%;margin-top:5px}' +
    '.st-vy-pole{position:relative;width:100%;border-radius:6px;overflow:hidden;' +
    'background:var(--st-card);border:0.5px solid var(--st-hairline)}' +
    '.st-vy-pole canvas,.st-vy-pole img{display:block;width:100%;height:100%;object-fit:cover}' +
    '.st-vy-metka{position:absolute;left:6px;bottom:5px;font:10px/1 var(--st-font);' +
    'color:#fff;background:rgba(0,0,0,.55);padding:3px 6px;border-radius:4px;pointer-events:none}' +
    '.st-vy-spisok{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px}' +
    '.st-vy-spisok button{all:unset;padding:3px 8px;font:11px/1 var(--st-font);cursor:pointer;' +
    'border-radius:5px;background:var(--st-card);border:0.5px solid var(--st-hairline);' +
    'color:var(--st-text-2);transition:background .12s,color .12s}' +
    '.st-vy-spisok button:hover{color:var(--st-text);background:var(--st-border)}' +
    '.st-vy-spisok button[aria-checked="true"]{background:var(--st-accent);color:#fff;border-color:transparent}' +
    '.row:has(>.st-vybor){flex-wrap:wrap}';

  StendPanel.tip('vybor', function (row, d, P, api) {
    if (!document.getElementById('st-vybor-css')) {
      var s = document.createElement('style'); s.id = 'st-vybor-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var varianty = d[3] || [], o = d[4] || {};
    var VYS = o.vysota || 58;

    var box = document.createElement('div'); box.className = 'st-vybor';
    var pole = document.createElement('div'); pole.className = 'st-vy-pole';
    pole.style.height = VYS + 'px';
    var metka = document.createElement('div'); metka.className = 'st-vy-metka';
    var cv = null, img = null;
    if (o.risovat) { cv = document.createElement('canvas'); pole.appendChild(cv); }
    else { img = document.createElement('img'); img.alt = ''; pole.appendChild(img); }
    pole.appendChild(metka);
    var spisok = document.createElement('div'); spisok.className = 'st-vy-spisok';
    box.appendChild(pole); box.appendChild(spisok); row.appendChild(box);

    function pokazat(znach) {
      var v = varianty.filter(function (x) { return x[0] === znach; })[0];
      metka.textContent = v ? v[1] : znach;
      if (cv) {
        var dpr = window.devicePixelRatio || 1, w = pole.clientWidth || 280;
        cv.width = w * dpr; cv.height = VYS * dpr;
        cv.style.height = VYS + 'px';
        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, VYS);
        o.risovat(ctx, w, VYS, znach, api.accent());
      } else if (img && o.src) {
        img.src = o.src(znach);
      }
    }
    var knopki = [];
    varianty.forEach(function (v) {
      var b = document.createElement('button');
      b.textContent = v[1];
      b.setAttribute('aria-checked', String(P[d[0]] === v[0]));
      // наведение показывает, нажатие выбирает: посмотреть можно, не меняя стенд
      b.addEventListener('pointerenter', function () { pokazat(v[0]); });
      b.addEventListener('pointerleave', function () { pokazat(P[d[0]]); });
      b.addEventListener('click', function () {
        P[d[0]] = v[0];
        knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === v[0])); });
        pokazat(v[0]); api.save();
      });
      knopki.push([b, v[0]]); spisok.appendChild(b);
    });
    api.controls[d[0]] = function () {
      knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === P[d[0]])); });
      pokazat(P[d[0]]);
    };
    api.repaints.push(function () { pokazat(P[d[0]]); });
    window.addEventListener('resize', function () { pokazat(P[d[0]]); });
    setTimeout(function () { pokazat(P[d[0]]); }, 0);
  });
})();
