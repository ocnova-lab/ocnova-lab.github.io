/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Инспектор — второй этаж панели: сначала выбираешь, что правишь, потом крутишь.
   Приём снят со стенда индексального контента (Копинов, 2026-08): вместо
   пятнадцати раскрытых карточек — один список «активный стиль» и один
   редактор под ним.

   Плоская панель живёт, пока ручек десяток. Как только на странице десять
   этажей и у каждого свои параметры, список ручек становится длиннее экрана,
   и панель перестаёт читаться. Инспектор переносит различие объектов в один
   орган: ручек столько же, а правятся они по очереди.

   Первый пункт списка — сам закон. Пока выбран он, ручки наследования правят
   общее значение; выбранный этаж правит только своё. Сводка справа считает
   отступления, потому что отклонение от закона должно быть видно без
   раскрытия карточки.

   Объявление:  ['aktivnyi', 'Этаж', 'inspektor', [
                  ['oblozhka', 'Обложка'], ['manifest', 'Манифест']]]
                Список может быть функцией — когда этажи считает стенд:
                ['aktivnyi', 'Этаж', 'inspektor', function (P) { return […] }]
                Пятым — настройки: { gnezdo: 'otkloneniya', zakon: 'Общий закон' }
   Значение:    P.aktivnyi — id правимого этажа, пустая строка = закон.

   Пара к органу 'nasledovanie': инспектор держит адрес, наследование —
   значения по этому адресу.                                              */
(function () {
  var GNEZDO = 'otkloneniya';

  var STIL = '.st-insp{display:flex;align-items:center;gap:7px;margin-left:auto;min-width:0}' +
    '.st-insp select{max-width:124px}' +
    '.st-insp-svodka{font:11px/1 var(--st-font);color:var(--st-text-2);' +
    'white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.st-insp-svodka[data-est="1"]{color:var(--st-accent)}' +
    '.st-insp-sbros{all:unset;flex:none;padding:2px 6px;border-radius:5px;cursor:pointer;' +
    'font:11px/1.3 var(--st-font);color:var(--st-text-2);' +
    'border:0.5px solid var(--st-hairline);transition:color .12s,background .12s}' +
    '.st-insp-sbros:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-insp-sbros[hidden]{display:none!important}';

  function vstavitStil() {
    if (document.getElementById('st-insp-css')) return;
    var s = document.createElement('style'); s.id = 'st-insp-css';
    s.textContent = STIL; document.head.appendChild(s);
  }

  function skolko(P, gnezdo, id) {
    var g = P[gnezdo] && P[gnezdo][id];
    return g ? Object.keys(g).length : 0;
  }

  // Сколько этажей вообще отступили от закона — сводка для режима закона.
  function skolkoEtazhey(P, gnezdo) {
    var g = P[gnezdo];
    if (!g) return 0;
    return Object.keys(g).filter(function (id) { return Object.keys(g[id]).length; }).length;
  }

  function slovo(n, one, few, many) {
    var d10 = n % 10, d100 = n % 100;
    if (d10 === 1 && d100 !== 11) return one;
    if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return few;
    return many;
  }

  StendPanel.tip('inspektor', function (row, d, P, api) {
    vstavitStil();
    var klyuch = d[0];
    var opts = d[4] || {};
    var gnezdo = opts.gnezdo || GNEZDO;
    var podpisZakona = opts.zakon || 'Общий закон';

    var box = document.createElement('div'); box.className = 'st-insp';
    var sel = document.createElement('select');
    var svodka = document.createElement('span'); svodka.className = 'st-insp-svodka';
    var sbros = document.createElement('button');
    sbros.className = 'st-insp-sbros'; sbros.type = 'button';
    sbros.textContent = 'сброс';
    sbros.title = 'вернуть весь этаж к общему закону';

    function spisok() {
      var s = typeof d[3] === 'function' ? d[3](P) : d[3];
      return Array.isArray(s) ? s : [];
    }

    function sobratSpisok() {
      var etazhi = spisok();
      var bylo = P[klyuch] || '';
      sel.innerHTML = '';
      var zakon = document.createElement('option');
      zakon.value = ''; zakon.textContent = podpisZakona;
      sel.appendChild(zakon);
      etazhi.forEach(function (e) {
        var o = document.createElement('option');
        o.value = e[0]; o.textContent = e[1];
        sel.appendChild(o);
      });
      // Этаж мог исчезнуть, пока панель стояла закрытой: адрес не должен
      // остаться указывающим в пустоту.
      var est = etazhi.some(function (e) { return e[0] === bylo; });
      P[klyuch] = est ? bylo : '';
      sel.value = P[klyuch];
    }

    function narisovat() {
      sobratSpisok();
      var id = P[klyuch];
      if (id) {
        var n = skolko(P, gnezdo, id);
        svodka.textContent = n ? n + ' ' + slovo(n, 'своё', 'своих', 'своих') : 'по закону';
        svodka.dataset.est = n ? '1' : '0';
        sbros.hidden = !n;
      } else {
        var e = skolkoEtazhey(P, gnezdo);
        svodka.textContent = e ? e + ' ' + slovo(e, 'этаж', 'этажа', 'этажей') + ' со своим'
                               : 'все по закону';
        svodka.dataset.est = e ? '1' : '0';
        sbros.hidden = true;
      }
    }

    // Смена адреса перерисовывает все ручки: значения те же, объект другой.
    function obnovitVse() {
      for (var k in api.controls) if (k !== klyuch) api.controls[k]();
      narisovat();
    }

    sel.addEventListener('input', function () {
      P[klyuch] = sel.value;
      obnovitVse();
      api.save();
    });

    sbros.addEventListener('click', function () {
      var id = P[klyuch];
      if (!id || !P[gnezdo]) return;
      delete P[gnezdo][id];
      obnovitVse();
      api.save();
    });

    api.controls[klyuch] = narisovat;
    box.appendChild(sel);
    box.appendChild(svodka);
    box.appendChild(sbros);
    row.appendChild(box);
    narisovat();
  });
})();
