/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Аналоговая погоня — плавный скролл: ввод двигает цель, лента её догоняет.
   Снято с Lenis (darkroomengineering, 15.5k★) и Locomotive Scroll v5
   (locomotivemtl, 8.8k★ — у них v5 переписан поверх Lenis). Обёртку с
   parallax-детекцией не брал: у нас своя раскладка. Взято три вещи, которые
   в стендах делались на глаз:

   1. НОРМАЛИЗАЦИЯ ВВОДА. Колесо отдаёт не только пиксели: deltaMode 1 — строки,
      2 — экраны. Firefox и Windows шлют строки, и стенд, считающий их пикселями,
      едет в десятки раз медленнее. Проверено 2026-08-25: из девяти стендов это
      учитывали только diagonal и longread.
   2. ЗАТУХАНИЕ, НЕ ЗАВИСЯЩЕЕ ОТ ЧАСТОТЫ КАДРОВ:
        damp(x, y, λ, dt) = x + (y - x) * (1 - exp(-λ·dt))
      Наивное `x += (y - x) * 0.1` каждый кадр даёт разную скорость на 60 и 120 Гц.
   3. ДВА РЕЖИМА ДВИЖЕНИЯ. Погоня (тянется за вводом бесконечно) и проезд
      (доводка до названной точки за время по кривой). Второй нужен, чтобы
      «перейти к фрагменту» не выглядело прыжком.

   Пуск:
     var S = StendSkroll.pusk({
       params: P,                       // ручки панели
       predel: function () { return lenta.scrollHeight - innerHeight; },
       koltso: false,                   // true — лента зациклена, пределов нет
       na: function (poz, skorost) { … },   // куда приехали и с какой скоростью
     });
     S.proezd(1200);                    // доводка до точки
     S.stoyat();  S.pusk();             // пауза и возврат управления

   Ручки для панели: StendSkroll.RUCHKI (вставляются в defs как есть).      */
