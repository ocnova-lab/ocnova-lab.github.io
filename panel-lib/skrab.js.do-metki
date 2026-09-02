/* Скраб перехода — время в руку. Ручки длительностей и кривых меряют
   переход числами, а глаз видит его только на полной скорости: «кручу
   цифры, движения не вижу». Скраб отдаёт фазу перехода руке — тяни
   ползунок, стой в любом кадре, сравнивай кривые. Рядом замедлитель
   (временная лупа) и пуск: настроил — тут же прогнал, туда и обратно.

   Орган ничего не знает про устройство перехода — фазу СЧИТАЕТ СТЕНД,
   как попадание у канвасных мест. Контракт (все поля в opcii):

     faza(q)     — поставить переход в фазу q (0…1) рукой; стенд сам
                   решает, как разложить q на свои движения
     faza(null)  — рука отпустила: продолжить живой ход с этого места
     pusk(cel)   — прогнать переход целиком (true — туда, false — обратно)
     zamedli(M)  — временная лупа: живой ход в M раз медленнее

   Объявление:  ['kat', 'Переход', 'скраб', { opcii: { faza, pusk, zamedli } }]
   Значения в P не живут: фаза — жест, а не настройка, замедление — вид.  */
(function () {
  var STIL = '.st-skrab{width:100%;display:flex;align-items:center;gap:8px;margin-top:5px}' +
    '.st-skrab input{flex:1;accent-color:var(--st-accent);height:14px}' +
    '.st-skrab-k{all:unset;box-sizing:border-box;cursor:pointer;border-radius:6px;' +
    'padding:3px 8px;font:12px/1 var(--st-font);color:var(--st-text-2);' +
    'border:0.5px solid var(--st-hairline)}' +
    '.st-skrab-k:hover{color:var(--st-text);background:var(--st-card)}' +
    '.st-skrab-lupa{display:flex;gap:2px;margin-left:auto}' +
    '.st-skrab-lupa button{all:unset;box-sizing:border-box;cursor:pointer;padding:3px 7px;' +
    'font:11px/1 var(--st-font);color:var(--st-text-2);border-radius:5px}' +
    '.st-skrab-lupa button[aria-checked="true"]{background:var(--st-accent);color:#fff}' +
    '.row:has(>.st-skrab){flex-wrap:wrap}';

  StendPanel.tip('skrab', function (row, d, P, api) {
    if (!document.getElementById('st-skrab-css')) {
      var st = document.createElement('style'); st.id = 'st-skrab-css';
      st.textContent = STIL; document.head.appendChild(st);
    }
    var o = (d[4] || d[3] || {});
    var faza = o.faza || function () {};
    var pusk = o.pusk || null;
    var zamedli = o.zamedli || null;

    var box = document.createElement('div'); box.className = 'st-skrab';

    // пуск: туда и обратно — прогон перехода без ухода из панели
    if (pusk) {
      [['▸', true, 'прогнать переход туда'],
       ['◂', false, 'прогнать переход обратно']].forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'st-skrab-k';
        b.textContent = k[0]; b.title = k[2];
        b.addEventListener('click', function () { faza(null); pusk(k[1]); });
        box.appendChild(b);
      });
    }

    // сам скраб: рука держит фазу, отпустила — ход продолжается
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.002; inp.value = 0;
    inp.addEventListener('input', function () { faza(parseFloat(inp.value)); });
    ['pointerup', 'pointercancel'].forEach(function (s) {
      inp.addEventListener(s, function () { faza(null); });
    });
    box.appendChild(inp);

    // временная лупа: живой ход медленнее, кратности — не настройка, а вид
    if (zamedli) {
      var lupa = document.createElement('div'); lupa.className = 'st-skrab-lupa';
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
      box.appendChild(lupa);
    }
    row.appendChild(box);
  });
})();
