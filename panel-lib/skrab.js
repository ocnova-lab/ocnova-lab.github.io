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
    '.st-skrab input{flex:1;accent-color:var(--st-accent);height:14px}' +
    '.st-skrab-k{all:unset;box-sizing:border-box;cursor:pointer;border-radius:6px;' +
    'padding:3px 8px;font:12px/1 var(--st-font);color:var(--st-text-2);' +
    'border:0.5px solid var(--st-hairline)}' +
    '.st-skrab-k:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-skrab-lupa{display:flex;gap:2px;align-items:center;width:100%;margin-top:4px}' +
    '.st-skrab-lupa i{font-style:normal;font:10px/1 var(--st-font);color:var(--st-text-2);margin-right:4px}' +
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
    '.st-moment-hud[hidden]{display:none!important}';

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
      obnovitHud(q);
      if (!pod) return;
      pod.textContent = imya + ' \u00b7 ' + q.toFixed(2) + '  \u2014  ' + srez(q);
    }

    // пуск: туда и обратно — прогон перехода без ухода из панели
    if (pusk) {
      [['▸', true, 'прогнать переход туда'],
       ['◂', false, 'прогнать переход обратно']].forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'st-skrab-k';
        b.textContent = k[0]; b.title = k[2];
        b.addEventListener('click', function () { ruka = false; faza(null); pusk(k[1]); });
        box.appendChild(b);
      });
    }

    // сам скраб: рука держит фазу, отпустила — ход продолжается
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.002; inp.value = 0;
    inp.addEventListener('pointerdown', function () { ruka = true; });
    inp.addEventListener('input', function () {
      ruka = true;
      var q = parseFloat(inp.value);
      faza(q); pokazatSrez(q);
    });
    ['pointerup', 'pointercancel'].forEach(function (s) {
      inp.addEventListener(s, function () { ruka = false; faza(null); });
    });
    box.appendChild(inp);

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
          pokazatSrez(q);
        }
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
      box.appendChild(kn);
    }
    var lupa = null;
    if (zamedli) {
      // вторым этажом: в одну строку с прогонами и скроллом лупа не влезает
      lupa = document.createElement('div'); lupa.className = 'st-skrab-lupa';
      var met = document.createElement('i'); met.textContent = 'лупа';
      lupa.appendChild(met);
      var knopki = [];
      [1, 3, 10].forEach(function (m) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = '×' + m;
        b.setAttribute('aria-checked', String(m === 1));
        b.title = m === 1 ? 'обычная скорость' : 'в ' + m + ' раз медленнее';
        b.addEventListener('click', function () {
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
    row.appendChild(box);
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
