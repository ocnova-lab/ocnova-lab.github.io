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
    'длина':    { organ: 'слайдер', ot0: 0, do: 160, shag: 1, edinica: 'px' },
    'время':    { organ: 'слайдер', ot0: 0, do: 1500, shag: 20, edinica: 'мс', trebuet: 'кривая' },
    'острота':  { organ: 'слайдер', ot0: 0, do: 1, shag: 0.05, edinica: '', trebuet: 'датчик' },
    'инерция':  { organ: 'слайдер', ot0: 0, do: 95, shag: 1, edinica: '%', trebuet: 'сила' },
    'сила':     { organ: 'слайдер', ot0: 0, do: 100, shag: 5, edinica: '%' },
    'счёт':     { organ: 'слайдер', ot0: 1, do: 12, shag: 1, edinica: '' },
    'угол':     { organ: 'ugol', ot0: 0, do: 90, shag: 1, edinica: '°' },
    'порог':    { organ: 'слайдер', ot0: 320, do: 1200, shag: 10, edinica: 'px' },
    'скорость': { organ: 'слайдер', ot0: -200, do: 200, shag: 1, edinica: 'px/с' },
    'цвет':     { organ: 'color', edinica: '' },
    'кривая':   { organ: 'ease', edinica: '' },
    'двоичное': { organ: 'toggle', edinica: '' },
    'выбор':    { organ: null, edinica: '' }, // орган выбирается по числу вариантов
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

      if (tip === 'выбор') {
        // Принцип 9: закрытый короткий список — сегментер, длинный — селект.
        var organ = o.organ || (o.iz && o.iz.length <= 5 ? 'segment' : 'select');
        defs.push([klyuch, nadpis, organ, o.iz || [], o.opcii]);
        return;
      }
      if (baza.organ === 'color' || baza.organ === 'ease' || baza.organ === 'toggle') {
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

    // Счётчик перебитых границ: сколько раз таблица не подошла. Растёт —
    // значит стартовые числа в таблице врут и их надо чинить, а не терпеть.
    var perebito = (zakon || []).filter(function (s) {
      return s[0] !== 'h' && s[3] && (s[3].ot0 !== undefined || s[3].do !== undefined || s[3].shag !== undefined);
    }).length;
    var vsego = (zakon || []).filter(function (s) { return s[0] !== 'h'; }).length;

    izObyavleniya.otchet = { vsego: vsego, perebito: perebito, pretenzii: pretenzii };
    StendPanel.pretenzii = pretenzii;
    if (pretenzii.length && typeof console !== 'undefined') {
      console.warn('Объявление · претензии свода (' + pretenzii.length + '):\n' + pretenzii.join('\n'));
    }
    if (typeof console !== 'undefined') {
      console.info('Объявление: ' + vsego + ' ручек, границы из таблицы у ' +
                   (vsego - perebito) + ', перебито вручную ' + perebito + '.');
    }
    return defs;
  }

  StendPanel.izObyavleniya = izObyavleniya;
  StendPanel.tablicaVelichin = { tipy: TABLICA, opory: OPORY };
})();
