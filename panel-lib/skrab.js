/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод «Основа» · stendy.vercel.app */
/* Скраб перехода — время в руку. Ручки длительностей и кривых меряют
   переход числами, а глаз видит его только на полной скорости: «кручу
   цифры, движения не вижу». Скраб отдаёт фазу перехода руке — тяни
   ползунок, стой в любом кадре, сравнивай кривые. Рядом замедлитель
   (временная лупа) и пуск: настроил — тут же прогнал, туда и обратно.

   Орган ничего не знает про устройство перехода — фазу СЧИТАЕТ СТЕНД,
   как попадание у канвасных мест. Контракт (все поля в opcii):

     faza(q)     — поставить переход в фазу q (0…1) рукой; стенд сам
                   решает, как разложить q на свои движения
     faza(null)  — рука отпустила. СТОП-КАДР: кадр стоит, ход не идёт —
                   закон Сергея 02.09: «либо стоп-кадр и бегунок остаётся,
                   либо бегунок едет к одной из позиций; иначе рассинхрон
                   между тем, что я вижу, и позицией бегунка»
     pusk(cel)   — прогнать переход целиком (true — туда, false — обратно)
     zamedli(M)  — временная лупа: живой ход в M раз медленнее
     imya        — имя перехода: оно уходит в адрес момента
     srez(q)     — срез фаз всех движений в момент q, текстом
     tek()       — { q, idet }: текущий прогресс перехода и идёт ли ход.
                   Пока рука не на бегунке, орган отражает q стенда:
                   прогон везёт бегунок, смена состояния стендом (клик,
                   жест) возвращает его к правде — бегунок не врёт
     kino(vkl)   — аналоговый режим «кино по скроллу»: стенд отдаёт
                   колесо фазе перехода — сколько проскролил, столько
                   и проигралось, назад и вперёд, с любой скоростью.
                   Покадровый досмотр без бегунка; выключение — стоп-кадр

   Пока идёт взаимодействие (рука, скролл) и кадр стоит внутри перехода,
   срез показывается и НА ЭКРАНЕ — бейджем поверх макета: глазам не надо
   бегать между движением и панелью. Клик по бейджу копирует момент.

   ДОРОЖКИ ФАЗ (10.09, порт плеера Миши «Player + Phases»). Срез говорит
   словами, какая фаза идёт, — но соотношение фаз словами не показать:
   какая начинается раньше, какая длиннее, где они кроются друг на друга.
   Дорожка на фазу и общее время под ними это показывают глазом. Наши фазы
   не пакуются подряд, как у него: переход стенда идёт ПАРАЛЛЕЛЬНО, у каждой
   нитки свой старт и своя длительность, оттого старт объявляется отдельно.
   Плеер и полоса времени — одно: плейхед идёт поверх дорожек, и видно не
   «сколько прошло», а «что сейчас движется».

     dorozhki: [{ ms: 'ключ', imya: 'наводка', ot: 'ключ' | число },   // своё время
                { ot: 'ключ', do: 'ключ', imya: 'ярлыки' },           // от … до, % хода
                { skonca: 'ключ', imya: 'фото' },                     // последние N % хода
                { seredina: 'ключ', dlina: 'ключ', imya: 'подмена' }, // серединой и длиной
                { seredina: 'ключ', dlina: 'ключ', nazad: true }]     // то же, зеркально
     vsego:    ключ или число общего времени; без него — самый дальний конец

   Фаза живёт своим временем или долей общего хода (П2). Своё время — `ms` в
   миллисекундах; доля — в процентах хода, и тут ФАЗА ЧИТАЕТСЯ ТАК, КАК ОНА
   ОБЪЯВЛЕНА, а не так, как удобно дорожке. Каждый способ задать окно есть
   решение о законе: `ot`…`do` — когда важно начало («ярлыки приходят с 45 %
   хода»); `skonca` — когда важен конец («фото открыто к концу»: правка доли
   двигает начало, конец стоит); `seredina`+`dlina` — когда фаза стоит вокруг
   своей точки («подмена на 50 % хода длиной 20»). Свести всё к от-до можно, но
   тогда дорожка перестанет показывать закон: тянешь край — едет не тот конец,
   который объявлен.

   `nazad` зеркалит окно — та же фаза в шкале обратного хода. Уход считает свои
   доли от единицы минус доля («ярлыки ушли к 60 % ухода»), но часть фаз у него
   общая со входом и объявлена в шкале входа; их и зеркалим.

   Тяга за правый край клипа правит ручку длительности прямо на дорожке:
   время правится там, где оно видно. Двойной клик прогоняет ОТРЕЗОК этой
   фазы — от её начала до конца, остальное стоит своим чередом (стенд
   считает весь переход из одной доли q, чужую нитку заморозить нельзя, и
   врать про заморозку не будем: у нас это прогон окна, а не соло).

   МЕТКА МОМЕНТА (⚑). Переход составной, но время у него одно — потому
   адрес момента живёт на переходе, а нитки-движения соотносятся срезом,
   вычислением, не записью. Кнопка кладёт в буфер воспроизводимый адрес:
   имя · момент · срез · URL с уведёнными ручками и &moment=имя:q.
   Открытие по такому адресу ставит переход в тот самый кадр — читающий
   видит ровно то, что видел пишущий.

   Объявление:  ['kat', 'Переход', 'скраб', { opcii: { faza, pusk, zamedli, imya, srez } }]
   Значения в P не живут: фаза — жест, а не настройка, замедление — вид.  */
