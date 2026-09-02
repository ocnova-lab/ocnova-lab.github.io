/* © Сергей Гуров, 2026 · панель стендов — библиотека органов управления · stendy.vercel.app */
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
          edinica — перебить единицу в подписи, '' — убрать;
          gde — место, где закон действует (см. МЕСТА ниже);
          ot у остроты/хода — опора отношения: относительно чего градиент
          (ось|место|фаза|сосед|объект|край); границ не двигает, только
          называет — замер 01.09: девять величин меряют отношение, ни одна
          не сказала, к чему;
          pri — фаза: величина живёт, пока условие верно (см. ФАЗА ниже).

   МЕСТА (ход 2, 2026-09-01). Второй аргумент — словарь мест стенда:
     StendPanel.izObyavleniya(ZAKON, MESTA)
   Отсюда карта «место → законы» приезжает даром: StendPanel.karta.       */
(function () {
  // Границы — медианы фактических диапазонов работающих стендов.
  // Это стартовый набор: стенд перебивает своё через ot0/do/shag.
  /* ШАГ НЕ ХРАНИТСЯ. Принцип 8 свода: шаг равен минимальному различимому
     глазом изменению — значит он зависит от диапазона, а не от типа. Шаг 20 мс
     разумен на 0…3000 и груб вдесятеро на 0…300. Замер двух стендов: из 29
     промахов таблицы 12 были только по шагу, и все — из-за хранимого числа.
     Считаем: сотая доля диапазона, округлённая ВНИЗ до круглого (1, 2, 5).
     Вниз, потому что стенду законно огрубить шаг под ощущение, а вот
     доточить его до нужного — это уже чинить дефект таблицы.
     minShag — там, где мельче не бывает по природе величины (штуки, градусы). */
  function shagIzDiapazona(ot0, doo, minShag) {
    var d = Math.abs(doo - ot0) / 100;
    if (!(d > 0)) return minShag || 1;
    var p10 = Math.pow(10, Math.floor(Math.log(d) / Math.LN10));
    var m = d / p10;
    var shag = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p10;
    return Math.max(shag, minShag || 0);
  }

  var TABLICA = {
    // «Длина» оказалась слишком широка: замер 54 длин показал пять разных
    // назначений с разными диапазонами. Один тип на все пять не работает —
    // в diagonal из-за этого перебивались руками две трети границ.
    'кегль':    { organ: 'слайдер', ot0: 6, do: 48, edinica: 'px' },
    // Титульные кегли живут в другом порядке величин: 20…140 против 8…40.
    'кегль крупный': { organ: 'слайдер', ot0: 12, do: 200, edinica: 'px' },
    'зазор':    { organ: 'слайдер', ot0: 0, do: 120, edinica: 'px' },
    'поле':     { organ: 'слайдер', ot0: 0, do: 400, edinica: 'px' },
    'путь':     { organ: 'слайдер', ot0: 0, do: 2000, edinica: 'px' },
    'размер':   { organ: 'слайдер', ot0: 20, do: 800, edinica: 'px' },
    'длина':    { organ: 'слайдер', ot0: 0, do: 160, edinica: 'px' }, // общий случай
    'кернинг':  { organ: 'слайдер', ot0: -0.1, do: 0.5, edinica: 'доли кегля' },
    'время':    { organ: 'слайдер', ot0: 0, do: 2000, edinica: 'мс', trebuet: 'кривая' },
    // Острота идёт от нуля вверх, ход — в обе стороны от нуля. Разные вещи:
    // сваленные в один тип, они дают лишнюю перебивку на каждой оси.
    // Острота и ход меряют то же, что доля: положение на градиенте
    // относительно чего-то. Доля опору требует жёстко, эти двое молчали —
    // потому ot обязателен и здесь. Границ опора НЕ двигает (0…1 и −1…1
    // остаются): она только называет, к чему отношение.
    'острота':  { organ: 'слайдер', ot0: 0, do: 1, edinica: '', trebuet: 'датчик', otnositelno: true },
    'ход':      { organ: 'слайдер', ot0: -1, do: 1, edinica: '', trebuet: 'датчик', otnositelno: true },
    'инерция':  { organ: 'слайдер', ot0: 0, do: 100, edinica: '%', trebuet: 'сила' },
    'сила':     { organ: 'слайдер', ot0: 0, do: 100, edinica: '%' },
    'счёт':     { organ: 'слайдер', ot0: 0, do: 12, minShag: 1, edinica: '' },
    // Круговой орган по умолчанию СВОБОДЕН: полный круг 0…360. Так было
    // записано в каталоге органов с самого начала («сектор задаётся
    // только если он есть по смыслу»), а таблица разошлась с этим,
    // взяв 0…90 из медиан замера. Выровнено 02.09 по слову Сергея:
    // сектор ставит дизайнер на своём стенде перебивкой ot0/do,
    // библиотека круг не зажимает.
    'угол':     { organ: 'ugol', ot0: 0, do: 360, minShag: 1, edinica: '°' },
    'порог':    { organ: 'слайдер', ot0: 320, do: 1200, edinica: 'px' },
    'скорость': { organ: 'слайдер', ot0: -200, do: 200, edinica: 'px/с' },
    'цвет':     { organ: 'color', edinica: '' },
    'гарнитура': { organ: 'garnitura', edinica: '' }, // шрифт из алфавита свода + личного набора; с k:'этаж' — шрифт стиля
    'палитра':  { organ: 'palitra', edinica: '' },
    // Семейство оттенков формулой (косинусный градиент Килеза), а не
    // перечнем: палитра-закон для шкал; списочная палитра остаётся там,
    // где цвета названы поимённо. Значение: [пресет, середина, размах,
    // частота, сдвиг]; вычислитель — StendPanel.gradient(z).
    'градиент': { organ: 'gradient', edinica: '' },
    'датчик':   { organ: 'datchik', edinica: '' },
    'кривая':   { organ: 'ease', edinica: '' },
    'двоичное': { organ: 'toggle', edinica: '' },
    'выбор':    { organ: null, edinica: '' }, // орган выбирается по числу вариантов
    // Этажность. Лонгрид верстается этажами: закон один на всех, этаж может
    // отступить. «этажи» ставит инспектор (кто сейчас правится), а величина
    // с пометкой k:'этаж' собирается органом наследования вместо слайдера.
    'этажи':    { organ: 'inspektor', edinica: '' },
    'пара':     { organ: 'para', edinica: '' }, // две родственные величины в строке
    'откат':    { organ: 'otkat', edinica: '' },
    // Время в руку: скраб фазы + пуск + временная лупа. Фазу считает
    // стенд (контракт faza/pusk/zamedli в opcii) — как попадание у
    // канвасных мест. Первый орган, показывающий время как время.
    'скраб':    { organ: 'skrab', edinica: '' },
  };

  // Доля — единственный тип, у которого границы зависят от опоры.
  // Опора обязательна: «доля» без ответа на вопрос «от чего» — это не доля.
  var OPORY = {
    'ширина':  { ot0: 1.5, do: 70, edinica: '% ширины' },
    'кегль':   { ot0: 0, do: 260, edinica: '% кегля' },
    'высота':  { ot0: 0, do: 150, edinica: '% высоты' },
    'экран':   { ot0: 0, do: 100, edinica: '% экрана' },
    'строка':  { ot0: 0, do: 100, edinica: '% строки' },
    'колонка': { ot0: 0, do: 200, edinica: '% колонки' },
    'лента':   { ot0: 20, do: 100, edinica: '% ленты' },
    'знак':    { ot0: 8, do: 60, edinica: 'знаков' },
    // Группа с ведущим: величина ведомого элемента меряется от ведущего
    // соседа, не от формата. Первое употребление — отбивка даты от кегля
    // титула (gorizont, 02.09): растёт титул — растёт отбивка.
    'сосед':   { ot0: 0, do: 200, edinica: '% кегля соседа' },
    'своё':    { ot0: 0, do: 100, edinica: '%' }, // «своё» — свалка: опору надо называть
  };
  // Множитель — та же доля, записанная не процентом: интерлиньяж 1.26.
  var MNOZHITEL = { ot0: 0, do: 3 };

  // Опоры отношения (для остроты и хода). Сняты с фактического употребления
  // девяти величин трёх стендов, не придуманы. Список открытый: неизвестное
  // имя даёт претензию, по её росту видно, что опор не хватает.
  //   ось — расстояние до объявленной оси; место — позиция в потоке или
  //   ленте; фаза — положение внутри самого перехода.
  var OPORY_OTNOSHENIYA = ['ось', 'место', 'фаза', 'сосед', 'объект', 'край'];

  function podpis(imya, edinica) {
    return edinica ? imya + ', ' + edinica : imya;
  }

  function izObyavleniya(zakon, mestaObj) {
    var defs = [], pretenzii = [], sekcii = [], tek = { imya: '(без секции)', tipy: {} };

    /* ── МЕСТА ────────────────────────────────────────────────────────
       Закон знает, где действует. Место объявляется ОДИН РАЗ и по имени:
       имя читает человек (оно уйдёт в строку состояния), селектор — машина.
       Дальше величина ссылается на имя — той же рукой, какой доля ссылается
       на опору: «доля ЧЕГО» ↔ «закон ГДЕ».

         mesta: { 'Строка': '.line', 'Картинка': ['.pic', '#thumb'] }

         ['BULGE', 'Пузырь', 'сила', { gde: 'Строка' }]
         ['h', 'Волна', { gde: 'Строка' }]           // на всю секцию разом
         ['PAPER', 'Бумага', 'цвет', { gde: null }]  // отписаться от секции
         { gde: ['Строка', 'Картинка'] }             // закон правит двумя

       Последняя строка — не оговорка, а суть замысла: у элемента своих
       настроек нет. Его положение складывают несколько законов, и каждый
       из них правит ещё сотней элементов. Зазор у картинки виден и со
       стороны строки, и со стороны картинки — он в обоих местах.
       Закон без gde действует везде и в сужение по месту не попадает.

       Канвасный стенд DOM не имеет: там вместо селектора функция
       (x, y) → true, попадание считает сам стенд.                      */
    var mesta = {}, imenaMest = Object.keys(mestaObj || {});
    var vMeste = {}, uZakona = {}, sekciyaZakona = {}, vezde = [], zayavleno = {};
    /* Место с этажом: у именованных этажей страницы (инспектор) клик по
       месту ставит ещё и адрес правки — рамка п.3: иначе после клика
       правишь этаж незаметно. Форма: { gde: 'h1', etazh: 'zagolovok' }.
       Селектор и функция без этажа остаются как были. */
    var etazhMesta = {};
    imenaMest.forEach(function (m) {
      var g = mestaObj[m];
      if (g && typeof g === 'object' && !Array.isArray(g)) {
        if (g.etazh) etazhMesta[m] = g.etazh;
        g = g.gde;
      }
      mesta[m] = typeof g === 'function' ? g : [].concat(g);
      vMeste[m] = [];
    });
    function pripisat(s, imyaSekcii, gdeSekcii) {
      var klyuch = s[0], o = s[3] || {};
      var g = o.gde !== undefined ? o.gde : gdeSekcii;
      sekciyaZakona[klyuch] = imyaSekcii;
      if (g === null || g === undefined) { vezde.push(klyuch); uZakona[klyuch] = []; return; }
      // Неизвестное имя до карты не доходит: пусть закон лучше окажется
      // ничьим и это будет видно, чем карта начнёт ссылаться на место,
      // которого нет. Об опечатке кричит претензия — но только если
      // места вообще объявлены, иначе о том же скажет одна общая.
      var spisok = [].concat(g).filter(function (m) {
        if (vMeste[m]) return true;
        if (imenaMest.length) {
          pretenzii.push('закон ' + klyuch + ' отправлен в место «' + m +
                         '», которого нет в объявлении мест');
        }
        return false;
      });
      uZakona[klyuch] = spisok;
      zayavleno[klyuch] = [].concat(g);   // что автор написал — для общей претензии
      spisok.forEach(function (m) { vMeste[m].push(klyuch); });
    }

    /* ── ФАЗА ─────────────────────────────────────────────────────────
       Переключатель меняет род поведения, и часть ручек в новой фазе
       ничего не делает. Стенды прятали такие ручки руками (gorizont —
       через hidden на нерабочей стороне каталога); pri говорит то же
       самое в объявлении: величина живёт, пока условие верно.

         pri: 'hexSnd'                          // пока hexSnd истинно
         pri: { hexSnd: false }                 // пока выключено
         pri: { compType: 'волна' }             // при этом значении выбора
         pri: { compType: ['волна', 'сдвиг'] }  // при любом из
         ['h', 'Звук', { pri: 'hexSnd' }]       // на всю секцию разом

       Секционная форма работает как gde: строка наследует условие секции,
       pri: null отписывает. Гасит строки панель (perestroitVid), значение
       погашенной ручки не трогается — вернётся с ней. */
    var zhivet = {}, hozyaeva = {}, opora = {}, klyuchiZakona = {};

    // Первый проход: из чего состоит каждая секция — для проверки обязательств,
    // где действует каждый закон — для карты мест, при чём живёт — для фазы.
    var gdeSekcii = null, priSekcii = null, inspektorKlyuch = null;
    (zakon || []).forEach(function (s) {
      if (s[0] === 'h') {
        sekcii.push(tek); tek = { imya: s[1], tipy: {} };
        gdeSekcii = s[2] && s[2].gde !== undefined ? s[2].gde : null;
        priSekcii = s[2] && s[2].pri !== undefined ? s[2].pri : null;
        return;
      }
      tek.tipy[s[2]] = (tek.tipy[s[2]] || 0) + 1;
      if (s[3] && s[3].organ === 'datchik') tek.tipy['датчик'] = (tek.tipy['датчик'] || 0) + 1;
      if (s[2] === 'этажи' && !inspektorKlyuch) inspektorKlyuch = s[0];
      pripisat(s, tek.imya, gdeSekcii);
      klyuchiZakona[s[0]] = 1;
      if (s[3] && s[3].ot) opora[s[0]] = s[3].ot;
      var u = (s[3] && s[3].pri !== undefined) ? s[3].pri : priSekcii;
      if (u !== null && u !== undefined) zhivet[s[0]] = u;
    });
    sekcii.push(tek);

    // Хозяин фазы обязан быть объявлен тем же законом — иначе условие
    // никогда не переключить с панели, ручка гаснет навсегда.
    Object.keys(zhivet).forEach(function (k) {
      var u = zhivet[k];
      var hozy = typeof u === 'string' ? [u]
        : (u && typeof u === 'object' ? Object.keys(u) : []);
      hozy.forEach(function (h) {
        if (!klyuchiZakona[h]) {
          pretenzii.push('закон ' + k + ' живёт при «' + h + '», которого нет в объявлении');
        }
        (hozyaeva[h] = hozyaeva[h] || []).push(k);
      });
    });

    /* Претензии двух сортов. Нарушенное обязательство (время без кривой,
       острота без датчика, инерция без силы) чинится не подстановкой
       слова — переделывается устройство эффекта. Такие идут первыми:
       в длинном списке их нельзя хоронить под пропущенными единицами. */
    var tyazhkie = [];
    sekcii.forEach(function (sk) {
      Object.keys(sk.tipy).forEach(function (t) {
        var nado = (TABLICA[t] || {}).trebuet;
        if (!nado) return;
        var est = sk.tipy[nado] || (nado === 'датчик' ? sk.tipy['датчик'] : 0);
        if (!est) tyazhkie.push('«' + sk.imya + '»: ' + sk.tipy[t] + '×' + t + ' без «' + nado + '»');
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

      if (baza.otnositelno) {
        if (!o.ot) pretenzii.push(tip + ' без опоры: ' + klyuch + ' — относительно чего?');
        else if (OPORY_OTNOSHENIYA.indexOf(o.ot) < 0) {
          pretenzii.push('опора отношения «' + o.ot + '» не из свода (' + klyuch + ')');
        }
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
        var klo = o.ot0 !== undefined ? o.ot0 : baza.ot0;
        var khi = o.do !== undefined ? o.do : baza.do;
        defs.push([klyuch, nadpis, 'koridor', klo, khi,
                   o.shag !== undefined ? o.shag : shagIzDiapazona(klo, khi, baza.minShag)]);
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
          var plo = d.ot0 !== undefined ? d.ot0 : b.ot0;
          var phi = d.do !== undefined ? d.do : b.do;
          return [r[0], r[1], plo, phi,
                  d.shag !== undefined ? d.shag : shagIzDiapazona(plo, phi, b.minShag)];
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
      var tipy = (typeof StendPanel !== 'undefined' && StendPanel.tipy) || {};
      if (tip === 'этажи' && !tipy.inspektor) {
        pretenzii.push('«этажи» (' + klyuch + ') требуют /panel-lib/inspektor.js — строка пропущена');
        return;
      }
      if (o.k === 'этаж' && !tipy.nasledovanie) {
        pretenzii.push('этажная величина ' + klyuch + ' требует /panel-lib/nasledovanie.js — собрана обычной ручкой');
        o = Object.assign({}, o); delete o.k;
      }
      if (o.k === 'этаж' && tip === 'цвет') {
        defs.push([klyuch, nadpis, 'nasledovanie', 'color']);
        return;
      }
      /* Шрифт этажа — сердце шрифтового СТИЛЯ (рамка 02.09): стиль — это
         именованный этаж типографики, гарнитура наследуется как кегль.
         Список даёт орган гарнитуры (алфавит + личный набор из витрины),
         стенд может сузить его своим iz. */
      if (o.k === 'этаж' && tip === 'гарнитура') {
        defs.push([klyuch, nadpis, 'nasledovanie', 'vybor', o.iz || 'garnitura']);
        return;
      }
      if (['color', 'ease', 'toggle', 'otkat', 'palitra', 'datchik', 'inspektor',
           'garnitura', 'gradient', 'skrab'].indexOf(baza.organ) >= 0) {
        defs.push([klyuch, nadpis, o.organ || baza.organ, o.iz || o.podpisi, o.opcii]);
        return;
      }
      if ((o.organ || baza.organ) === 'ugol') {
        defs.push([klyuch, nadpis, 'ugol', o.ot0 !== undefined ? o.ot0 : baza.ot0,
                   o.do !== undefined ? o.do : baza.do]);
        return;
      }
      var lo = o.ot0 !== undefined ? o.ot0 : baza.ot0;
      var hi = o.do !== undefined ? o.do : baza.do;
      var sh = o.shag !== undefined ? o.shag : shagIzDiapazona(lo, hi, baza.minShag);
      if (o.k === 'этаж') {
        defs.push([klyuch, nadpis, 'nasledovanie', lo, hi, sh]);
        return;
      }
      defs.push([klyuch, nadpis, lo, hi, sh, o.opcii]);
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
                  false;
      vylez ? nuzhno += 1 : zrya += 1;
    });

    /* «Своё» помечено в таблице опор как свалка — и до сих пор проходило
       бесплатно: претензия «доля без опоры» ловит только отсутствие ot.
       Замер 01.09: 14 долей из 32 сидят на «своё». Претензия одна сводная:
       четырнадцать строк шума в консоли прочитаны не будут. Менять опору
       в стендах — отдельным решением: настоящая опора двигает границы
       (своё 0…100, колонка 0…200), каждую надо смотреть глазами. */
    var svalka = (zakon || []).filter(function (s) {
      return s[0] !== 'h' && s[2] === 'доля' && s[3] && s[3].ot === 'своё';
    }).map(function (s) { return s[0]; });
    if (svalka.length) {
      var nS = svalka.length;
      pretenzii.push('доля от «своё» у ' + nS +
                     (nS % 10 === 1 && nS % 100 !== 11 ? ' закона' : ' законов') +
                     ' — опора не названа, границы взяты общие 0…100%: ' + svalka.join(', '));
    }

    /* Обязательство мест. Пустое место — тупик: клик по нему откроет
       панель, в которой нечего крутить. Молчать об этом нельзя, поэтому
       оно идёт в претензии наравне со «временем без кривой». */
    imenaMest.forEach(function (m) {
      if (!vMeste[m].length) {
        pretenzii.push('место «' + m + '» объявлено, но ни один закон в нём не ' +
                       'действует: клик по нему откроет пустую панель');
      }
    });
    /* Этаж места должен существовать: без инспектора адрес некуда
       ставить, с чужим id клик выбирал бы несуществующий этаж. */
    var etazhImena = Object.keys(etazhMesta);
    if (etazhImena.length && !inspektorKlyuch) {
      pretenzii.push('места называют этажи (' + etazhImena.join(', ') +
                     '), а величины типа «этажи» в объявлении нет — адрес некуда ставить');
    } else if (inspektorKlyuch) {
      var punkty = {};
      (zakon || []).forEach(function (z) {
        if (z[0] !== inspektorKlyuch) return;
        var iz = (z[3] && z[3].iz) || [];
        iz.forEach(function (r) { punkty[Array.isArray(r) ? r[0] : r] = 1; });
      });
      if (Object.keys(punkty).length) {
        etazhImena.forEach(function (m) {
          if (!punkty[etazhMesta[m]]) {
            pretenzii.push('место «' + m + '» называет этаж «' + etazhMesta[m] +
                           '», которого нет в инспекторе');
          }
        });
      }
    }

    if (!imenaMest.length) {
      var bezhozyaina = Object.keys(zayavleno);
      if (bezhozyaina.length) {
        var n = bezhozyaina.length;
        pretenzii.push('gde стоит у ' + n + (n % 10 === 1 && n % 100 !== 11 ? ' закона' : ' законов') +
                       ', а мест не объявлено: второй аргумент izObyavleniya(ZAKON, MESTA)');
      }
    }

    // тяжёлые вперёд; лёгкие (подстановки: опора, единица, имя) — следом
    var podstanovki = pretenzii;
    pretenzii = tyazhkie.concat(podstanovki);

    izObyavleniya.otchet = { vsego: vsego, nuzhno: nuzhno, zrya: zrya,
                             perebito: nuzhno + zrya, pretenzii: pretenzii,
                             tyazhkie: tyazhkie, podstanovki: podstanovki };
    StendPanel.pretenzii = pretenzii;

    /* ── КАРТА МЕСТ ───────────────────────────────────────────────────
       Всё, что понадобится сужению по клику, известно уже здесь: в каком
       месте какие законы, в какой секции каждый закон, какие законы
       действуют везде. Панель ищет строку по data-k — ключ на строке уже
       стоит, поэтому третьему ходу останется только прятать строки.       */
    var karta = {
      mesta: imenaMest,          // имена в порядке объявления
      gde: mesta,                // имя → [селектор, …] либо функция стенда
      vMeste: vMeste,            // место → [ключи законов]
      uZakona: uZakona,          // ключ закона → [места]
      sekciya: sekciyaZakona,    // ключ закона → имя секции
      vezde: vezde,              // законы без места: цвет бумаги, язык, тема
      opora: opora,              // ключ → названная опора (доли и отношения)
      zhivet: zhivet,            // ключ → условие фазы (pri)
      hozyaeva: hozyaeva,        // хозяин фазы → чьи ручки он гасит
      etazh: etazhMesta,         // место → id этажа (адрес правки по клику)
      inspektor: inspektorKlyuch, // ключ величины типа «этажи», если есть
    };

    /* ЗАМЕР. Имя места пишет человек, а находит его машина — и между
       ними ошибка: опечатка в селекторе, переименованный класс, элемент,
       которого на этом стенде уже нет. Проверяется это только счётом
       живых элементов, поэтому замер стоит рядом с картой, а не в голове
       у автора. Второе, что он ловит: закон приписан к месту, но до
       панели не доехал (опечатка в ключе) — тогда место обещает ручку,
       которой нет. */
    karta.zamer = function () {
      var stroki = {}, pan = null;
      try { pan = document.querySelector('.st-panel'); } catch (e) {}
      if (pan) {
        [].forEach.call(pan.querySelectorAll('[data-k]'), function (r) { stroki[r.dataset.k] = 1; });
      }
      var po = imenaMest.map(function (m) {
        var g = mesta[m], naideno = null, kak, chitaetsya = true;
        if (typeof g === 'function') {
          kak = 'считает стенд';
        } else {
          kak = g.join(', '); naideno = 0;
          g.forEach(function (sel) {
            try { naideno += document.querySelectorAll(sel).length; }
            catch (e) { chitaetsya = false; }
          });
        }
        return { mesto: m, kak: kak, naideno: naideno, chitaetsya: chitaetsya,
                 zakony: vMeste[m] };
      });
      var poteryany = pan ? Object.keys(uZakona).filter(function (k) {
        return uZakona[k].length && !stroki[k];
      }) : [];
      return { mesta: po, poteryany: poteryany, panelNaidena: !!pan };
    };

    /* Показ — не украшение отчёта, а единственный способ увидеть карту до
       того, как появится клик по макету: третий ход ещё не написан, а
       проверять связь «место → законы» надо уже сейчас. */
    karta.pokazat = function () {
      var z = karta.zamer();
      if (typeof console === 'undefined') return z;
      var lines = z.mesta.map(function (r) {
        var skolko = !r.chitaetsya ? 'селектор не читается'
          : r.naideno === null ? 'считает стенд'
          : r.naideno + ' в макете';
        return '  ' + r.mesto + ' (' + r.kak + ') · ' + skolko + ' · ' +
               (r.zakony.length ? 'законов ' + r.zakony.length + ': ' + r.zakony.join(', ')
                                : 'законов нет');
      });
      if (vezde.length) lines.push('  везде (без места): ' + vezde.join(', '));
      z.mesta.forEach(function (r) {
        if (r.chitaetsya && r.naideno === 0) {
          lines.push('  ! «' + r.mesto + '» сейчас ничего не находит — стенд, ' +
                     'возможно, строит его позже; повторить: StendPanel.karta.pokazat()');
        }
      });
      if (z.poteryany.length) {
        lines.push('  ! приписаны к месту, но до панели не доехали: ' + z.poteryany.join(', '));
      }
      console.info('Места стенда (' + imenaMest.length + '):\n' + lines.join('\n'));
      return z;
    };

    StendPanel.karta = karta;
    /* Замер откладывается до загрузки: стенд строит строки и картинки уже
       после разбора объявления, и мгновенный замер соврал бы нулями.
       400 мс — не закон, а отступ на сборку; счёт можно повторить рукой. */
    if (imenaMest.length && typeof window !== 'undefined') {
      var pusk = function () { setTimeout(karta.pokazat, 400); };
      if (document.readyState === 'complete') pusk();
      else window.addEventListener('load', pusk);
    }
    if (pretenzii.length && typeof console !== 'undefined') {
      var kusok = [];
      if (tyazhkie.length && podstanovki.length) {
        kusok.push('— требуют переписывания закона (' + tyazhkie.length + '):');
        kusok.push(tyazhkie.join('\n'));
        kusok.push('— чинятся подстановкой (' + podstanovki.length + '):');
        kusok.push(podstanovki.join('\n'));
      } else {
        kusok.push(pretenzii.join('\n'));
      }
      console.warn('Объявление · претензии свода (' + pretenzii.length + '):\n' + kusok.join('\n'));
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
