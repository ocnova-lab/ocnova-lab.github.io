/* Объявление — панель выводится из типа величины, а не пишется руками.

   Ход 2 опыта 2026-08-31. Считано по 340 ручкам 13 стендов
   (`panel-harvest.py svoi`): все они укладываются в 15 типов величин,
   восемь типов покрывают 87%. Значит, границы, шаг, орган и единицу
   можно не писать в каждом стенде, а брать из типа.

   Было:  ['btm', 'Кегль внизу, %', 50, 150, 1]
   Стало: ['btm', 'Кегль внизу', 'доля', { ot: 'кегль', ot50: 150 }]

   Что это чинит на деле. Из 220 слайдеров 81 не называет единицу в подписи
   («Кегль 8…40» — это px или %?), хотя принцип 1 свода её требует. Здесь
   единица приходит из типа и приписывается к подписи механически: забыть
   её больше нельзя.

   Второе: тип несёт обязательства. Время требует кривую (П4), острота —
   датчик (П10), инерция — силу (П3). Компилятор проверяет их по секциям
   и складывает претензии в StendPanel.pretenzii, а не молчит.

   Вызов:
     defs: StendPanel.izObyavleniya(ZAKON)

   Строка объявления:
     ['h', 'Секция']
     [ключ, 'Подпись', 'тип', { опции }]

   Опции: ot — опора доли (ширина|кегль|высота|экран|строка|колонка|лента|знак);
          kak — '%' (по умолчанию), 'доли', '‰';
          ot0/do — свои границы, shag — свой шаг (перебивают таблицу);
          iz — варианты выбора, organ — перебить орган;
          edinica — перебить единицу в подписи, '' — убрать.                */
