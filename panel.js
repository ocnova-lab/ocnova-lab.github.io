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

  function build(o) {
    // ?reset=1 — аварийный сброс сохранённых настроек ещё до применения
    if (/[?&]reset/.test(location.search)) {
      try { localStorage.removeItem(o.storageKey); } catch (e) {}
      Object.assign(o.params, o.defaults);
      Object.keys(o.defaults).forEach(function (k) { // массивы — копиями
        if (Array.isArray(o.defaults[k])) o.params[k] = o.defaults[k].slice();
      });
    }
    var P = o.params, DEFAULTS = o.defaults, DESC = o.desc || {};
    var EASES = o.eases || {};
    var evalEase = o.evalEase;
    var BEZ_APPROX = o.bezApprox || {};

    function save() {
      try { localStorage.setItem(o.storageKey, JSON.stringify(P)); } catch (e) {}
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
        tip.textContent = DESC[key];
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
        redraw(); save();
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

    // ── секции-гармошки: заголовок кликом сворачивает карточку,
    // состояние помнится на стенд (localStorage) ──
    var FOLD_KEY = 'stend-panel-folds:' + o.storageKey;
    var folds = {};
    try { folds = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); } catch (e) {}
    function saveFolds() {
      try { localStorage.setItem(FOLD_KEY, JSON.stringify(folds)); } catch (e) {}
    }
    function addSection(title) {
      var h = document.createElement('h4');
      h.textContent = title;
      h.className = 'st-sec';
      var card = document.createElement('div');
      card.className = 'card';
      panel.appendChild(h);
      panel.appendChild(card);
      function applyFold() {
        card.hidden = !!folds[title];
        h.classList.toggle('st-closed', !!folds[title]);
      }
      h.addEventListener('click', function () {
        folds[title] = !folds[title];
        applyFold(); saveFolds();
      });
      applyFold();
      return card;
    }

    // ── сборка строк по defs ──
    var controls = {};
    var curCard = null;
    (o.defs || []).forEach(function (d) {
      if (d[0] === 'h') {
        curCard = addSection(d[1]);
        return;
      }
      var host = curCard || panel;
      var row = document.createElement('div'); row.className = 'row';
      var lab = document.createElement('label'); lab.textContent = d[1];
      bindTip(lab, d[0]);
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
          save();
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
        ci.addEventListener('input', function () { P[d[0]] = ci.value; save(); });
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
        sSel.addEventListener('input', function () { P[d[0]] = sSel.value; save(); });
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
          opt.value = name; opt.textContent = name;
          sel.appendChild(opt);
        });
        var oB = document.createElement('option');
        oB.value = 'bezier'; oB.textContent = 'своя (безье)';
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
          ed.redraw(); save();
        });
        controls[easeKey] = function () { sel.value = P[easeKey]; ed.redraw(); };
        repaints.push(ed.redraw);
        row.appendChild(sel);
        host.appendChild(row);
        host.appendChild(ed.cv);
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
        save();
      });
      // дабл-клик по слайдеру — откат ЭТОЙ ручки к дефолту
      inp.addEventListener('dblclick', function () {
        P[d[0]] = DEFAULTS[d[0]];
        controls[d[0]](); save();
      });
      // клик по числу — точный ввод с клавиатуры (Enter/уход — принять, Esc — отмена)
      val.addEventListener('click', function () {
        var ked = document.createElement('input');
        ked.type = 'number'; ked.className = 'val-edit'; ked.step = 'any';
        ked.value = parseFloat((P[d[0]] * mul).toFixed(4));
        row.replaceChild(ked, val);
        ked.focus(); ked.select();
        var done = false;
        function commit(ok) {
          if (done) return; done = true;
          if (ok) {
            var v = parseFloat(ked.value);
            if (!isNaN(v)) {
              v = Math.max(parseFloat(inp.min), Math.min(parseFloat(inp.max), v));
              P[d[0]] = v / mul;
              save();
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
      controls[d[0]] = function () {
        inp.value = P[d[0]] * mul; val.textContent = fmt(P[d[0]]); paintFill(inp);
      };
      repaints.push(function () { paintFill(inp); });
      row.appendChild(inp); row.appendChild(val);
      host.appendChild(row);
      paintFill(inp);
    });

    // ── подвал: тема панели + сброс ──
    var foot = addSection('Панель');
    var trow = document.createElement('div'); trow.className = 'row';
    var tlab = document.createElement('label'); tlab.textContent = 'Тема';
    var tsel = document.createElement('select');
    [['apple', 'Эпл'], ['nothing', 'Нотхинг']].forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t[0]; opt.textContent = t[1];
      tsel.appendChild(opt);
    });
    tsel.value = theme;
    tsel.addEventListener('input', function () { applyTheme(tsel.value); });
    trow.appendChild(tlab); trow.appendChild(tsel);
    foot.appendChild(trow);

    var rst = document.createElement('button');
    rst.className = 'st-reset';
    rst.textContent = 'Сбросить настройки';
    rst.addEventListener('click', function () {
      Object.assign(P, DEFAULTS);
      // рукоятки безье — копиями, чтобы лепка не портила DEFAULTS
      (o.defs || []).forEach(function (d) {
        if (d[2] !== 'ease') return;
        var bk = d[0].replace('Ease', 'Bez');
        if (Array.isArray(DEFAULTS[bk])) P[bk] = DEFAULTS[bk].slice();
      });
      try { localStorage.removeItem(o.storageKey); } catch (e) {}
      for (var k in controls) controls[k]();
    });
    panel.appendChild(rst);

    gear.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    // клик в любом месте вне панели (и вне шестерёнки) закрывает её
    document.addEventListener('pointerdown', function (e) {
      if (panel.hidden) return;
      var t = e.target;
      if (t && t.closest && (t.closest('.st-panel') || t.closest('.st-gear'))) return;
      panel.hidden = true;
    });
    if (/[?&]panel/.test(location.search)) panel.hidden = false;
    applyTheme(theme);

    return { save: save, panel: panel, applyTheme: applyTheme };
  }

  window.StendPanel = { build: build };
})();