(function () {
  var STIL = '.st-skrab{width:100%;display:flex;align-items:center;gap:8px;margin-top:5px}' +
    '.st-skrab .st-nitka{flex:1}' +
    '.st-skrab-k{all:unset;box-sizing:border-box;cursor:pointer;border-radius:6px;' +
    'padding:3px 8px;font:12px/1 var(--st-font);color:var(--st-text-2);' +
    'border:0.5px solid var(--st-hairline)}' +
    '.st-skrab-k:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-skrab-lupa{display:flex;gap:2px;align-items:center;width:100%;margin-top:4px}' +
    '.st-skrab-lupa button{all:unset;box-sizing:border-box;cursor:pointer;padding:3px 7px;' +
    'font:11px/1 var(--st-font);color:var(--st-text-2);border-radius:5px}' +
    '.st-skrab-lupa button[aria-checked="true"]{background:var(--st-accent);color:#fff}' +
    '.st-skrab-srez{width:100%;margin-top:3px;font:10px/1.4 var(--st-font);' +
    'color:var(--st-text-2);font-variant-numeric:tabular-nums}' +
    '.row:has(>.st-skrab){flex-wrap:wrap}' +
    '.st-moment-hud{position:fixed;top:14px;left:50%;transform:translateX(-50%);' +
    'z-index:calc(var(--st-z, 2147483000) - 1);cursor:pointer;' +
    'background:var(--st-glass-2, rgba(30,30,32,.94));color:var(--st-text, #fff);' +
    'border:0.5px solid var(--st-border, rgba(255,255,255,.2));border-radius:8px;' +
    'padding:6px 12px;font:11px/1.4 var(--st-font, monospace);' +
    'font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.st-moment-hud[hidden]{display:none!important}' +
    '.st-dor{position:relative;width:100%;margin-top:6px}' +
    '.st-dor-r{position:relative;height:22px;margin-bottom:2px;border-radius:4px;' +
    'border:0.5px solid var(--st-hairline);background:var(--st-track)}' +
    '.st-dor-r:hover{border-color:var(--st-border)}' +
    '.st-dor-k{position:absolute;top:2px;bottom:2px;border-radius:3px;background:var(--st-accent);' +
    'opacity:.55;min-width:2px}' +
    '.st-dor-r:hover .st-dor-k{opacity:.8}' +
    '.st-dor-p{position:absolute;left:6px;top:0;height:22px;line-height:22px;pointer-events:none;' +
    'font:10px/22px var(--st-font);color:var(--st-text);white-space:nowrap;' +
    'font-variant-numeric:tabular-nums;text-transform:uppercase;letter-spacing:.04em}' +
    '.st-dor-p b{font-weight:400;color:var(--st-text-2);margin-left:8px;text-transform:none;letter-spacing:0}' +
    '.st-dor-kr{position:absolute;top:0;bottom:0;width:10px;margin-left:-5px;cursor:ew-resize}' +
    '.st-dor-kr::after{content:"";position:absolute;left:4px;top:4px;bottom:4px;width:2px;' +
    'border-radius:1px;background:#fff;opacity:0}' +
    '.st-dor-r:hover .st-dor-kr::after{opacity:.7}' +
    '.st-dor-golova{position:absolute;top:0;bottom:2px;width:2px;margin-left:-1px;background:#fff;' +
    'box-shadow:0 0 0 .5px rgba(0,0,0,.35);pointer-events:none;z-index:2}' +
    '.st-dor-r.otrezok{border-color:var(--st-accent)}' +
    '.st-dor-r.otrezok .st-dor-k{opacity:1}';

  StendPanel.tip('skrab', function (row, d, P, api) {
    if (!document.getElementById('st-skrab-css')) {
      var st = document.createElement('style'); st.id = 'st-skrab-css';
      st.textContent = STIL; document.head.appendChild(st);
    }
    var o = (d[4] || d[3] || {});
    var faza = o.faza || function () {};
    var pusk = o.pusk || null;
    var zamedli = o.zamedli || null;
    var imya = o.imya || d[0];
    var srez = o.srez || null;
    var tek = o.tek || null;
    var kino = o.kino || null;
    var ruka = false;   // пока рука на бегунке, отражение молчит
    var kinoVkl = false;

    /* Срез на экране: бейдж поверх макета, пока кадр внутри перехода.
       Взаимодействие идёт на макете — там и показатели. */
    var hud = document.createElement('div');
    hud.className = 'st-moment-hud';
    hud.hidden = true;
    hud.title = 'скопировать момент';
    document.body.appendChild(hud);
    function obnovitHud(q) {
      var vnutri = q > 0.004 && q < 0.996;
      hud.hidden = !vnutri;
      if (vnutri && srez) hud.textContent = imya + ' \u00b7 ' + q.toFixed(2) + '  \u2014  ' + srez(q);
    }

    /* ── ДОРОЖКИ ФАЗ ────────────────────────────────────────────────
       Фаза = ручка длительности плюс старт (ручка или число). Общее время
       либо объявлено, либо это самый дальний конец: переход длится столько,
       сколько живёт последняя нитка. */
    var dorozhki = (o.dorozhki || []).map(function (r) {
      var dolya = (r.do != null) || r.skonca != null || r.seredina != null;
      return { ms: r.ms, dolya: dolya, ot: r.ot || 0, konec: r.do,
               skonca: r.skonca, seredina: r.seredina, dlina: r.dlina, nazad: !!r.nazad,
               imya: r.imya || r.ms || r.do || r.skonca || r.seredina,
               shag: r.shag || (dolya ? 1 : 10), hi: r.hi || (dolya ? 100 : 0) };
    });
    var dor = null, golova = null, ryady = [];
    function chislo(v) { return typeof v === 'number' ? v : Math.max(0, Number(P[v]) || 0); }
    /* Общее время объявлено или это самый дальний конец. Доли считать от него
       же нельзя рекурсией: долевая дорожка в подсчёт потолка не идёт — её
       конец и так внутри хода. */
    function vsegoMs() {
      if (o.vsego != null) return Math.max(1, chislo(o.vsego));
      var mx = 0;
      dorozhki.forEach(function (d) {
        if (!d.dolya) mx = Math.max(mx, chislo(d.ot) + Math.max(0, Number(P[d.ms]) || 0));
      });
      return Math.max(1, mx);
    }
    /* Окно фазы в долях хода: [0…1]. Дальше оно умножается на время, но
       считается в долях — в них фаза и объявлена. */
    function okno(d) {
      var a, b;
      if (d.seredina != null) {
        var dl = Math.max(0, chislo(d.dlina)) / 100, se = chislo(d.seredina) / 100;
        a = se - dl / 2; b = se + dl / 2;
      } else if (d.skonca != null) {
        a = 1 - Math.max(0, chislo(d.skonca)) / 100; b = 1;
      } else {
        a = chislo(d.ot) / 100; b = chislo(d.konec) / 100;
      }
      if (d.nazad) { var c = a; a = 1 - b; b = 1 - c; }
      a = Math.max(0, Math.min(1, a)); b = Math.max(a, Math.min(1, b));
      return [a, b];
    }
    function nachMs(d, t) { return d.dolya ? okno(d)[0] * t : chislo(d.ot); }
    function konMs(d, t) {
      return d.dolya ? okno(d)[1] * t
                     : chislo(d.ot) + Math.max(0, Number(P[d.ms]) || 0);
    }
    /* Показ ключа склеивается, а не затирается: ту же ручку может держать
       своя строка панели или отражение в другом кластере. */
    function podpisatsya(key, fn) {
      var bylo = api.controls[key];
      api.controls[key] = bylo ? function () { bylo(); fn(); } : fn;
    }
    function narisovatDor() {
      if (!dor) return;
      var t = vsegoMs();
      ryady.forEach(function (r, i) {
        var d = dorozhki[i], a0 = nachMs(d, t), a1 = konMs(d, t);
        r.klip.style.left = (a0 / t * 100) + '%';
        r.klip.style.width = Math.max(0.4, (a1 - a0) / t * 100) + '%';
        r.pod.innerHTML = '';
        r.pod.appendChild(document.createTextNode(d.imya));
        var b = document.createElement('b');
        /* Долевая фаза подписана и долей, и временем: доля — закон, время —
           то, что видит глаз. */
        if (d.dolya) {
          var w = okno(d);
          b.textContent = Math.round(w[0] * 100) + '–' + Math.round(w[1] * 100) + ' %  ' +
            Math.round(a1 - a0) + ' мс';
        } else b.textContent = Math.round(a1 - a0) + ' мс';
        r.pod.appendChild(b);
      });
    }
    function vestiGolovu(q) {
      if (golova) golova.style.left = (Math.max(0, Math.min(1, q)) * 100) + '%';
    }
    var box = document.createElement('div'); box.className = 'st-skrab';
    // срез момента: общая доля + фазы всех движений — соотнесение ниток;
    // клик по строке — та же метка, что ⚑: копирует момент целиком
    var pod = srez ? document.createElement('div') : null;
    if (pod) {
      pod.className = 'st-skrab-srez';
      pod.style.cursor = 'pointer';
      pod.title = 'скопировать момент: имя, срез и адрес этого кадра';
    }
    function pokazatSrez(q) {
      obnovitHud(q); vestiGolovu(q);
      if (!pod) return;
      pod.textContent = imya + ' \u00b7 ' + q.toFixed(2) + '  \u2014  ' + srez(q);
    }

    // пуск: туда и обратно — прогон перехода без ухода из панели
    if (pusk) {
      // левая кнопка ведёт к левому концу нитки, правая — к правому
      [['◂', false, 'прогнать переход обратно'],
       ['▸', true, 'прогнать переход туда']].forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'st-skrab-k';
        b.textContent = k[0]; b.title = k[2];
        b.addEventListener('click', function () { ruka = false; faza(null); pusk(k[1]); });
        box.appendChild(b);
      });
    }

    /* Сам скраб: рука держит фазу, отпустила — ход продолжается.
       Г9: нитка — блок ядра (ход 64); прежде тут была своя, без заливки и
       пилюли. Рука теперь берётся и за пилюлю, поэтому «держит» и «отпустила»
       слушаются обоих: инпута и пилюли. */
    var inp = document.createElement('input');
    inp.value = 0;
    var nb = StendPanel.nitkaBlok({
      inp: inp, min: 0, max: 1, shag: 0.002,
      tekst: function () { return (+inp.value).toFixed(2); }
    });
    inp.addEventListener('pointerdown', function () { ruka = true; });
    inp.addEventListener('input', function () {
      ruka = true;
      var q = parseFloat(inp.value);
      faza(q); pokazatSrez(q);
    });
    nb.pil.addEventListener('pointerdown', function () { ruka = true; });
    ['pointerup', 'pointercancel'].forEach(function (s) {
      inp.addEventListener(s, function () { ruka = false; faza(null); });
      nb.pil.addEventListener(s, function () { ruka = false; faza(null); });
    });
    box.appendChild(nb.obl);

    /* Построение дорожек. Ряд — окно времени, клип внутри — сама фаза:
       видно и когда она начинается, и сколько длится, и как ложится на
       соседей. */
    var rafOkno = null, mnozh = 1;
    function progonOkna(i) {
      var d = dorozhki[i], t = vsegoMs();
      var a0 = nachMs(d, t), a1 = konMs(d, t);
      if (a1 <= a0) return;
      if (rafOkno) cancelAnimationFrame(rafOkno);
      ryady.forEach(function (r, j) { r.obl.classList.toggle('otrezok', j === i); });
      /* Окно прогоняется с той же лупой, что и весь переход: замедлитель —
         вид, а не настройка одного прогона. */
      var nach = performance.now(), dlit = (a1 - a0) * mnozh;
      ruka = true;                       // кадр держим руками: отражение молчит
      var shag = function (now) {
        var u = dlit > 0 ? Math.min(1, (now - nach) / dlit) : 1;
        var q = (a0 + (a1 - a0) * u) / t;
        inp.value = q; nb.obnovit();
        faza(q); pokazatSrez(q);
        if (u < 1) rafOkno = requestAnimationFrame(shag);
        else rafOkno = null;             // дошло — стоп-кадр на конце фазы
      };
      rafOkno = requestAnimationFrame(shag);
    }
    function snyatOkno() {
      if (rafOkno) { cancelAnimationFrame(rafOkno); rafOkno = null; }
      if (!ryady.length) return;
      ryady.forEach(function (r) { r.obl.classList.remove('otrezok'); });
      ruka = false; faza(null);
    }
    if (dorozhki.length) {
      dor = document.createElement('div'); dor.className = 'st-dor';
      dorozhki.forEach(function (d, i) {
        var r = document.createElement('div'); r.className = 'st-dor-r';
        var klip = document.createElement('div'); klip.className = 'st-dor-k';
        var kr = document.createElement('div'); kr.className = 'st-dor-kr'; kr.style.left = '100%';
        var pod = document.createElement('div'); pod.className = 'st-dor-p';
        klip.appendChild(kr); r.appendChild(klip); r.appendChild(pod);
        r.title = 'двойной клик — прогнать эту фазу; тяга за правый край — длительность';
        dor.appendChild(r);
        ryady.push({ obl: r, klip: klip, pod: pod });
        [d.ms, d.ot, d.konec, d.skonca, d.seredina, d.dlina, o.vsego].forEach(function (k) {
          if (typeof k === 'string') podpisatsya(k, narisovatDor);
        });

        /* ТЯГА ЗА КРАЙ правит длительность там, где она видна. Общее время
           берётся на начало тяги: пока тянут самую дальнюю нитку, потолок
           ехал бы вместе с рукой — клип стоял бы на месте, а число росло. */
        kr.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          /* Тянем тот ключ, которым объявлен правый край. У фазы «от конца»
             правого края своего нет — он всегда в единице, и тяга за него
             двигала бы начало: такую дорожку не тянем, чтобы рука не правила
             не то, за что взялась. Серединой заданную правим длиной. */
          var klyuch = d.dolya ? (d.seredina != null ? d.dlina : (d.skonca != null ? null : d.konec)) : d.ms;
          if (typeof klyuch !== 'string') return;      // край не ручка — тянуть нечего
          var vdvoe = d.dolya && d.seredina != null;   // длина растёт в обе стороны от середины
          var zerkalo = d.dolya && d.nazad;            // зеркальная фаза едет навстречу руке
          var x0 = e.clientX, t0 = vsegoMs(), shir = r.offsetWidth || 1;
          var v0 = Math.max(0, Number(P[klyuch]) || 0);
          var dvig = function (ev) {
            /* Ход руки — в долях ряда; в чём измерена фаза, в том и правим:
               долевую — процентами хода, свою — миллисекундами. */
            var dolyaRuki = (ev.clientX - x0) / shir;
            if (zerkalo) dolyaRuki = -dolyaRuki;
            if (vdvoe) dolyaRuki *= 2;
            var v = v0 + dolyaRuki * (d.dolya ? 100 : t0);
            v = Math.max(0, Math.round(v / d.shag) * d.shag);
            if (d.hi) v = Math.min(d.hi, v);
            if (v !== P[klyuch]) { P[klyuch] = v; narisovatDor(); }
          };
          var vsyo = function () {
            window.removeEventListener('pointermove', dvig);
            window.removeEventListener('pointerup', vsyo);
            api.save();
          };
          window.addEventListener('pointermove', dvig);
          window.addEventListener('pointerup', vsyo);
        });
        r.addEventListener('dblclick', function () { progonOkna(i); });
      });
      golova = document.createElement('div'); golova.className = 'st-dor-golova';
      dor.appendChild(golova);
      narisovatDor();
      /* Esc снимает прогон окна — той же клавишей, что и прочие режимы. */
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') snyatOkno(); });
    }

    /* Отражение: бегунок показывает правду стенда, когда рука не держит.
       Опрос таймером, не rAF: чтение одно, а таймеры живут и там, где
       кадры не гонятся (headless-пробы). 10 раз в секунду глазу хватает. */
    if (tek) {
      setInterval(function () {
        if (ruka) return;
        var t = tek();
        if (!t) return;
        var q = Math.max(0, Math.min(1, t.q));
        if (Math.abs(parseFloat(inp.value) - q) > 0.004) {
          inp.value = q;
          nb.obnovit();          // пилюля и заливка идут за правдой стенда
          pokazatSrez(q);
        }
        narisovatDor();          // длительности могли поехать из другого места
      }, 100);
    }

    // временная лупа: живой ход медленнее, кратности — не настройка, а вид
    if (kino) {
      var kn = document.createElement('button');
      kn.type = 'button'; kn.className = 'st-skrab-k';
      kn.textContent = 'скролл';
      kn.title = 'кино по скроллу: колесо проигрывает переход — сколько проскролил, столько прошло';
      kn.addEventListener('click', function () {
        kinoVkl = !kinoVkl;
        kn.style.background = kinoVkl ? 'var(--st-accent)' : '';
        kn.style.color = kinoVkl ? '#fff' : '';
        kino(kinoVkl);
        if (!kinoVkl) faza(null);   // выключил — стоп-кадр
      });
      var kinoKn = kn;   // уедет во второй этаж, к лупе, правым краем
    }
    var lupa = null;
    if (zamedli) {
      // вторым этажом: в одну строку с прогонами и скроллом лупа не влезает
      lupa = document.createElement('div'); lupa.className = 'st-skrab-lupa';
      var knopki = [];
      [1, 3, 10].forEach(function (m) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = '×' + m;
        b.setAttribute('aria-checked', String(m === 1));
        b.title = m === 1 ? 'обычная скорость' : 'в ' + m + ' раз медленнее';
        b.addEventListener('click', function () {
          mnozh = m;                     // окно фазы идёт под той же лупой
          zamedli(m);
          knopki.forEach(function (x) { x[0].setAttribute('aria-checked', String(x[1] === m)); });
        });
        knopki.push([b, m]); lupa.appendChild(b);
      });
    }
    // метка момента: воспроизводимый адрес кадра — в буфер
    var fl = document.createElement('button');
    fl.type = 'button'; fl.className = 'st-skrab-k';
    fl.textContent = '\u2691';
    fl.title = 'скопировать момент: имя, срез и адрес этого кадра';
    function kopirovatMoment() {
      var q = parseFloat(inp.value);
      var kus = [];
      (api.uvedennye ? api.uvedennye() : []).forEach(function (u) {
        kus.push(encodeURIComponent(u.k) + '=' +
          encodeURIComponent(Array.isArray(u.stalo) ? u.stalo.join(',') : u.stalo));
      });
      kus.push('moment=' + encodeURIComponent(imya + ':' + q.toFixed(3)));
      var url = location.origin + location.pathname + '?' + kus.join('&');
      var tekst = 'Момент: ' + imya + ' \u00b7 ' + q.toFixed(2) +
        (srez ? '\nСрез: ' + srez(q) : '') + '\n' + url;
      var bylo = fl.textContent;
      var skazal = function (t) { fl.textContent = t; setTimeout(function () { fl.textContent = bylo; }, 1200); };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tekst).then(
          function () { skazal('\u2713'); },
          function () { prompt('Момент:', tekst); });
      } else prompt('Момент:', tekst);
    }
    fl.addEventListener('click', kopirovatMoment);
    if (pod) pod.addEventListener('click', kopirovatMoment);
    hud.addEventListener('click', kopirovatMoment);
    box.appendChild(fl);
    if (typeof kinoKn !== 'undefined' && kinoKn) {
      if (!lupa) { lupa = document.createElement('div'); lupa.className = 'st-skrab-lupa'; }
      kinoKn.style.marginLeft = 'auto';   // скролл по правому краю второго этажа
      lupa.appendChild(kinoKn);
    }
    row.appendChild(box);
    if (dor) row.appendChild(dor);
    if (lupa) row.appendChild(lupa);
    if (pod) row.appendChild(pod);

    /* ?moment=имя:q — открыть стенд в этом кадре. Фаза ставится после
       загрузки с отступом: стенд ещё строит ленту, мгновенная постановка
       увидела бы полмакета. Рука «держит» кадр — прогон ▸ отпустит. */
    var m0 = (location.search.match(/[?&]moment=([^&]+)/) || [])[1];
    if (m0) {
      var t0 = decodeURIComponent(m0).split(':');
      if (t0[0] === imya) {
        var q0 = Math.max(0, Math.min(1, parseFloat(t0[1]) || 0));
        inp.value = q0;
        var postav = function () { setTimeout(function () { faza(q0); pokazatSrez(q0); }, 600); };
        if (document.readyState === 'complete') postav();
        else window.addEventListener('load', postav);
      }
    }
  });
})();