(function () {
  // Границы — медианы фактических диапазонов работающих стендов.
  // Это стартовый набор: стенд перебивает своё через ot0/do/shag.
  var TABLICA = {
    // «Длина» оказалась слишком широка: замер 54 длин показал пять разных
    // назначений с разными диапазонами. Один тип на все пять не работает —
    // в diagonal из-за этого перебивались руками две трети границ.
    'кегль':    { organ: 'слайдер', ot0: 6, do: 48, shag: 1, edinica: 'px' },
    'зазор':    { organ: 'слайдер', ot0: 0, do: 120, shag: 1, edinica: 'px' },
    'поле':     { organ: 'слайдер', ot0: 0, do: 400, shag: 2, edinica: 'px' },
    'путь':     { organ: 'слайдер', ot0: 0, do: 2000, shag: 20, edinica: 'px' },
    'размер':   { organ: 'слайдер', ot0: 20, do: 800, shag: 5, edinica: 'px' },
    'длина':    { organ: 'слайдер', ot0: 0, do: 160, shag: 1, edinica: 'px' }, // общий случай
    'кернинг':  { organ: 'слайдер', ot0: -0.1, do: 0.5, shag: 0.005, edinica: 'доли кегля' },
    'время':    { organ: 'слайдер', ot0: 0, do: 1500, shag: 20, edinica: 'мс', trebuet: 'кривая' },
    // Острота идёт от нуля вверх, ход — в обе стороны от нуля. Разные вещи:
    // сваленные в один тип, они дают лишнюю перебивку на каждой оси.
    'острота':  { organ: 'слайдер', ot0: 0, do: 1, shag: 0.05, edinica: '', trebuet: 'датчик' },
    'ход':      { organ: 'слайдер', ot0: -1, do: 1, shag: 0.05, edinica: '', trebuet: 'датчик' },
    'инерция':  { organ: 'слайдер', ot0: 0, do: 95, shag: 1, edinica: '%', trebuet: 'сила' },
    'сила':     { organ: 'слайдер', ot0: 0, do: 100, shag: 5, edinica: '%' },
    'счёт':     { organ: 'слайдер', ot0: 0, do: 12, shag: 1, edinica: '' },
    'угол':     { organ: 'ugol', ot0: 0, do: 90, shag: 1, edinica: '°' },
    'порог':    { organ: 'слайдер', ot0: 320, do: 1200, shag: 10, edinica: 'px' },
    'скорость': { organ: 'слайдер', ot0: -200, do: 200, shag: 1, edinica: 'px/с' },
    'цвет':     { organ: 'color', edinica: '' },
    'палитра':  { organ: 'palitra', edinica: '' },
    'датчик':   { organ: 'datchik', edinica: '' },
    'кривая':   { organ: 'ease', edinica: '' },
    'двоичное': { organ: 'toggle', edinica: '' },
    'выбор':    { organ: null, edinica: '' }, // орган выбирается по числу вариантов
    'пара':     { organ: 'para', edinica: '' }, // две родственные величины в строке
    'откат':    { organ: 'otkat', edinica: '' },
  };

  // Доля — единственный тип, у которого границы зависят от опоры.
  // Опора обязательна: «доля» без ответа на вопрос «от чего» — это не доля.
  var OPORY = {
    'ширина':  { ot0: 1.5, do: 16, shag: 0.1, edinica: '% ширины' },
    'кегль':   { ot0: 0, do: 160, shag: 1, edinica: '% кегля' },
    'высота':  { ot0: 0, do: 80, shag: 1, edinica: '% высоты' },
    'экран':   { ot0: 0, do: 100, shag: 5, edinica: '% экрана' },
    'строка':  { ot0: 0, do: 100, shag: 1, edinica: '% строки' },
    'колонка': { ot0: 0, do: 200, shag: 5, edinica: '% колонки' },
    'лента':   { ot0: 20, do: 100, shag: 5, edinica: '% ленты' },
    'знак':    { ot0: 8, do: 60, shag: 1, edinica: 'знаков' },
    'своё':    { ot0: 0, do: 100, shag: 1, edinica: '%' },
  };
  // Множитель — та же доля, записанная не процентом: интерлиньяж 1.26.
  var MNOZHITEL = { ot0: 0.5, do: 3, shag: 0.02 };

  function podpis(imya, edinica) {
    if (!edinica) return imya;
    // Единица через запятую, кроме относительных — там она часть меры.
    return /^%|^‰|знаков/.test(edinica) ? imya + ', ' + edinica : imya + ', ' + edinica;
  }

  function izObyavleniya(zakon) {
    var defs = [], pretenzii = [], sekcii = [], tek = { imya: '(без секции)', tipy: {} };

    // Первый проход: из чего состоит каждая секция — для проверки обязательств.
    (zakon || []).forEach(function (s) {
      if (s[0] === 'h') { sekcii.push(tek); tek = { imya: s[1], tipy: {} }; return; }
      tek.tipy[s[2]] = (tek.tipy[s[2]] || 0) + 1;
      if (s[3] && s[3].organ === 'datchik') tek.tipy['датчик'] = (tek.tipy['датчик'] || 0) + 1;
    });
    sekcii.push(tek);

    sekcii.forEach(function (sk) {
      Object.keys(sk.tipy).forEach(function (t) {
        var nado = (TABLICA[t] || {}).trebuet;
        if (!nado) return;
        var est = sk.tipy[nado] || (nado === 'датчик' ? sk.tipy['датчик'] : 0);
        if (!est) pretenzii.push('«' + sk.imya + '»: ' + sk.tipy[t] + '×' + t + ' без «' + nado + '»');
      });
    });

    // Второй проход: сборка строк панели.
    (zakon || []).forEach(function (s) {
      if (s[0] === 'h') { defs.push(['h', s[1]]); return; }
      var klyuch = s[0], imya = s[1], tip = s[2], o = s[3] || {};
      var baza = TABLICA[tip];
      if (!baza && tip !== 'доля') {
        pretenzii.push('неизвестный тип величины: ' + tip + ' (' + klyuch + ')');
        return;
      }

      if (tip === 'доля') {
        if (!o.ot) pretenzii.push('доля без опоры: ' + klyuch + ' — от чего доля?');
        // «% кегля» → «доли кегля»: опора уже стоит в родительном падеже.
        var rod = ((OPORY[o.ot] || OPORY['своё']).edinica || '').replace(/^%\s*/, '');
        baza = o.kak === 'доли' || o.kak === '×'
          ? Object.assign({ organ: 'слайдер', edinica: o.kak === '×' ? '×' : 'доли ' + rod }, MNOZHITEL)
          : Object.assign({ organ: 'слайдер' }, OPORY[o.ot] || OPORY['своё']);
        if (o.kak === '‰') { baza = Object.assign({}, baza, { edinica: '‰ ' + (o.ot || ''), do: 400, shag: 5 }); }
      }

      // Сила и инерция записываются двумя способами: 0…100 процентами и
      // 0…1 долей. Обнаружено на этих же 340 ручках. Единица идёт за
      // диапазоном, иначе на шкале 0…1 стоит враньё «%».
      var edinica = o.edinica !== undefined ? o.edinica : baza.edinica;
      if ((tip === 'сила' || tip === 'инерция') && o.edinica === undefined) {
        var verh = o.do !== undefined ? o.do : baza.do;
        if (verh <= 1) edinica = '';
      }
      var nadpis = podpis(imya, edinica);

      // Второй признак величины, найденный на том же замере: сколько у неё
      // концов. Одиночная — слайдер; коридор — одна величина с двумя
      // границами; пара — две родственные величины в одной строке.
      // Тип отвечает «что меряем», края — «сколькими числами».
      if (o.kraya === 'коридор') {
        defs.push([klyuch, nadpis, 'koridor',
                   o.ot0 !== undefined ? o.ot0 : baza.ot0,
                   o.do !== undefined ? o.do : baza.do,
                   o.shag !== undefined ? o.shag : baza.shag]);
        return;
      }
      if (tip === 'пара') {
        // Подписи внутри пары короткие и переводятся по своему тексту —
        // единицу к ним не приписываем, она стоит в подписи всей строки.
        var deti = (o.iz || []).map(function (r) {
          var d = r[3] || {}, b = r[2] === 'доля'
            ? (d.kak === 'доли' || d.kak === '×' ? MNOZHITEL : (OPORY[d.ot] || OPORY['своё']))
            : TABLICA[r[2]];
          if (!b) { pretenzii.push('в паре «' + imya + '» неизвестный тип: ' + r[2]); b = {}; }
          return [r[0], r[1],
                  d.ot0 !== undefined ? d.ot0 : b.ot0,
                  d.do !== undefined ? d.do : b.do,
                  d.shag !== undefined ? d.shag : b.shag];
        });
        defs.push([klyuch || '', nadpis, 'para', deti]);
        return;
      }

      if (tip === 'выбор') {
        // Принцип 9: закрытый короткий список — сегментер, длинный — селект.
        var organ = o.organ || (o.iz && o.iz.length <= 5 ? 'segment' : 'select');
        defs.push([klyuch, nadpis, organ, o.iz || [], o.opcii]);
        return;
      }
      if (['color', 'ease', 'toggle', 'otkat', 'palitra', 'datchik'].indexOf(baza.organ) >= 0) {
        defs.push([klyuch, nadpis, o.organ || baza.organ, o.iz || o.podpisi, o.opcii]);
        return;
      }
      if ((o.organ || baza.organ) === 'ugol') {
        defs.push([klyuch, nadpis, 'ugol', o.ot0 !== undefined ? o.ot0 : baza.ot0,
                   o.do !== undefined ? o.do : baza.do]);
        return;
      }
      defs.push([klyuch, nadpis,
                 o.ot0 !== undefined ? o.ot0 : baza.ot0,
                 o.do !== undefined ? o.do : baza.do,
                 o.shag !== undefined ? o.shag : baza.shag,
                 o.opcii]);
    });

    // Датчик на саму таблицу. Считать просто «сколько перебито» мало:
    // стенд имеет право сузить границу по смыслу (принцип 7 — максимум
    // должен что-то значить). Врёт таблица только там, где её диапазон
    // НЕ ВМЕЩАЕТ нужный стенду: тогда перебивка вынужденная.
    var nuzhno = 0, zrya = 0, vsego = 0;
    (zakon || []).forEach(function (s) {
      if (s[0] === 'h') return;
      vsego += 1;
      var o = s[3]; if (!o) return;
      if (o.ot0 === undefined && o.do === undefined && o.shag === undefined) return;
      var b = s[2] === 'доля'
        ? (o.kak === 'доли' || o.kak === '×' ? MNOZHITEL : (OPORY[o.ot] || OPORY['своё']))
        : TABLICA[s[2]];
      if (!b) { nuzhno += 1; return; }
      var vylez = (o.ot0 !== undefined && o.ot0 < b.ot0) ||
                  (o.do !== undefined && o.do > b.do) ||
                  (o.shag !== undefined && o.shag < b.shag);
      vylez ? nuzhno += 1 : zrya += 1;
    });

    izObyavleniya.otchet = { vsego: vsego, nuzhno: nuzhno, zrya: zrya,
                             perebito: nuzhno + zrya, pretenzii: pretenzii };
    StendPanel.pretenzii = pretenzii;
    if (pretenzii.length && typeof console !== 'undefined') {
      console.warn('Объявление · претензии свода (' + pretenzii.length + '):\n' + pretenzii.join('\n'));
    }
    if (typeof console !== 'undefined') {
      console.info('Объявление: ' + vsego + ' ручек · из таблицы ' + (vsego - nuzhno - zrya) +
                   ' · сужено по смыслу ' + zrya + ' · таблица не вместила ' + nuzhno + '.');
    }
    return defs;
  }

  StendPanel.izObyavleniya = izObyavleniya;
  StendPanel.tablicaVelichin = { tipy: TABLICA, opory: OPORY };
})();
