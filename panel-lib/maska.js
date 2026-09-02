/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Выезд строк из-под маски — текст появляется, поднимаясь снизу.

   Снято с kononenkogroup.com (2026-08-25, бюро Кононенко, Nuxt + GSAP).
   Там это связка двух вещей: SplitText режет абзац на строки с параметром
   `mask: "lines"` — каждая строка получает обёртку с `overflow: hidden`, —
   а дальше `gsap.from(строки, { yPercent: 101, stagger, duration })` по
   ScrollTrigger на самом абзаце. Три вещи стоит забрать отдельно:

   1. МАСКА НА СТРОКУ, А НЕ НА АБЗАЦ. Прозрачность и сдвиг всего блока дают
      «блок приехал»; маска на каждой строке даёт «текст набирается» — строки
      выходят из-под собственного края, как из наборной кассы.
   2. 101 %, А НЕ 100. Лишний процент прячет выносные элементы и сглаживание:
      на 100 % из-под края маски подглядывает верхушка «б» и хвост «у».
   3. ЗАДЕРЖКА МЕЖДУ СТРОКАМИ. Одновременный выезд читается как сдвиг блока;
      сдвиг фаз превращает его в последовательность.

   Их тайминги — шкала золотого сечения: Si(k) = 0.1·φ^(k−1) секунд, где
   длительность строки Si(6) ≈ 1.109 с, задержка между строками Si(1) = 0.1 с.
   Здесь время не берётся: у стендов ход задаёт положение, а не таймер, поэтому
   доля выезда приходит снаружи числом 0…1. Кому нужен таймер — гоните долю
   по времени сами.

   Пуск:
     var stroki = StendMaska.rezat(el);           // режет на строки под масками
     StendMaska.pokazat(stroki, p, { sdvig: 0.45, izing: fn });
     StendMaska.snyat(el);                        // вернуть исходный текст

   rezat идемпотентен: повторный вызов сначала возвращает текст и режет заново —
   строки зависят от ширины, поэтому резать надо после каждой перекладки.      */
(function () {
  var STIL = '.st-ms{display:block;overflow:hidden}' +
             '.st-ms>i{display:block;font-style:inherit;will-change:transform}';

  function stil() {
    if (document.getElementById('st-maska-css')) return;
    var s = document.createElement('style');
    s.id = 'st-maska-css'; s.textContent = STIL;
    document.head.appendChild(s);
  }

  /* Строки ищутся замером слов: слово оборачивается, читается его верх,
     соседние слова с общим верхом — одна строка. Другого способа узнать
     разбивку нет: её делает браузер, и до отрисовки её никто не знает. */
  function rezat(el) {
    stil();
    var ishod = el.getAttribute('data-maska') != null
      ? el.getAttribute('data-maska') : el.textContent;
    el.setAttribute('data-maska', ishod);

    // жёсткий перенос в исходнике — свой знак: иначе при пересборке слов
    // авторская разбивка пропала бы и строки легли бы иначе
    var toki = [];
    ishod.split(/\n|\u2028/).forEach(function (kus, k) {
      if (k) toki.push('\n');
      // неразрывный пробел — не разделитель: им набор держит предлог при
      // слове и тире при слове; \s его ловит, а резать по нему нельзя
      kus.split(/[^\S\u00a0]+/).filter(Boolean).forEach(function (w) { toki.push(w); });
    });
    if (!toki.length) return [];
    el.textContent = '';
    var probe = [];
    toki.forEach(function (w, i) {
      if (w === '\n') { el.appendChild(document.createElement('br')); probe.push(null); return; }
      var sp = document.createElement('span');
      sp.textContent = w;
      el.appendChild(sp);
      if (i < toki.length - 1 && toki[i + 1] !== '\n') el.appendChild(document.createTextNode(' '));
      probe.push(sp);
    });
    var stroki = [], verh = null, razryv = false;
    probe.forEach(function (sp) {
      if (!sp) { razryv = true; return; }
      var t = sp.offsetTop;
      if (verh === null || razryv || Math.abs(t - verh) > 1) { stroki.push([]); verh = t; razryv = false; }
      stroki[stroki.length - 1].push(sp.textContent);
    });

    el.textContent = '';
    var vnutr = [];
    stroki.forEach(function (words) {
      var m = document.createElement('span');
      m.className = 'st-ms';
      var i = document.createElement('i');
      i.textContent = words.join(' ');
      m.appendChild(i); el.appendChild(m);
      vnutr.push(i);
    });
    return vnutr;
  }

  function snyat(el) {
    var ishod = el.getAttribute('data-maska');
    if (ishod == null) return;
    el.textContent = ishod;
    el.removeAttribute('data-maska');
  }

  /* Доля выезда p (0 — всё под маской, 1 — всё на месте). sdvig — какая часть
     пути уходит на расхождение строк: 0 — все выезжают разом, 0.9 — почти
     строго друг за другом. storona — с какой стороны маски прячется строка:
     'sniz' (по умолчанию) — приходит снизу и туда же уходит, 'sverh' — сверху.
     Одним и тем же вызовом делается и появление, и уход: меняется сторона. */
  function pokazat(stroki, p, o) {
    o = o || {};
    var n = stroki.length; if (!n) return;
    var sdvig = Math.max(0, Math.min(0.95, o.sdvig == null ? 0.45 : o.sdvig));
    var shag = n > 1 ? sdvig / (n - 1) : 0;
    var okno = 1 - sdvig;
    for (var i = 0; i < n; i++) {
      var q = okno > 0 ? (p - i * shag) / okno : (p >= 1 ? 1 : 0);
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      if (o.izing) q = o.izing(q);
      var y = (1 - q) * 101 * (o.storona === 'sverh' ? -1 : 1);   // 101: прячем выносные
      var s = stroki[i].style;
      var was = stroki[i]._y;
      if (was === undefined || Math.abs(was - y) > 0.05) {
        s.transform = y ? 'translate3d(0,' + y.toFixed(2) + '%,0)' : '';
        stroki[i]._y = y;
      }
      /* СПРЯТАНА — ЗНАЧИТ НЕТ. Уведённая на 101 % строка стоит в 0,8 px от края
         маски, а маска лежит на дробной координате: интерлиньяж выведен из
         модуля и целым не бывает. Компоновщик округляет край клипа до пиксела,
         и в этот зазор просачивается волосяная полоска ножек букв. Поэтому
         на нуле строка не просто сдвинута, а снята с отрисовки; на любой
         доле выше нуля — снова видима. // без ручки */
      var skryt = q <= 0;
      if (stroki[i]._skryt !== skryt) { s.visibility = skryt ? 'hidden' : ''; stroki[i]._skryt = skryt; }
    }
  }

  window.StendMaska = { rezat: rezat, snyat: snyat, pokazat: pokazat };
})();
