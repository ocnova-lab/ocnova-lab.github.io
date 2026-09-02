/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* ────────────────────────────────────────────────────────────────────
   Панель стенда — единая логика (пара к /panel.css).

   Подключение в стенде:
     <link rel="stylesheet" href="/panel.css">
     <script src="/panel.js"></script>

   Вызов:
     StendPanel.build({
       storageKey: 'имя-стенда-params',  // где живут значения
       params: P,                        // живой объект параметров
       defaults: DEFAULTS,               // исходные значения
       defs: [                           // строки панели по порядку
         ['h', 'Секция'],                //   заголовок секции
         [key, 'Подпись', min, max, шаг],//   слайдер
         [key, 'Подпись', 'ease'],       //   изинг: селект + редактор безье
         [key, 'Подпись', 'color'],      //   цвет: квадрат-пипетка ('#rrggbb')
       ],
       desc: { key: 'описание...' },     // всплывающие подсказки
       eases: EASES,                     // словарь пресетов-изингов
       evalEase: fn(name, bez, t),       // вычислитель изинга слота
       bezApprox: { name: [x1,y1,x2,y2] } // безье-приближения пресетов
     });

   Для изинг-слота key вида fooEase рукоятки безье живут в params.fooBez.
   Темы: «Эпл» (по умолчанию) и «Нотхинг», переключатель в подвале панели,
   выбор хранится в localStorage 'stend-panel-theme' и общий для всех стендов.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  var THEME_KEY = 'stend-panel-theme';

  // Точный ввод числа — единые клавиши для всех полей панели и органов:
  // стрелки ±1, с Shift ±10 (как в Фигме), запятая читается как точка.
  function klavishiChisla(ked) {
    ked.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      ev.preventDefault();
      var v = parseFloat(String(ked.value).replace(',', '.')) || 0;
      var shag = ev.shiftKey ? 10 : 1;
      ked.value = parseFloat((v + (ev.key === 'ArrowUp' ? shag : -shag)).toFixed(4));
    });
  }
  function chislo(v) { return parseFloat(String(v).replace(',', '.')); }

  /* Математика в поле числа — снято с eval-number-expression из раздатки
     Михаила Матвеева: «700/2» → 350, «(3+1)*20» → 80, запятая как точка.
     Ведущий «+» — относительный ввод: «+50» прибавляет к текущему
     (поэтому «+50-20» прибавляет 30). Кривой ввод возвращает NaN —
     вызывающий решает, что делать с отказом. */
  function vyrazhenie(syroj, tekushchee) {
    var t = String(syroj).trim();
    if (!t) return NaN;
    var otnositelno = t.charAt(0) === '+';
    if (otnositelno) t = t.slice(1);
    t = t.replace(/,/g, '.');
    if (!/^[-+*/().\d\s]+$/.test(t)) return NaN;
    var poz = 0;
    function summa() {
      var v = proizvedenie();
      while (poz < t.length) {
        var z = t.charAt(poz);
        if (z === '+') { poz++; v += proizvedenie(); }
        else if (z === '-') { poz++; v -= proizvedenie(); }
        else break;
      }
      return v;
    }
    function proizvedenie() {
      var v = mnozhitel();
      while (poz < t.length) {
        var z = t.charAt(poz);
        if (z === '*') { poz++; v *= mnozhitel(); }
        else if (z === '/') { poz++; v /= mnozhitel(); }
        else break;
      }
      return v;
    }
    function mnozhitel() {
      while (t.charAt(poz) === ' ') poz++;
      var z = t.charAt(poz);
      if (z === '(') {
        poz++;
        var v = summa();
        if (t.charAt(poz) === ')') poz++;
        while (t.charAt(poz) === ' ') poz++;
        return v;
      }
      if (z === '-') { poz++; return -mnozhitel(); }
      var m = /^\d*\.?\d+/.exec(t.slice(poz));
      if (!m) return NaN;
      poz += m[0].length;
      while (t.charAt(poz) === ' ') poz++;
      return parseFloat(m[0]);
    }
    var itog = summa();
    if (poz < t.length || isNaN(itog) || !isFinite(itog)) return NaN;
    itog = otnositelno ? (tekushchee || 0) + itog : itog;
    return parseFloat(itog.toFixed(6));
  }
  // Реестр органов управления (библиотека /panel-lib): StendPanel.tip('имя', fn).
  // fn(row, d, P, api) строит строку панели; api = {save, host, bindTip, accent, repaints, controls}
  var TIPY = {};

  function build(o) {
    // ?reset=1 — аварийный сброс сохранённых настроек ещё до применения
    if (/[?&]reset/.test(location.search)) {
      try { localStorage.removeItem(o.storageKey); } catch (e) {}
      Object.assign(o.params, o.defaults);
      Object.keys(o.defaults).forEach(function (k) { // массивы и объекты — копиями:
        // otkloneniya стилей по умолчанию — объект; ссылка дала бы правку DEFAULTS
        if (Array.isArray(o.defaults[k])) o.params[k] = o.defaults[k].slice();
        else if (o.defaults[k] && typeof o.defaults[k] === 'object') {
          o.params[k] = JSON.parse(JSON.stringify(o.defaults[k]));
        }
      });
    }
    /* ОБЪЯВЛЕНИЕ вместо defs. Стенд может отдать не готовые строки панели, а
       объявление величин — что меряется и от чего. Границы, шаг, орган и
       единицу подставит таблица величин (/panel-lib/obyavlenie.js).

         zakon: [['h', 'Шрифт'], ['kegl', 'Кегль', 'кегль'],
                 ['btm', 'Кегль внизу', 'доля', { ot: 'кегль' }]]

       Механика живёт здесь, числа — в библиотеке: таблица ещё меняется от
       замера к замеру, и вшивать её в общий файл рано. Стенды на defs
       ничего не замечают — ветка включается только при наличии zakon. */
    if (o.zakon && !o.defs) {
      if (typeof StendPanel !== 'undefined' && StendPanel.izObyavleniya) {
        // mesta — словарь мест стенда: 'Строка': '.line'. Закон помечается
        // gde:'Строка' и попадает в карту StendPanel.karta.
        o.defs = StendPanel.izObyavleniya(o.zakon, o.mesta);
      } else {
        // Молча отдать пустую панель — худшее, что можно сделать: стенд
        // выглядит сломанным, а причина не названа.
        throw new Error('StendPanel: объявление (zakon) требует /panel-lib/obyavlenie.js');
      }
    }
    var P = o.params, DEFAULTS = o.defaults, DESC = o.desc || {};
    var EASES = o.eases || {};
    var evalEase = o.evalEase;
    var BEZ_APPROX = o.bezApprox || {};

    function save() {
      try { localStorage.setItem(o.storageKey, JSON.stringify(P)); } catch (e) {}
    }

    // Любая правка ручки проходит здесь: сохранение, уведомление стенда (o.onChange —
    // нужен DOM-стендам, canvas читает P каждый кадр сам) и событие для органов
    // вроде отката, которым нужно знать о правке, не зная, кто её сделал.
    var hozyaeva = {};   // хозяин фазы → чьи ручки он гасит; заполняется из карты
    var fazaKesh = {};   // последние виденные значения хозяев
    function izmenilos(key) {
      save();
      /* Фаза: повернулся хозяин — часть ручек умерла или ожила. Сверяются
         ВСЕ хозяева, не только key: пресет меняет пачку параметров разом,
         а izmenilos приходит с ключом самого пресета. Хозяев единицы —
         сверка дешевле пропущенной фазы. */
      var smena = false;
      for (var h in hozyaeva) {
        if (P[h] !== fazaKesh[h]) { smena = true; fazaKesh[h] = P[h]; }
      }
      if (smena) perestroitVid();
      if (typeof o.onChange === 'function') o.onChange(key, P);
      try {
        document.dispatchEvent(new CustomEvent('stend:izmenenie', {
          detail: { key: key, params: P, storageKey: o.storageKey },
        }));
      } catch (e) {}
    }

    // ── каркас: шестерёнка, панель, подсказка ──
    var gear = document.createElement('button');
    gear.className = 'st-gear';
    gear.title = 'настройки';
    gear.innerHTML =
      '<svg viewBox="0 0 17 17" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round">' +
      '<line x1="1.5" y1="3.5" x2="15.5" y2="3.5"/><circle cx="11" cy="3.5" r="2.1" fill="#141416"/>' +
      '<line x1="1.5" y1="8.5" x2="15.5" y2="8.5"/><circle cx="5.5" cy="8.5" r="2.1" fill="#141416"/>' +
      '<line x1="1.5" y1="13.5" x2="15.5" y2="13.5"/><circle cx="9" cy="13.5" r="2.1" fill="#141416"/>' +
      '</svg>';
    var panel = document.createElement('div');
    panel.className = 'st-panel';
    panel.hidden = true;

    /* ── ОКНО ПАНЕЛИ (правка приёмки 02.09) ───────────────────────────
       Панель закрывала собой куски макета — а клик по месту требует
       макет видеть. Теперь она окно: перенос за шапку, пропорции —
       системным уголком (правый нижний угол), дабл-клик по шапке
       возвращает на место. Привычка руки одна на все стенды —
       хранится глобально, как тема. На узком экране панель остаётся
       нижним листом, окна там нет. */
    var OKNO_KEY = 'stend-panel-okno';
    var uzkiy = function () { return window.innerWidth < 560; };
    function oknoPrivyazka() {
      // из прибитого низа — в свободный верх: до первого переноса панель
      // живёт как раньше, после — координатами окна
      if (panel.style.top) return;
      var r = panel.getBoundingClientRect();
      panel.style.top = r.top + 'px';
      panel.style.left = r.left + 'px';
      panel.style.bottom = 'auto';
    }
    function oknoSohranit() {
      try {
        localStorage.setItem(OKNO_KEY, JSON.stringify({
          left: panel.style.left, top: panel.style.top,
          w: panel.style.width, h: panel.style.height,
        }));
      } catch (e) {}
    }
    function oknoVernut() {
      panel.style.top = ''; panel.style.left = '';
      panel.style.bottom = ''; panel.style.width = ''; panel.style.height = '';
      try { localStorage.removeItem(OKNO_KEY); } catch (e) {}
    }
    (function oknoVosstanovit() {
      if (uzkiy()) return;
      var o2 = null;
      try { o2 = JSON.parse(localStorage.getItem(OKNO_KEY) || 'null'); } catch (e) {}
      if (!o2) return;
      if (o2.top) {
        // окно не должно восстановиться за кромкой экрана
        var t = Math.max(0, Math.min(parseFloat(o2.top) || 0, window.innerHeight - 80));
        var l = Math.max(0, Math.min(parseFloat(o2.left) || 0, window.innerWidth - 80));
        panel.style.top = t + 'px'; panel.style.left = l + 'px';
        panel.style.bottom = 'auto';
      }
      if (o2.w) panel.style.width = o2.w;
      if (o2.h) panel.style.height = o2.h;
    })();
    /* Пользовательский размер: системный уголок пишет inline width/height.
       Захват у правого нижнего угла переводит окно на верхнюю привязку —
       иначе прибитый низ рос бы вверх из-под курсора; отпускание руки
       сохраняет (ResizeObserver дублирует, но он спит там, где не гонятся
       кадры). */
    panel.addEventListener('pointerdown', function (e) {
      if (uzkiy()) return;
      var r = panel.getBoundingClientRect();
      if (e.clientX > r.right - 22 && e.clientY > r.bottom - 22) oknoPrivyazka();
    });
    panel.addEventListener('pointerup', function () {
      if (panel.style.width || panel.style.height) { oknoPrivyazka(); oknoSohranit(); }
    });
    if (window.ResizeObserver) {
      var roT = null;
      new ResizeObserver(function () {
        if (!panel.style.width && !panel.style.height) return;
        oknoPrivyazka();
        clearTimeout(roT); roT = setTimeout(oknoSohranit, 300);
      }).observe(panel);
    }
    var tip = document.createElement('div');
    tip.className = 'st-tip';
    document.body.appendChild(gear);
    document.body.appendChild(panel);
    document.body.appendChild(tip);

    function accent() {
      return (getComputedStyle(panel).getPropertyValue('--st-accent') || '#0A84FF').trim();
    }

    // ── тема: общая для всех стендов ──
    var theme = 'apple';
    try { theme = localStorage.getItem(THEME_KEY) || 'apple'; } catch (e) {}
    var tm = location.search.match(/[?&]theme=(\w+)/);
    if (tm) theme = tm[1]; // ?theme=nothing — быстрый просмотр темы
    var repaints = []; // что перекрасить при смене темы (заливки, кривые)
    function applyTheme(name) {
      theme = name;
      [gear, panel, tip].forEach(function (el) {
        el.classList.toggle('st-theme-nothing', name === 'nothing');
      });
      try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
      repaints.forEach(function (f) { f(); });
    }

    // ── подсказки: справа от панели, у своей строки ──
    function bindTip(el, key) {
      if (!DESC[key]) return;
      el.addEventListener('mouseenter', function () {
        tip.textContent = opisanie(key);
        tip.classList.add('show');
        var r = el.getBoundingClientRect();
        var pr = panel.getBoundingClientRect();
        tip.style.left = (pr.right + 8) + 'px';
        var top = r.top - 4;
        top = Math.max(8, Math.min(top, window.innerHeight - tip.offsetHeight - 8));
        tip.style.top = top + 'px';
      });
      el.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
    }

    // ── слайдер: заливка слева от шайбы цветом акцента ──
    function paintFill(inp) {
      var lo = parseFloat(inp.min), hi = parseFloat(inp.max);
      var p = (parseFloat(inp.value) - lo) / (hi - lo) * 100;
      inp.style.background =
        'linear-gradient(to right, ' + accent() + ' ' + p + '%, var(--st-track) ' + p + '%)';
    }

    // ── редактор кривой: график + две рукоятки безье ──
    var CRV_LO = -0.35, CRV_HI = 1.35;
    function buildCurveEditor(easeKey, bezKey, sel) {
      var cv = document.createElement('canvas');
      cv.className = 'curve';
      cv.width = 552; cv.height = 552; // квадрат — кривую удобно лепить
      function X(t) { return t * cv.width; }
      function Y(v) { return cv.height - (v - CRV_LO) / (CRV_HI - CRV_LO) * cv.height; }
      function redraw() {
        var g = cv.getContext('2d');
        var w = cv.width, h = cv.height;
        var b = P[bezKey];
        var custom = P[easeKey] === 'bezier';
        var ac = accent();
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#101012'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2;
        [0, 1].forEach(function (v) {
          g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(w, Y(v)); g.stroke();
        });
        // рычаги: от опор (0,0) и (1,1) к контрольным точкам
        g.strokeStyle = custom ? ac : 'rgba(255,255,255,.28)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(b[0]), Y(b[1])); g.stroke();
        g.beginPath(); g.moveTo(X(1), Y(1)); g.lineTo(X(b[2]), Y(b[3])); g.stroke();
        // сама кривая — то, что реально исполняет анимация
        g.strokeStyle = '#fff'; g.lineWidth = 3;
        g.beginPath();
        for (var x = 0; x <= w; x += 2) {
          var v = evalEase(P[easeKey], b, x / w);
          if (x === 0) g.moveTo(x, Y(v)); else g.lineTo(x, Y(v));
        }
        g.stroke();
        // контрольные точки с белым кольцом
        [[b[0], b[1]], [b[2], b[3]]].forEach(function (pt) {
          g.beginPath(); g.arc(X(pt[0]), Y(pt[1]), 9, 0, Math.PI * 2);
          g.fillStyle = custom ? ac : 'rgba(255,255,255,.45)'; g.fill();
          g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
        });
      }
      var dragPt = -1;
      function handleAt(e) {
        var r = cv.getBoundingClientRect();
        var b = P[bezKey];
        function d2(bx, by) {
          var hx = r.left + bx * r.width;
          var hy = r.top + (CRV_HI - by) / (CRV_HI - CRV_LO) * r.height;
          return (e.clientX - hx) * (e.clientX - hx) + (e.clientY - hy) * (e.clientY - hy);
        }
        return d2(b[0], b[1]) <= d2(b[2], b[3]) ? 0 : 1;
      }
      function applyDrag(e) {
        var r = cv.getBoundingClientRect();
        var tx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        var vy = Math.max(CRV_LO, Math.min(CRV_HI,
          CRV_HI - (e.clientY - r.top) / r.height * (CRV_HI - CRV_LO)));
        var b = P[bezKey].slice();
        b[dragPt * 2] = Math.round(tx * 100) / 100;
        b[dragPt * 2 + 1] = Math.round(vy * 100) / 100;
        P[bezKey] = b;
        if (P[easeKey] !== 'bezier') { P[easeKey] = 'bezier'; sel.value = 'bezier'; }
        redraw(); izmenilos(easeKey);
      }
      cv.addEventListener('pointerdown', function (e) {
        dragPt = handleAt(e);
        cv.setPointerCapture(e.pointerId);
        applyDrag(e);
        e.preventDefault();
      });
      cv.addEventListener('pointermove', function (e) { if (dragPt >= 0) applyDrag(e); });
      cv.addEventListener('pointerup', function () { dragPt = -1; });
      cv.addEventListener('pointercancel', function () { dragPt = -1; });
      return { cv: cv, redraw: redraw };
    }

    /* ── ЯЗЫК ПАНЕЛИ ──────────────────────────────────────────────────
       Панель говорит на языке читателя, а не стенда: у стенда язык ленты
       свой, у панели свой. Выбор общий на все стенды — он про человека,
       а не про страницу, поэтому и ключ хранения общий.

       Перевод приходит от стенда картой `en`: заголовок секции по своему
       русскому имени, ручка по ключу параметра, подсказка — картой
       `enDesc`. Чего в карте нет — остаётся по-русски: язык не должен
       уметь спрятать ручку. Собственные слова панели переведены здесь. */
    var LANG_KEY = 'stend-panel-lang';
    var lang = 'ru';
    try { if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en'; } catch (e) {}
    var SVOI = {
      'Панель': 'Panel', 'Тема': 'Theme', 'Эпл': 'Apple', 'Нотхинг': 'Nothing',
      'Скопировать параметры': 'Copy parameters', 'Скопировать правки': 'Copy edits',
      'Сбросить настройки': 'Reset',
      'скопировано: ': 'copied: ', ' ручек': ' knobs',
      'всё по умолчанию': 'all at defaults', 'Параметры:': 'Parameters:',
      'своя (безье)': 'custom (bezier)', 'линейный': 'linear',
      'разгон': 'ease-in', 'торможение': 'ease-out', 'плавный': 'ease-in-out',
      'квадрат': 'quad', 'Свернуть всё': 'Collapse all', 'Все законы': 'All laws',
      'Развернуть всё': 'Expand all', 'Язык панели': 'Panel language'
    };
    var EN = o.en || {}, ENDESC = o.enDesc || {};
    function T(klyuch, ru) {
      if (lang !== 'en') return ru;
      return EN[klyuch] || EN[ru] || SVOI[ru] || ru;
    }
    function opisanie(key) {
      return (lang === 'en' && ENDESC[key]) || DESC[key] || '';
    }
    var nadpisi = [];
    function nadpis(el, klyuch, ru) {
      el.textContent = T(klyuch, ru);
      nadpisi.push({ el: el, k: klyuch, ru: ru });
    }
    function smenitYazyk(v) {
      lang = v;
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      nadpisi.forEach(function (n) { n.el.textContent = T(n.k, n.ru); });
    }

    // ── секции-гармошки: заголовок кликом сворачивает карточку,
    // состояние помнится на стенд (localStorage) ──
    var FOLD_KEY = 'stend-panel-folds:' + o.storageKey;
    var folds = {};
    try { folds = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); } catch (e) {}
    function saveFolds() {
      try { localStorage.setItem(FOLD_KEY, JSON.stringify(folds)); } catch (e) {}
    }
    var sekcii = [];
    function addSection(title) {
      var h = document.createElement('h4');
      h.className = 'st-sec';
      nadpis(h, 'h:' + title, title);
      var card = document.createElement('div');
      card.className = 'card';
      panel.appendChild(h);
      panel.appendChild(card);
      function applyFold() {
        /* Секцию, спрятанную сужением (набор или место прячут заголовок),
           «Развернуть всё» не воскрешает: без заголовка карточка вернулась
           бы безымянной. Найдено ревизией 2026-09-01, жило с хода 5. */
        card.hidden = !!folds[title] || h.hidden;
        h.classList.toggle('st-closed', !!folds[title]);
      }
      h.addEventListener('click', function () {
        folds[title] = !folds[title];
        applyFold(); saveFolds();
      });
      applyFold();
      sekcii.push({ title: title, fold: applyFold, h: h, card: card });
      return card;
    }
    /* Свернуть всё разом: с десятком секций поштучное складывание — работа,
       а не удобство. */
    function svernutVse(zakryt) {
      sekcii.forEach(function (s) { folds[s.title] = zakryt; s.fold(); });
      saveFolds();
    }

    /* ── ВЕРХНЯЯ СТРОКА ПАНЕЛИ ────────────────────────────────────────
       Две вещи, которые относятся к панели целиком, а не к ручке: на каком
       языке она говорит и сколько её видно. Стоят сверху, потому что
       решаются до того, как читатель начал искать ручку. */
    var verh = document.createElement('div');
    verh.className = 'st-verh';
    var yaz = document.createElement('div');
    yaz.className = 'st-yaz';
    [['ru', 'RU'], ['en', 'EN']].forEach(function (y) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = y[1];
      b.className = 'st-yaz-b' + (lang === y[0] ? ' on' : '');
      b.addEventListener('click', function () {
        if (lang === y[0]) return;
        smenitYazyk(y[0]);
        [].forEach.call(yaz.children, function (x) {
          x.classList.toggle('on', x.textContent.toLowerCase() === lang);
        });
      });
      yaz.appendChild(b);
    });
    var sver = document.createElement('button');
    sver.type = 'button'; sver.className = 'st-sver';
    var vseZakryty = false;
    function metkaSver() {
      sver.textContent = T('panel:fold', vseZakryty ? 'Развернуть всё' : 'Свернуть всё');
    }
    nadpisi.push({ el: sver, k: 'panel:fold', ru: 'Свернуть всё' });
    sver.addEventListener('click', function () {
      vseZakryty = !vseZakryty;
      svernutVse(vseZakryty);
      nadpisi.forEach(function (n) {
        if (n.el === sver) n.ru = vseZakryty ? 'Развернуть всё' : 'Свернуть всё';
      });
      metkaSver();
    });
    verh.appendChild(yaz); verh.appendChild(sver);
    panel.appendChild(verh);
    metkaSver();

    /* Перенос: рука берёт за шапку (верхняя строка и строка состояния),
       кнопки остаются кнопками — захват только с порога хода в 4px.
       Дабл-клик по шапке возвращает окно на место по умолчанию. */
    function oknoTaskat(ruchka) {
      ruchka.style.cursor = 'grab';
      ruchka.addEventListener('pointerdown', function (e) {
        if (uzkiy()) return;
        if (e.target.closest('button, select, input')) return;
        var r0 = panel.getBoundingClientRect();
        var x0 = e.clientX, y0 = e.clientY, vzyal = false;
        function hod(ev) {
          var dx = ev.clientX - x0, dy = ev.clientY - y0;
          if (!vzyal && Math.abs(dx) + Math.abs(dy) < 4) return;
          if (!vzyal) { vzyal = true; oknoPrivyazka(); }
          panel.style.left = Math.max(0, Math.min(r0.left + dx, window.innerWidth - 60)) + 'px';
          panel.style.top = Math.max(0, Math.min(r0.top + dy, window.innerHeight - 40)) + 'px';
        }
        function otpustil() {
          document.removeEventListener('pointermove', hod);
          document.removeEventListener('pointerup', otpustil);
          if (vzyal) oknoSohranit();
        }
        document.addEventListener('pointermove', hod);
        document.addEventListener('pointerup', otpustil);
      });
      ruchka.addEventListener('dblclick', function (e) {
        if (e.target.closest('button, select, input')) return;
        oknoVernut();
      });
    }
    oknoTaskat(verh);

    /* ── СТРОКА СОСТОЯНИЯ ──────────────────────────────────────────────
       Отвечает на «где я» и держит выход. Сужение вида — это ВИД, а не
       правка: выход ничего не меняет в макете, поэтому он бесплатный и
       без подтверждений. Прибита к верху панели: в прокрутке на семьдесят
       ручек состояние обязано быть видно из любой точки.
       Заполняется ниже, когда известны наборы и секции. */
    var sost = document.createElement('div');
    sost.className = 'st-sost';
    var sostText = document.createElement('span');
    var sostX = document.createElement('button');
    sostX.type = 'button'; sostX.className = 'st-sost-x';
    sostX.textContent = '\u2715';
    sostX.title = 'показать все законы (Esc)';
    sostX.hidden = true;
    sost.appendChild(sostText); sost.appendChild(sostX);
    panel.appendChild(sost);
    oknoTaskat(sost);
    var obnovitSostoyanie = function () {};
    // «23 ручек» читается как машинный вывод; строка состояния — текст,
    // который читают глазами каждый раз, и склонение тут не мелочь
    function ruchek(n) {
      var d10 = n % 10, d100 = n % 100;
      if (d10 === 1 && d100 !== 11) return n + ' ручка';
      if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return n + ' ручки';
      return n + ' ручек';
    }
    // после «из» число уходит в родительный: «19 из 71 ручки», «19 из 23 ручек»
    function izRuchek(n) {
      return n + (n % 10 === 1 && n % 100 !== 11 ? ' ручки' : ' ручек');
    }

    // ── сборка строк по defs ──
    var controls = {};
    var curCard = null;
    /* Сведения о ручке для экспорта правок: подпись и секция берутся из
       defs по ходу сборки, тип — из объявления, если стенд на нём. */
    var opisRuchek = {}, tekSek = '';
    function zapomni(k, podpis) {
      if (k) opisRuchek[k] = { podpis: podpis || k, sekciya: tekSek };
    }
    // «доля от кегля», не «доля от кегль»: опоры лежат именительным
    var ROD_OPORY = { 'ширина': 'ширины', 'кегль': 'кегля', 'высота': 'высоты',
      'экран': 'экрана', 'строка': 'строки', 'колонка': 'колонки', 'лента': 'ленты',
      'знак': 'знака', 'своё': '«своего»', 'ось': 'оси', 'место': 'места',
      'фаза': 'фазы', 'сосед': 'соседа', 'объект': 'объекта', 'край': 'края' };
    function rodOpory(ot) { return ROD_OPORY[ot] || ot; }
    var tipRuchki = {};
    (o.zakon || []).forEach(function (z) {
      if (z[0] === 'h') return;
      var t = z[2], op = z[3] || {};
      if (t === 'пара' && op.iz) {
        op.iz.forEach(function (r) {
          tipRuchki[r[0]] = r[2] + ((r[3] || {}).ot ? ' от ' + rodOpory(r[3].ot) : '');
        });
        return;
      }
      if (z[0]) tipRuchki[z[0]] = t + (op.ot ? ' от ' + rodOpory(op.ot) : '');
    });
    (o.defs || []).forEach(function (d) {
      if (d[0] === 'h') {
        curCard = addSection(d[1]);
        tekSek = d[1];
        return;
      }
      if (d[2] === 'para' && Array.isArray(d[3])) {
        d[3].forEach(function (r) { zapomni(r[0], d[1] + ' · ' + r[1]); });
      }
      zapomni(d[0], d[1]);
      var host = curCard || panel;
      var row = document.createElement('div'); row.className = 'row';
      /* Ключ на самой строке: стенду бывает нужно показать одни ручки и
         спрятать другие — переключателем, а не отдельной панелью. Искать
         строку по подписи нельзя, подписи повторяются и переводятся. */
      row.dataset.k = d[0];
      var lab = document.createElement('label'); nadpis(lab, d[0], d[1]);
      /* подсказка — на всей строке, не на подписи: у тумблера подписи нет
         (глагол живёт на кнопке), у сегментера она — меньшая часть строки */
      bindTip(row, d[0]);
      row.appendChild(lab);

      if (d[2] === 'preset') {
        // [key, подпись, 'preset', [[значение, метка, {ключ: значение, ...}], ...]]
        // выбор пресета выставляет пачку параметров и обновляет их ручки
        var prSel = document.createElement('select');
        d[3].forEach(function (opt) {
          var oEl = document.createElement('option');
          oEl.value = opt[0]; oEl.textContent = opt[1];
          prSel.appendChild(oEl);
        });
        prSel.value = P[d[0]];
        prSel.addEventListener('input', function () {
          P[d[0]] = prSel.value;
          var chosen = d[3].filter(function (opt) { return opt[0] === prSel.value; })[0];
          if (chosen && chosen[2]) Object.assign(P, chosen[2]);
          izmenilos(d[0]);
          for (var ck in controls) controls[ck]();
        });
        controls[d[0]] = function () { prSel.value = P[d[0]]; };
        row.appendChild(prSel);
        host.appendChild(row);
        return;
      }
      if (d[2] === 'color') {
        // [key, подпись, 'color'] — параметр живёт строкой '#rrggbb'
        var ci = document.createElement('input');
        ci.type = 'color'; ci.className = 'st-color';
        ci.value = P[d[0]];
        ci.addEventListener('input', function () { P[d[0]] = ci.value; izmenilos(d[0]); });
        controls[d[0]] = function () { ci.value = P[d[0]]; };
        row.appendChild(ci);
        host.appendChild(row);
        return;
      }
      if (d[2] === 'select') {
        // [key, подпись, 'select', [[значение, метка], ...]]
        var sSel = document.createElement('select');
        d[3].forEach(function (opt) {
          var oEl = document.createElement('option');
          oEl.value = opt[0]; oEl.textContent = opt[1];
          sSel.appendChild(oEl);
        });
        sSel.value = P[d[0]];
        sSel.addEventListener('input', function () { P[d[0]] = sSel.value; izmenilos(d[0]); });
        controls[d[0]] = function () { sSel.value = P[d[0]]; };
        row.appendChild(sSel);
        host.appendChild(row);
        return;
      }
      if (d[2] === 'ease') {
        var easeKey = d[0];
        var bezKey = easeKey.replace('Ease', 'Bez');
        var sel = document.createElement('select');
        Object.keys(EASES).forEach(function (name) {
          var opt = document.createElement('option');
          opt.value = name; nadpis(opt, 'ease:' + name, name);
          sel.appendChild(opt);
        });
        var oB = document.createElement('option');
        oB.value = 'bezier'; nadpis(oB, 'ease:bezier', 'своя (безье)');
        sel.appendChild(oB);
        sel.value = P[easeKey];
        var ed = buildCurveEditor(easeKey, bezKey, sel);
        sel.addEventListener('input', function () {
          P[easeKey] = sel.value;
          // пресет подставляет рукоятки в свою форму — есть от чего лепить
          if (sel.value !== 'bezier') {
            P[bezKey] = (BEZ_APPROX[sel.value] || [0.25, 0.25, 0.75, 0.75]).slice();
          } else {
            ed.cv.hidden = false; // выбрал «свою» — редактор сразу под рукой
          }
          ed.redraw(); izmenilos(easeKey);
        });
        controls[easeKey] = function () { sel.value = P[easeKey]; ed.redraw(); };
        repaints.push(ed.redraw);
        row.appendChild(sel);
        host.appendChild(row);
        // редактор кривой — отдельный элемент рядом со строкой: прячется вместе с ней
        ed.cv.dataset.k = easeKey + ':bez';
        host.appendChild(row === ed.cv ? row : ed.cv);
        // редактор свёрнут по умолчанию: квадраты кривых — пол-панели;
        // клик по подписи строки раскрывает и прячет
        ed.cv.hidden = true;
        lab.classList.add('st-fold');
        lab.style.cursor = 'inherit';
        lab.addEventListener('click', function () {
          ed.cv.hidden = !ed.cv.hidden;
          if (!ed.cv.hidden) ed.redraw();
        });
        ed.redraw();
        return;
      }

      // орган из библиотеки: [key, подпись, 'имя-типа', ...]
      if (typeof d[2] === 'string' && TIPY[d[2]]) {
        TIPY[d[2]](row, d, P, {
          save: function () { izmenilos(d[0]); }, host: host, bindTip: bindTip,
          accent: accent, repaints: repaints, controls: controls,
          defaults: DEFAULTS, storageKey: o.storageKey,
          // отбор уведённых ручек — тот же, что у кнопок копирования:
          // метка момента (скраб) собирает воспроизводимый адрес кадра
          uvedennye: function () { return uvedennye(); },
          onChange: function () { if (typeof o.onChange === 'function') o.onChange(d[0], P); },
        });
        host.appendChild(row);
        return;
      }

      // [key, подпись, min, max, шаг, {mul}] — mul: множитель показа
      // (панель говорит в единицах экрана, параметр живёт своим числом)
      var opts = d[5] || {};
      var mul = opts.mul || 1;
      function fmt(v) { return String(parseFloat((v * mul).toFixed(4))); }
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = d[2]; inp.max = d[3]; inp.step = d[4];
      inp.value = P[d[0]] * mul;
      var val = document.createElement('span'); val.className = 'val';
      val.textContent = fmt(P[d[0]]);
      inp.addEventListener('input', function () {
        P[d[0]] = parseFloat(inp.value) / mul;
        val.textContent = fmt(P[d[0]]);
        paintFill(inp);
        uvodObnovit();   // точка загорается в момент правки, не после перезагрузки
        izmenilos(d[0]);
      });
      // дабл-клик по слайдеру — откат ЭТОЙ ручки к дефолту
      inp.addEventListener('dblclick', function () {
        P[d[0]] = DEFAULTS[d[0]];
        controls[d[0]](); izmenilos(d[0]);
      });
      // клик по числу — точный ввод с клавиатуры (Enter/уход — принять, Esc — отмена)
      val.addEventListener('click', function () {
        var ked = document.createElement('input');
        ked.type = 'text'; ked.inputMode = 'decimal'; ked.className = 'val-edit';
        ked.value = parseFloat((P[d[0]] * mul).toFixed(4));
        klavishiChisla(ked);
        row.replaceChild(ked, val);
        ked.focus(); ked.select();
        var done = false;
        function commit(ok) {
          if (done) return; done = true;
          if (ok) {
            // поле принимает выражения: «700/2», «(3+1)*20», «+50» к текущему
            var v = vyrazhenie(ked.value, P[d[0]] * mul);
            if (isNaN(v)) v = chislo(ked.value);
            if (!isNaN(v)) {
              v = Math.max(parseFloat(inp.min), Math.min(parseFloat(inp.max), v));
              P[d[0]] = v / mul;
              izmenilos(d[0]);
            }
          }
          row.replaceChild(val, ked);
          controls[d[0]]();
        }
        ked.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') commit(true);
          else if (ev.key === 'Escape') commit(false);
        });
        ked.addEventListener('blur', function () { commit(true); });
      });
      /* Точка увода от умолчания — снято с reset-dot из раздатки Михаила
         Матвеева: видно, ЧТО уведено, клик возвращает умолчание. Отбор
         тот же, что у «Скопировать правки», — точка и есть его глаза. */
      var uvod = document.createElement('button');
      uvod.type = 'button'; uvod.className = 'st-uvod';
      uvod.title = 'уведено от умолчания — вернуть';
      function uvodObnovit() {
        var d0 = DEFAULTS[d[0]];
        uvod.classList.toggle('on', d0 !== undefined && String(P[d[0]]) !== String(d0));
      }
      uvod.addEventListener('click', function () {
        if (DEFAULTS[d[0]] === undefined) return;
        P[d[0]] = DEFAULTS[d[0]];
        izmenilos(d[0]); controls[d[0]]();
      });
      controls[d[0]] = function () {
        inp.value = P[d[0]] * mul; val.textContent = fmt(P[d[0]]); paintFill(inp);
        uvodObnovit();
      };
      repaints.push(function () { paintFill(inp); });
      row.appendChild(inp); row.appendChild(val); row.appendChild(uvod);
      uvodObnovit();
      host.appendChild(row);
      paintFill(inp);
    });

    /* ── СУЖЕНИЕ ПАНЕЛИ ────────────────────────────────────────────────
       Показать не все ручки просят два разных повода. Рабочий набор режет
       СЕКЦИЯМИ и выбирается руками: «работаю над каталогом». Место на
       макете режет СТРОКАМИ и выбирается кликом: «какие законы правят вот
       этим». Второе не ложится на первое — карта мест показала, что место
       идёт поперёк секций (в «Обтекании» место «Строка» — это разрядка из
       секции «Набор» плюс пять ручек из «Волны», а сама «Волна» держит ещё
       две ручки дескрипторов). Поэтому вид собирается один раз здесь, из
       обоих условий сразу, а не двумя механиками по очереди.

       Уровень один: панель либо показывает всё, либо одно сужение. Клик по
       месту перебивает набор и при выходе возвращает его — вложенности и
       хлебных крошек нет по решению. */
    var tekNabor = null, polnyi = null, nsel = null;   // заполнит блок наборов
    var mestoTek = null;

    function vseStroki() {
      var out = [];
      sekcii.forEach(function (s) {
        if (s.title === 'Панель') return;
        [].push.apply(out, s.card.querySelectorAll('.row'));
      });
      // строки, объявленные до первой секции, живут прямо в панели
      [].forEach.call(panel.children, function (e) {
        if (e.classList && e.classList.contains('row')) out.push(e);
      });
      return out;
    }

    /* Жива ли величина в текущей фазе. Условие лежит в карте (pri из
       объявления), значения — в P. Сравнение через String: селект хранит
       строку, стенд мог объявить число — '3' и 3 здесь одно и то же. */
    function zhiv(k) {
      var karta = (typeof StendPanel !== 'undefined' && StendPanel.karta) || null;
      var u = karta && karta.zhivet && karta.zhivet[k];
      if (u === undefined || u === null) return true;
      if (typeof u === 'string') return !!P[u];
      if (typeof u !== 'object') return !!u;
      return Object.keys(u).every(function (h) {
        var nado = u[h];
        if (Array.isArray(nado)) {
          return nado.some(function (v) { return String(P[h]) === String(v); });
        }
        if (typeof nado === 'boolean') return !!P[h] === nado;
        return String(P[h]) === String(nado);
      });
    }

    function perestroitVid() {
      /* Пока панель сужена местом, набор не участвует: место режет поперёк
         секций, и пересечение с набором давало бы «Строка · 2 из 71» —
         законы места, случайно попавшие в секции набора. Место ПЕРЕБИВАЕТ
         набор; набор ждёт своей очереди и возвращается выходом. */
      var spisok = (o.nabory && tekNabor && !mestoTek) ? o.nabory[tekNabor] : null;
      var karta = (typeof StendPanel !== 'undefined' && StendPanel.karta) || null;
      var svoi = mestoTek && karta ? (karta.vMeste[mestoTek] || []) : null;
      sekcii.forEach(function (s) {
        if (s.title === 'Панель') return;       // подвал не прячется никогда
        var vneNabora = Boolean(spisok) && spisok.indexOf(s.title) < 0;
        var vidno = 0;
        [].forEach.call(s.card.querySelectorAll('.row'), function (r) {
          var skryt = vneNabora || (svoi ? svoi.indexOf(r.dataset.k) < 0 : false)
                                || !zhiv(r.dataset.k);
          /* Прячем КЛАССОМ, а не hidden. Атрибутом hidden пользуется сам
             стенд: gorizont убирает ручки той стороны каталога, которая
             сейчас не работает.Два механизма на одном атрибуте дрались бы —
             переключение набора возвращало бы стенду спрятанное. Класс и
             hidden складываются: спрятано, если хоть один сказал спрятать. */
          r.classList.toggle('st-vne', !!skryt);
          if (!skryt && !r.hidden) vidno += 1;
        });
        // секция без единой видимой строки прячется вместе с заголовком:
        // пустой заголовок читается как поломка
        var skrytSekciyu = vneNabora || (svoi && !vidno);
        s.h.hidden = !!skrytSekciyu;
        s.card.hidden = !!skrytSekciyu || !!folds[s.title];
      });
      obnovitSostoyanie();
    }

    obnovitSostoyanie = function () {
      var vsego = 0, vidno = 0;
      vseStroki().forEach(function (r) {
        vsego += 1;
        if (!r.hidden && !r.classList.contains('st-vne')) vidno += 1;
      });
      var uzko = !!mestoTek || (!!o.nabory && tekNabor && tekNabor !== polnyi);
      sost.classList.toggle('uzko', !!uzko);
      sostX.hidden = !uzko;
      sostX.title = (mestoTek && o.nabory && tekNabor && tekNabor !== polnyi)
        ? 'вернуться к набору «' + tekNabor + '» (Esc)'
        : 'показать все законы (Esc)';
      sostText.innerHTML = uzko
        ? '<b>' + (mestoTek || tekNabor) + '</b> · ' + vidno + ' из ' + izRuchek(vsego)
        : '<b>' + T('panel:vse', 'Все законы') + '</b> · ' + ruchek(vsego);
    };

    /* Выход отменяет сужение целиком и НИЧЕГО не меняет в макете: сужение —
       это вид, а не правка, поэтому он бесплатный и без подтверждений.
       Место прокрутки сохраняется: в панели на семьдесят ручек ты где-то
       стоял, и возврат в начало был бы наказанием за любопытство. */
    function vyhod() {
      if (!mestoTek && (!o.nabory || !tekNabor || tekNabor === polnyi)) return;
      var mesto = panel.scrollTop;
      if (mestoTek) {
        // набор при клике не менялся — снятое место открывает его обратно
        mestoTek = null;
        postavitAdres(null);
      } else if (nsel) {
        tekNabor = polnyi; nsel.value = polnyi;
      }
      perestroitVid();
      panel.scrollTop = mesto;
    }
    sostX.addEventListener('click', vyhod);

    /* ── ВЫБОР МЕСТА НА МАКЕТЕ ─────────────────────────────────────────
       Не «настройки этого элемента», а ЗАКОНЫ ЭТОГО МЕСТА: у элемента
       своих настроек нет, его положение складывают несколько законов, и
       каждый из них правит ещё сотней таких же. Поэтому наведение метит
       ВСЕ элементы места разом, а не тот один, что под курсором.

       Выбор живёт режимом, а не постоянным перехватом кликов: на макете
       есть свои ссылки и свои жесты, отбирать их у стенда нельзя. Режим
       включает прицел в строке состояния, гасит — выбор или Esc. */
    var karta0 = (typeof StendPanel !== 'undefined' && StendPanel.karta) || null;
    if (karta0 && karta0.hozyaeva) hozyaeva = karta0.hozyaeva;

    /* ── АДРЕС ПРАВКИ ИДЁТ ЗА МЕСТОМ (рамка, п.3) ─────────────────────
       Если у места объявлен этаж, клик ставит его в инспектор: сузив
       панель до законов заголовка, правишь заголовок. Иначе ловушка —
       вид сузился, а отступления пишутся тому этажу, что был выбран
       раньше, и правишь этаж незаметно. Выход возвращает адрес, который
       был до первого клика; переклик на место без этажа — тоже, по той
       же причине. Адрес — правка, но откатная и видимая в инспекторе,
       поэтому выход остаётся бесплатным. */
    var adresDo = null, adresStavilsya = false;
    function postavitAdres(imya) {
      var insp = karta0 && karta0.inspektor;
      if (!insp || !(insp in P)) return;
      var et = imya && karta0.etazh ? karta0.etazh[imya] : null;
      if (et) {
        if (!adresStavilsya) { adresDo = P[insp]; adresStavilsya = true; }
        if (P[insp] === et) return;
        P[insp] = et;
      } else {
        if (!adresStavilsya) return;
        P[insp] = adresDo;
        adresStavilsya = false;
      }
      for (var k in controls) controls[k]();   // инспектор и наследования разом
      izmenilos(insp);
    }
    var sloi = null, sostP = null, rezhim = false, podKursorom = null, posl = null;

    /* Канвасный стенд не получает DOM-меток — подсветить место может
       только он сам. Панель говорит ему, над чем курсор, событием:
       stend:mesto {imya} при входе, {imya: null} при уходе и выходе из
       режима. DOM-стендам событие тоже шлётся — им оно просто не нужно. */
    function skazatMesto(imya) {
      try {
        document.dispatchEvent(new CustomEvent('stend:mesto', { detail: { imya: imya } }));
      } catch (e) {}
    }
    function snyatMarkery() {
      if (sloi) { sloi.remove(); sloi = null; }
      if (podKursorom) skazatMesto(null);
      podKursorom = null;
    }
    function vyklyuchitRezhim() {
      if (!rezhim) return;
      rezhim = false;
      document.body.classList.remove('st-vybor');
      if (sostP) sostP.classList.remove('on');
      snyatMarkery();
    }
    function mestoPod(x, y) {
      if (!karta0) return null;
      var el = document.elementFromPoint(x, y);
      if (!el) return null;
      if (el.closest && (el.closest('.st-panel') || el.closest('.st-gear'))) return null;
      for (var i = 0; i < karta0.mesta.length; i++) {
        var imya = karta0.mesta[i], g = karta0.gde[imya];
        if (typeof g === 'function') { if (g(x, y)) return imya; continue; }
        for (var j = 0; j < g.length; j++) {
          if (el.closest && el.closest(g[j])) return imya;
        }
      }
      return null;
    }
    // Подпись держится у курсора, но не уезжает за край: у правой и
    // нижней кромки её сдвиг (14px в CSS) прижимается внутрь экрана.
    function stavitPodpis(pod) {
      var r = pod.getBoundingClientRect();
      var x = Math.min(posl.x, window.innerWidth - r.width - 22);
      var y = Math.min(posl.y, window.innerHeight - r.height - 22);
      pod.style.left = x + 'px'; pod.style.top = y + 'px';
    }
    function narisovatMarkery(imya) {
      snyatMarkery();
      if (!imya) return;
      podKursorom = imya;
      skazatMesto(imya);
      sloi = document.createElement('div');
      sloi.className = 'st-mesta';
      // акцент темы живёт на панели, а слой лежит в body — тему переносим,
      // иначе метки в «Нотхинге» остались бы синими
      if (panel.classList.contains('st-theme-nothing')) sloi.classList.add('st-theme-nothing');
      /* Этаж указки берётся у самой панели, а не из общего правила: стенд
         вправе опустить панель на свой порядок (diagonal держит её на 50),
         и указка обязана поехать за ней — на этаж ниже, чтобы лежать
         поверх макета, но не закрывать то, ради чего в неё тычут. */
      var zp = parseInt(getComputedStyle(panel).zIndex, 10);
      if (zp === zp) sloi.style.zIndex = zp - 1;
      var g = karta0.gde[imya], n = 0;
      if (typeof g !== 'function') {
        g.forEach(function (sel) {
          [].forEach.call(document.querySelectorAll(sel), function (e) {
            var r = e.getBoundingClientRect();
            if (!r.width && !r.height) return;
            var m = document.createElement('div');
            m.className = 'st-metka';
            m.style.left = r.left + 'px'; m.style.top = r.top + 'px';
            m.style.width = r.width + 'px'; m.style.height = r.height + 'px';
            sloi.appendChild(m); n += 1;
          });
        });
      }
      var pod = document.createElement('div');
      pod.className = 'st-mesto-imya';
      pod.dataset.podpis = '1';
      // счёт элементов рядом с именем: он и есть довод, что правится не один
      var zak = (karta0.vMeste[imya] || []).length;
      pod.textContent = imya + (n > 1 ? ' \u00d7 ' + n : '') + ' · ' + ruchek(zak);
      sloi.appendChild(pod);
      document.body.appendChild(sloi);
      if (posl) stavitPodpis(pod);
    }
    function navedenie(e) {
      if (!rezhim) return;
      posl = { x: e.clientX, y: e.clientY };
      var imya = mestoPod(e.clientX, e.clientY);
      if (imya !== podKursorom) narisovatMarkery(imya);
      else if (sloi) {
        var pod = sloi.querySelector('.st-mesto-imya');
        if (pod) stavitPodpis(pod);
      }
    }
    function vybor(e) {
      if (!rezhim) return;
      var imya = mestoPod(e.clientX, e.clientY);
      if (!imya) return;
      // клик перехватывается целиком: на макете под ним могла быть ссылка
      e.preventDefault(); e.stopPropagation();
      var mesto = panel.scrollTop;
      mestoTek = imya;
      postavitAdres(imya);
      vyklyuchitRezhim();
      perestroitVid();
      panel.scrollTop = mesto;
    }
    if (karta0 && karta0.mesta.length) {
      sostP = document.createElement('button');
      sostP.type = 'button'; sostP.className = 'st-sost-p';
      sostP.innerHTML = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" ' +
        'stroke-width="1.3"><circle cx="7" cy="7" r="4"/><path d="M7 0v2.4M7 11.6V14M0 7h2.4M11.6 7H14"/></svg>';
      sostP.title = 'показать законы места на макете';
      sost.insertBefore(sostP, sostX);
      sostP.addEventListener('click', function () {
        if (rezhim) { vyklyuchitRezhim(); return; }
        rezhim = true;
        document.body.classList.add('st-vybor');
        sostP.classList.add('on');
      });
      document.addEventListener('pointermove', navedenie);
      document.addEventListener('click', vybor, true);
      // маркеры прибиты к экрану: под ними едет макет
      ['scroll', 'resize'].forEach(function (s) {
        window.addEventListener(s, function () {
          if (rezhim && podKursorom) narisovatMarkery(podKursorom);
        }, true);
      });

      /* АВАРИЙНЫЙ ВЫХОД. Правка закона может убрать место с экрана —
         тогда панель показывает законы того, чего нет. Проверяем замером,
         не чаще раза в треть секунды: ручку крутят десятками кадров. */
      /* ?mesto=Строка — панель открывается уже суженной. Тот же путь, что
         у ?nabor=: им нейронке говорят, над чем идёт работа. */
      var izAdresaMesta = (location.search.match(/[?&]mesto=([^&]+)/) || [])[1];
      if (izAdresaMesta) {
        var m0 = decodeURIComponent(izAdresaMesta);
        if (karta0.vMeste[m0]) { mestoTek = m0; postavitAdres(m0); }
      }

      var kogda = 0;
      document.addEventListener('stend:izmenenie', function () {
        if (!mestoTek) return;
        var t = Date.now(); if (t - kogda < 300) return; kogda = t;
        var g = karta0.gde[mestoTek];
        if (typeof g === 'function') return;
        var est = 0;
        g.forEach(function (sel) { try { est += document.querySelectorAll(sel).length; } catch (e) {} });
        if (est) return;
        var imya = mestoTek;
        vyhod();
        sostText.innerHTML = '<b>' + imya + '</b> · место исчезло, показаны все законы';
        setTimeout(obnovitSostoyanie, 2600);
      });
    }

    // Esc — рефлекс. Сначала гасит режим выбора, потом снимает сужение;
    // в поле ввода он занят отменой правки числа и сюда не доходит.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || panel.hidden) return;
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
      if (rezhim) { vyklyuchitRezhim(); return; }
      vyhod();
    });

    perestroitVid();

    /* Органы из библиотеки строят свои подписи сами, до языка панели им
       дела нет. Чтобы он доставал и их, всё, что уже стоит в панели и не
       взято на учёт, берётся по своему русскому тексту: перевод ищется по
       нему же. Так новый орган переводится, ничего про язык не зная. */
    [].forEach.call(panel.querySelectorAll('label, option, button'), function (e) {
      for (var i = 0; i < nadpisi.length; i++) if (nadpisi[i].el === e) return;
      var t = (e.textContent || '').trim();
      if (!t || !/[А-Яа-яЁё]/.test(t)) return;
      nadpisi.push({ el: e, k: '', ru: t });
    });
    if (lang === 'en') nadpisi.forEach(function (n) { n.el.textContent = T(n.k, n.ru); });

    // ── подвал: тема панели + сброс ──
    var foot = addSection('Панель');

    /* РАБОЧИЕ НАБОРЫ. Панель из тридцати ручек показывает всё сразу, а
       работа идёт над одним: над волной, над каталогом, над цветом. Набор —
       именованный список секций под текущую работу; остальные секции
       прячутся целиком (спрятано — значит нет). Выбор помнится на стенд,
       ?nabor=имя открывает нужный сразу — этим же путём набор может
       подставить нейронка, когда ей сказали, над чем работаем.

         nabory: {
           'всё': null,                       // null — показать все секции
           'волна': ['Волна', 'Ход'],
         }                                                                */
    var vyborNabora = null;
    if (o.nabory) {
      var NABOR_KEY = 'stend-nabor:' + o.storageKey;
      var imena = Object.keys(o.nabory);
      try { tekNabor = localStorage.getItem(NABOR_KEY); } catch (e) {}
      var izAdresa = (location.search.match(/[?&]nabor=([^&]+)/) || [])[1];
      if (izAdresa) tekNabor = decodeURIComponent(izAdresa);
      if (imena.indexOf(tekNabor) < 0) tekNabor = imena[0];

      // Полный набор — тот, что ничего не прячет: к нему ведёт выход.
      polnyi = imena.filter(function (i) { return o.nabory[i] === null; })[0] || imena[0];

      /* Набор, выбранный руками, снимает сужение по месту: уровень один,
         накладывать одно сужение на другое было решено не давать. При
         начальной сборке (nachalo) место с адреса ?mesto= остаётся. */
      function primenitNabor(imya, nachalo) {
        tekNabor = imya;
        if (!nachalo) mestoTek = null;
        try { localStorage.setItem(NABOR_KEY, imya); } catch (e) {}
        perestroitVid();
      }

      var nrow = document.createElement('div'); nrow.className = 'row';
      var nlab = document.createElement('label'); nadpis(nlab, 'panel:nabor', 'Набор');
      nsel = document.createElement('select');
      imena.forEach(function (imya) {
        var opt = document.createElement('option');
        opt.value = imya; nadpis(opt, 'nabor:' + imya, imya);
        nsel.appendChild(opt);
      });
      nsel.value = tekNabor;
      nsel.addEventListener('input', function () { primenitNabor(nsel.value); });
      nrow.appendChild(nlab); nrow.appendChild(nsel);
      foot.appendChild(nrow);
      primenitNabor(tekNabor, true);
      vyborNabora = function (imya) {
        if (!o.nabory[imya] && o.nabory[imya] !== null) return;
        nsel.value = imya; primenitNabor(imya);
      };
      vyborNabora.vyhod = vyhod;
    }
    var trow = document.createElement('div'); trow.className = 'row';
    var tlab = document.createElement('label'); nadpis(tlab, 'panel:theme', 'Тема');
    var tsel = document.createElement('select');
    [['apple', 'Эпл'], ['nothing', 'Нотхинг']].forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t[0]; nadpis(opt, 'theme:' + t[0], t[1]);
      tsel.appendChild(opt);
    });
    tsel.value = theme;
    tsel.addEventListener('input', function () { applyTheme(tsel.value); });
    trow.appendChild(tlab); trow.appendChild(tsel);
    foot.appendChild(trow);

    /* «Скопировать параметры» — адрес этой же страницы с теми ручками,
       что уведены от исходных. Стенд, который читает параметры из адреса,
       откроется ровно в этом состоянии; остальным это читаемый список
       настроек. Якорь сохраняется — уезжает и место, и вид. */
    // Отбор уведённых ручек один на обе кнопки: URL и текст правок —
    // две формы выдачи одного сравнения DEFAULTS против P.
    function uvedennye() {
      var out = [];
      Object.keys(DEFAULTS).forEach(function (k) {
        var v = P[k], d = DEFAULTS[k];
        var same = Array.isArray(d)
          ? JSON.stringify(v) === JSON.stringify(d)
          : String(v) === String(d);
        if (!same) out.push({ k: k, bylo: d, stalo: v });
      });
      return out;
    }
    function pokazatNaKnopke(kn, klyuch, ru) {
      return function (t) {
        kn.textContent = t;
        setTimeout(function () { kn.textContent = T(klyuch, ru); }, 1400);
      };
    }
    /* ── ЛОКАЛКА (решение Сергея 02.09: сначала локалка, публикация
       потом). На localhost у страницы есть мост к Клоду — lokalka.py
       принимает заявки в .zayavki/, и Клод видит их мгновенно. В
       интернете моста честно нет: там «Скопировать …» и буфер. */
    var lokalka = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    function zayavka(vid, telo, cb) {
      telo = telo || {};
      telo.vid = vid;
      telo.stend = location.pathname;
      try {
        fetch('/zayavka', { method: 'POST', body: JSON.stringify(telo) })
          .then(function (r) { cb && cb(r.ok); }, function () { cb && cb(false); });
      } catch (e) { cb && cb(false); }
    }
    // ошибки страницы прилетают сами: «я глаза, ты мозг» без скриншотов
    if (lokalka) {
      window.addEventListener('error', function (e) {
        zayavka('oshibka', { tekst: String(e.message || e),
          fail: (e.filename || '') + ':' + (e.lineno || ''), });
      });
    }

    var cp = document.createElement('button');
    cp.className = 'st-reset st-copy';
    nadpis(cp, 'panel:copy', 'Скопировать параметры');
    cp.addEventListener('click', function () {
      var q = [];
      uvedennye().forEach(function (u) {
        q.push(encodeURIComponent(u.k) + '=' +
          encodeURIComponent(Array.isArray(u.stalo) ? u.stalo.join(',') : u.stalo));
      });
      var url = location.origin + location.pathname +
        (q.length ? '?' + q.join('&') : '') + location.hash;
      var said = pokazatNaKnopke(cp, 'panel:copy', 'Скопировать параметры');
      var ok = function () {
        said(q.length ? T('', 'скопировано: ') + q.length + T('', ' ручек')
                      : T('', 'всё по умолчанию'));
      };
      var ruchkami = function () { prompt(T('', 'Параметры:'), url); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, ruchkami);
      else ruchkami();
    });
    panel.appendChild(cp);

    /* «Скопировать правки» — тот же отбор, вторая форма выдачи. URL выше
       читает машина; модели и человеку нужен текст: подпись, тип и пара
       «было → стало», сгруппированные по секциям. Закрывает разрыв цикла:
       значения живут в localStorage, в коде стоят старые дефолты, и
       следующая сессия рассуждала бы о ненастроенном стенде. */
    var cpp = document.createElement('button');
    cpp.className = 'st-reset st-copy';
    nadpis(cpp, 'panel:copyEdits', 'Скопировать правки');
    cpp.addEventListener('click', function () {
      var uved = uvedennye();
      var saidP = pokazatNaKnopke(cpp, 'panel:copyEdits', 'Скопировать правки');
      if (!uved.length) { saidP(T('', 'всё по умолчанию')); return; }
      function znak(v) { return Array.isArray(v) ? JSON.stringify(v) : String(v); }
      // группировка по секциям в порядке появления в панели
      var poSekciyam = [], vSekcii = {};
      uved.forEach(function (u) {
        var op = opisRuchek[u.k] || { podpis: u.k, sekciya: '' };
        var sek = op.sekciya || '(без секции)';
        if (!vSekcii[sek]) { vSekcii[sek] = []; poSekciyam.push(sek); }
        vSekcii[sek].push({ k: u.k, podpis: op.podpis, tip: tipRuchki[u.k] || '',
                            bylo: znak(u.bylo), stalo: znak(u.stalo) });
      });
      // секции идут в порядке панели, не в порядке ключей DEFAULTS
      var poryadok = sekcii.map(function (x) { return x.title; });
      poSekciyam.sort(function (a, b) { return poryadok.indexOf(a) - poryadok.indexOf(b); });
      var w1 = 0, w2 = 0, w3 = 0;
      uved.forEach(function (u) {
        var op = opisRuchek[u.k] || { podpis: u.k };
        w1 = Math.max(w1, u.k.length);
        w2 = Math.max(w2, (op.podpis || '').length);
        w3 = Math.max(w3, (tipRuchki[u.k] || '').length);
      });
      function pad(t, n) { t = String(t); while (t.length < n) t += ' '; return t; }
      var imya = (location.pathname.split('/').pop() || location.pathname) || 'стенд';
      var stroki = ['Стенд: ' + imya + ' \u00b7 ' + location.origin + location.pathname,
                    'Уведено ' + ruchek(uved.length) + ' из ' + Object.keys(DEFAULTS).length + '.', ''];
      poSekciyam.forEach(function (sek) {
        stroki.push(sek);
        vSekcii[sek].forEach(function (r) {
          stroki.push('  ' + pad(r.k, w1) + '  ' + pad(r.podpis, w2) +
                      (w3 ? '  ' + pad(r.tip, w3) : '') + '  ' + r.bylo + ' \u2192 ' + r.stalo);
        });
      });
      stroki.push('');
      stroki.push('Впиши эти значения в DEFAULTS стенда как новые значения по умолчанию.');
      var tekst = stroki.join('\n');
      var okP = function () { saidP(T('', 'скопировано: ') + uved.length + T('', ' ручек')); };
      var rukamiP = function () { prompt(T('', 'Правки:'), tekst); };
      if (navigator.clipboard) navigator.clipboard.writeText(tekst).then(okP, rukamiP);
      else rukamiP();
    });
    panel.appendChild(cpp);

    /* «Считать эталоном» — только на локалке: заявка с уведёнными
       ручками падает файлом, Клод сверяет и вписывает в DEFAULTS.
       Правда остаётся одна — эталон живёт в коде; кнопка не назначает
       его, а отправляет предложение без буфера обмена. */
    if (lokalka) {
      var et = document.createElement('button');
      et.className = 'st-reset st-copy';
      nadpis(et, 'panel:etalon', 'Считать эталоном');
      et.addEventListener('click', function () {
        var uved = uvedennye().map(function (u) {
          return { k: u.k, bylo: u.bylo, stalo: u.stalo,
                   podpis: (opisRuchek[u.k] || {}).podpis || u.k };
        });
        var skazal = pokazatNaKnopke(et, 'panel:etalon', 'Считать эталоном');
        if (!uved.length) { skazal(T('', 'всё и так по умолчанию')); return; }
        zayavka('etalon', { ruchki: uved, otkloneniya: P.otkloneniya }, function (ok) {
          skazal(ok ? T('', 'отправлено: ') + ruchek(uved.length)
                    : T('', 'локалка не отвечает'));
        });
      });
      panel.appendChild(et);
    }

    var rst = document.createElement('button');
    rst.className = 'st-reset';
    nadpis(rst, 'panel:reset', 'Сбросить настройки');
    rst.addEventListener('click', function () {
      Object.assign(P, DEFAULTS);
      // рукоятки безье — копиями, чтобы лепка не портила DEFAULTS
      (o.defs || []).forEach(function (d) {
        if (d[2] !== 'ease') return;
        var bk = d[0].replace('Ease', 'Bez');
        if (Array.isArray(DEFAULTS[bk])) P[bk] = DEFAULTS[bk].slice();
      });
      // объекты (гнездо отступлений стилей) — тоже копиями, не ссылкой
      Object.keys(DEFAULTS).forEach(function (k) {
        if (DEFAULTS[k] && typeof DEFAULTS[k] === 'object' && !Array.isArray(DEFAULTS[k])) {
          P[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
        }
      });
      try { localStorage.removeItem(o.storageKey); } catch (e) {}
      for (var k in controls) controls[k]();
    });
    panel.appendChild(rst);

    gear.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    /* Панель НЕ закрывается кликом по макету. Закрытие по клику вне было
       заведено, пока клик по макету ничего не значил; теперь он выбирает
       место, и панель обязана остаться на экране — иначе выбор места
       гасит то самое, ради чего он делается. Закрывает шестерёнка. */
    if (/[?&]panel/.test(location.search)) panel.hidden = false;
    applyTheme(theme);

    return {
      save: save, panel: panel, applyTheme: applyTheme,
      params: P, defaults: DEFAULTS, controls: controls,
      // перерисовать все ручки после внешней правки P (откат, пресет извне)
      obnovit: function () { for (var k in controls) controls[k](); },
      nabor: vyborNabora, // переключить рабочий набор снаружи (агент, скрипт)
      // сузить панель до законов места снаружи; без имени — выход
      mesto: function (imya) {
        if (imya && (!karta0 || !karta0.vMeste[imya])) return;
        if (!imya) { vyhod(); return; }
        mestoTek = imya; postavitAdres(imya); perestroitVid();
      },
      vyhod: vyhod,
    };
  }

  window.StendPanel = {
    build: build,
    klavishi: klavishiChisla, // стрелки ±1 / Shift ±10 / запятая — для полей органов
    tip: function (imya, fn) { TIPY[imya] = fn; return this; },
    tipy: TIPY,
    vyrazhenie: vyrazhenie, // математика в полях числа — и органам тоже
  };
})();