(function () {
  var STROKA = 100 / 6;                 // высота строки в пикселях, как в Lenis

  function damp(x, y, lambda, dt) {
    return x + (y - x) * (1 - Math.exp(-lambda * dt));
  }

  // Ввод в пикселях, каким бы режимом браузер его ни прислал
  function vvod(e, razmer) {
    var k = e.deltaMode === 1 ? STROKA : e.deltaMode === 2 ? razmer : 1;
    return { x: e.deltaX * k, y: e.deltaY * k };
  }

  var StendSkroll = {
    damp: damp,
    vvod: vvod,
    RUCHKI: [
      ['h', 'Скролл'],
      ['koleso', 'Колесо, %', 20, 300, 5],
      ['palec', 'Палец, %', 50, 400, 5],
      ['inercia', 'Инерция, %', 0, 97, 1],
      ['brosok', 'Бросок пальца, %', 0, 100, 5],
      ['proezd', 'Проезд, мс', 0, 2000, 10],
      ['proezdEase', 'Кривая проезда', 'ease'],
    ],
    ZNACHENIYA: {                        // значения по умолчанию под эти ручки
      koleso: 100, palec: 150, inercia: 88, brosok: 60,
      proezd: 700, proezdEase: 'плавный', proezdBez: [0.65, 0, 0.35, 1],
    },

    pusk: function (o) {
      var P = o.params || {};
      var mesto = 0, cel = 0, skorost = 0, stoim = false;
      var proezd = null;                 // {ot, do, nachalo, dlit}
      var poslednii = 0, ruka = null, hvost = [];

      function predel() {
        if (o.koltso) return Infinity;
        return typeof o.predel === 'function' ? o.predel() : (o.predel || 0);
      }
      function zazhat(v) {
        if (o.koltso) return v;
        return Math.max(0, Math.min(predel(), v));
      }
      function dvinut(d) {
        proezd = null;                   // живой ввод отменяет доводку
        cel = zazhat(cel + d);
      }

      // ── ввод: колесо, палец, клавиши ──
      addEventListener('wheel', function (e) {
        if (stoim || (o.gde && !o.gde(e))) return;
        e.preventDefault();
        var v = vvod(e, innerHeight);
        var d = Math.abs(v.x) > Math.abs(v.y) ? v.x : v.y;
        dvinut(d * (P.koleso == null ? 100 : P.koleso) / 100);
      }, { passive: false });

      addEventListener('pointerdown', function (e) {
        if (stoim || e.pointerType === 'mouse') return;
        ruka = { y: e.clientY, x: e.clientX, t: performance.now() };
        hvost = [];
      });
      addEventListener('pointermove', function (e) {
        if (!ruka) return;
        var d = (Math.abs(e.clientX - ruka.x) > Math.abs(e.clientY - ruka.y)
                 ? ruka.x - e.clientX : ruka.y - e.clientY);
        dvinut(d * (P.palec == null ? 150 : P.palec) / 100);
        hvost.push({ d: d, t: performance.now() });
        if (hvost.length > 6) hvost.shift();
        ruka = { y: e.clientY, x: e.clientX, t: performance.now() };
      });
      addEventListener('pointerup', function () {
        if (!ruka) return;
        // бросок: палец отпущен на ходу — лента продолжает по последней скорости
        var t = performance.now(), put = 0, vremya = 0;
        hvost.forEach(function (h) { if (t - h.t < 120) { put += h.d; vremya = t - h.t; } });
        if (vremya > 0) {
          var v = put / vremya;          // пикселей в миллисекунду
          dvinut(v * 180 * (P.brosok == null ? 60 : P.brosok) / 100);
        }
        ruka = null;
      });

      addEventListener('keydown', function (e) {
        if (stoim || /input|textarea|select/i.test((e.target.tagName || ''))) return;
        var h = innerHeight;
        var shag = { ArrowDown: h * .12, ArrowUp: -h * .12, PageDown: h * .9,
                     PageUp: -h * .9, ' ': h * .9, Home: -1e9, End: 1e9 }[e.key];
        if (shag == null) return;
        e.preventDefault();
        if (Math.abs(shag) > 1e8) { S.proezd(shag > 0 ? predel() : 0); return; }
        dvinut(shag);
      });

      // ── кадр: догоняем цель либо едем по кривой ──
      function kadr(t) {
        var dt = Math.min(0.064, (t - poslednii) / 1000) || 0.016;
        poslednii = t;
        var bylo = mesto;

        if (proezd) {
          var d = (t - proezd.nachalo) / (proezd.dlit || 1);
          if (d >= 1) { mesto = cel = proezd.do; proezd = null; }
          else {
            var e = o.izing ? o.izing(d) : (d < .5 ? 4 * d * d * d
                                                  : 1 - Math.pow(-2 * d + 2, 3) / 2);
            mesto = proezd.ot + (proezd.do - proezd.ot) * e;
            cel = mesto;
          }
        } else {
          // инерция ручкой 0…97 % переводится в λ: 0 — мгновенно, 97 — вязко
          var in_ = (P.inercia == null ? 88 : P.inercia) / 100;
          var lambda = in_ >= 0.999 ? 0.4 : -Math.log(Math.max(1e-4, 1 - in_)) * 12;
          mesto = damp(mesto, cel, Math.max(0.4, lambda), dt);
          // прилипание: у цели дрожать нечем
          if (Math.abs(cel - mesto) < 0.05) mesto = cel;
        }

        skorost = (mesto - bylo) / (dt || 1);
        if (o.na) o.na(mesto, skorost);
        requestAnimationFrame(kadr);
      }
      requestAnimationFrame(kadr);

      var S = {
        gde: function () { return mesto; },
        cel: function () { return cel; },
        skorost: function () { return skorost; },
        postavit: function (v) { mesto = cel = zazhat(v); proezd = null; },
        dvinut: dvinut,
        proezd: function (kuda, ms, izing) {
          var dlit = ms == null ? (P.proezd == null ? 700 : P.proezd) : ms;
          if (izing) o.izing = izing;
          if (!dlit) { S.postavit(kuda); return; }
          proezd = { ot: mesto, do: zazhat(kuda), nachalo: performance.now(), dlit: dlit };
        },
        stoyat: function () { stoim = true; },
        idti: function () { stoim = false; },
      };
      return S;
    },
  };
  window.StendSkroll = StendSkroll;
})();
