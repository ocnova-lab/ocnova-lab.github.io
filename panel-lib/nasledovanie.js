/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Наследование — сквозной закон и отступление от него в одной строке.
   Приём снят со стенда индексального контента (Копинов, 2026-08): общий стиль
   задаёт норму, отдельный блок держит своё исключение, пустое поле означает
   «взять сверху».

   Лендинг и лонгрид верстаются этажами. Кегль основного текста один на всю
   страницу, но третий этаж иногда просит свой. Ручка на каждый этаж ломает
   закон — правило перестаёт существовать, остаются двадцать частных чисел.
   Одна ручка на всех не даёт исключения. Наследование держит обе руки:
   значение живёт наверху, этаж может его перебить, точка справа говорит,
   стоит ли здесь закон или отступление, и возвращает к закону нажатием.

   Объявление:  ['keglTeksta', 'Кегль', 'nasledovanie', 12, 48, 1]
                ['fon', 'Фон', 'nasledovanie', 'color']
                ['shrift', 'Шрифт', 'nasledovanie', 'vybor', 'garnitura']
                ['ves', 'Вес', 'nasledovanie', 'vybor', [['400','обычный'], …]]
                ('garnitura' берёт список у органа гарнитуры — алфавит свода
                плюс личный набор; недоступные на машине помечаются)
   Значения:    P.keglTeksta                        — общий закон
                P.otkloneniya['etazh-2'].keglTeksta — отступление этажа

   Адрес правимого этажа держит орган 'inspektor' в ключе P.aktivnyi.
   Пустой адрес — правится сам закон, точка наследования спрятана.
   Без инспектора орган работает как обычный слайдер: править нечему, кроме
   закона.

   Стенд читает значение этажа:
     StendPanel.znachenie(P, 'keglTeksta', 'etazh-2')
     StendPanel.otkloneniya(P, 'etazh-2')  → ['keglTeksta']                 */
(function () {
  var GNEZDO = 'otkloneniya'; // где лежат отступления
  var ADRES = 'aktivnyi';     // где лежит id правимого этажа

  var STIL = '.st-nasl{display:flex;align-items:center;gap:8px;margin-left:auto}' +
    '.st-nasl .val{min-width:38px}' +
    '.st-nasl .val[data-nasleduet="1"]{opacity:.45}' +
    '.st-nasl-tochka{all:unset;flex:none;box-sizing:border-box;width:11px;height:11px;' +
    'border-radius:50%;cursor:pointer;border:1.5px solid var(--st-track);' +
    'transition:background .12s,border-color .12s}' +
    '.st-nasl-tochka:hover{border-color:var(--st-text-2)}' +
    '.st-nasl-tochka[data-svoyo="1"]{background:var(--st-accent);border-color:transparent}' +
    '.st-nasl-tochka[hidden]{display:none!important}' +
    '.st-theme-nothing .st-nasl-tochka{border-radius:0}';

  function vstavitStil() {
    if (document.getElementById('st-nasl-css')) return;
    var s = document.createElement('style'); s.id = 'st-nasl-css';
    s.textContent = STIL; document.head.appendChild(s);
  }

  function nastroyki(o) {
    o = o || {};
    return { gnezdo: o.gnezdo || GNEZDO, adres: o.adres || ADRES, mul: o.mul || 1 };
  }

  // Пустой адрес — правится закон. Иначе правится этаж с этим id.
  function adres(P, n) { return P[n.adres] || ''; }

  function svoyo(P, n, id, klyuch) {
    var g = P[n.gnezdo];
    return Boolean(id && g && g[id] && g[id][klyuch] !== undefined);
  }

  function gnezdoEtazha(P, n, id) {
    if (!P[n.gnezdo] || typeof P[n.gnezdo] !== 'object') P[n.gnezdo] = {};
    if (!P[n.gnezdo][id]) P[n.gnezdo][id] = {};
    return P[n.gnezdo][id];
  }

  function vernut(P, n, id, klyuch) {
    var g = P[n.gnezdo];
    if (g && g[id]) delete g[id][klyuch];
  }

  // ── чтение стендом ───────────────────────────────────────────────
  StendPanel.znachenie = function (P, klyuch, id, opts) {
    var n = nastroyki(opts);
    return svoyo(P, n, id, klyuch) ? P[n.gnezdo][id][klyuch] : P[klyuch];
  };
  StendPanel.otkloneniya = function (P, id, opts) {
    var n = nastroyki(opts);
    var g = P[n.gnezdo] && P[n.gnezdo][id];
    return g ? Object.keys(g) : [];
  };
  StendPanel.vernutKZakonu = function (P, id, klyuch, opts) {
    var n = nastroyki(opts);
    if (klyuch) vernut(P, n, id, klyuch);
    else if (P[n.gnezdo]) delete P[n.gnezdo][id];
  };

  StendPanel.tip('nasledovanie', function (row, d, P, api) {
    vstavitStil();
    var klyuch = d[0];
    var cvet = d[3] === 'color';
    var vybor = d[3] === 'vybor';
    var n = nastroyki(cvet ? d[4] : vybor ? d[5] : d[6]);
    var lo = cvet || vybor ? 0 : Number(d[3]);
    var hi = cvet || vybor ? 1 : Number(d[4]);

    var box = document.createElement('div'); box.className = 'st-nasl';
    var val = null;
    var inp;
    if (vybor) {
      /* Выбор из закрытого списка — шрифт этажа, вес, начертание.
         'garnitura' вместо списка берёт полный список у органа гарнитуры;
         недоступный на машине шрифт честно помечается — молчаливая
         подмена запасным хуже некрасивой подписи. */
      inp = document.createElement('select');
      var spisok = d[4] === 'garnitura' && StendPanel.garnituraSpisok
        ? StendPanel.garnituraSpisok() : (d[4] || []);
      spisok.forEach(function (g) {
        var imya = Array.isArray(g) ? g[0] : g;
        var opt = document.createElement('option');
        opt.value = imya;
        var zdes = d[4] !== 'garnitura' || !StendPanel.garnituraDostupna ||
                   StendPanel.garnituraDostupna(imya);
        opt.textContent = zdes ? imya : imya + ' — нет на машине';
        inp.appendChild(opt);
      });
    } else if (cvet) {
      inp = document.createElement('input');
      inp.type = 'color'; inp.className = 'st-color';
    } else {
      inp = document.createElement('input');
      inp.type = 'range'; inp.min = lo; inp.max = hi; inp.step = d[5];
      val = document.createElement('span'); val.className = 'val';
    }
    var tochka = document.createElement('button');
    tochka.className = 'st-nasl-tochka'; tochka.type = 'button';

    /* Г9: НИТКА — БЛОК ЯДРА (ход 64). Орган рисовал свою и красил её
       сокращённым `background`, а оно затирает трёхпиксельную дорожку из
       panel.css: градиент заливал всю высоту — толстая полоса старого
       образца. Двадцать таких стояло на этажном стенде (снимки Сергея
       04.09). Точный ввод у наследования живёт на самом числе — поля на
       этаже имени у органа нет, — и блок разводит ввод с тягой ходом руки. */
    var nb = (cvet || vybor) ? null : StendPanel.nitkaBlok({ inp: inp, val: val });
    /* Г9: ЧИСЛО НА ЭТАЖЕ ИМЕНИ — второй блок ядра (ход 65, слово Сергея).
       Точный ввод жил кликом по числу в пилюле — два дела на одной цели.
       Теперь у него своё место, как у строк ядра: показатель стоит всегда,
       клик поднимает плашку с полем. Границы и шаг — те же, что у нитки;
       пишем через тот же `zapisat`, что и тяга. */
    var cb = nb ? StendPanel.chisloBlok({
      imya: d[1], min: lo, max: hi, shag: d[5],
      znachenie: function () { return parseFloat(inp.value); },
      postavit: function (v) { zapisat(v / n.mul); },
      tekst: function () { return String(parseFloat((+inp.value).toFixed(4))); }
    }) : null;
    function zalivka() { if (nb) nb.pokrasit(); }

    function narisovat() {
      var id = adres(P, n);
      var est = svoyo(P, n, id, klyuch);
      var v = est ? P[n.gnezdo][id][klyuch] : P[klyuch];
      if (vybor) {
        inp.value = v;
        inp.style.opacity = id && !est ? '.45' : '1';
      } else if (cvet) {
        inp.value = v;
        inp.style.opacity = id && !est ? '.45' : '1';
      } else {
        inp.value = v * n.mul;
        val.dataset.nasleduet = id && !est ? '1' : '0';
        if (nb) nb.obnovit();
        if (cb) cb.obnovit();
      }
      // Точка живёт только на этаже: у самого закона наследовать не от кого.
      // Место под неё занято всегда — вертикаль чисел не рвётся (рифма).
      tochka.style.visibility = id ? 'visible' : 'hidden';
      tochka.hidden = false;
      tochka.dataset.svoyo = est ? '1' : '0';
      tochka.title = est ? 'своё значение этажа — вернуть закон' : 'наследует закон';
    }

    // Правка на этаже заводит отступление сама: отдельной кнопки «сделать
    // своим» нет, потому что тронуть ручку и значит отступить.
    function zapisat(v) {
      var id = adres(P, n);
      if (id) gnezdoEtazha(P, n, id)[klyuch] = v;
      else P[klyuch] = v;
      narisovat();
      api.save();
    }

    inp.addEventListener('input', function () {
      zapisat(cvet || vybor ? inp.value : parseFloat(inp.value) / n.mul);
    });

    // Дабл-клик: на этаже — вернуть закон, на законе — вернуть исходное.
    inp.addEventListener('dblclick', function () {
      var id = adres(P, n);
      if (id) vernut(P, n, id, klyuch);
      else if (api.defaults[klyuch] !== undefined) P[klyuch] = api.defaults[klyuch];
      narisovat(); api.save();
    });

    tochka.addEventListener('click', function () {
      var id = adres(P, n);
      if (!id || !svoyo(P, n, id, klyuch)) return;
      vernut(P, n, id, klyuch);
      narisovat(); api.save();
    });

    api.controls[klyuch] = narisovat;
    api.repaints.push(zalivka);
    box.appendChild(nb ? nb.obl : inp);
    if (val && !nb) box.appendChild(val);
    box.appendChild(tochka);
    if (nb) {
      row.classList.add('dva');           // нитка наследования — вторым этажом
      box.style.marginLeft = '0'; box.style.flex = '1';
      nb.obl.style.flex = '1';
      /* Этаж имени: подпись ядра и число одной строкой — тот же блок `.st-imya`,
         что у строк ядра, чтобы правый край чисел стоял на общей вертикали. */
      var lab = row.querySelector('label');
      var imya = document.createElement('div'); imya.className = 'st-imya';
      if (lab) { row.removeChild(lab); imya.appendChild(lab); }
      imya.appendChild(cb.obl);
      row.insertBefore(imya, row.firstChild);
      // дабл-клик по пилюле — то же, что по нитке: вернуть закон
      nb.pil.addEventListener('dblclick', function (ev) {
        inp.dispatchEvent(new MouseEvent('dblclick', { bubbles: false }));
        ev.stopPropagation();
      });
    }
    row.appendChild(box);
    narisovat();
  });
})();
