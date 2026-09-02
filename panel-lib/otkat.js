/* © Сергей Гуров · Михаил Матвеев · Александр Копинов, 2026 · панель стендов · метод Гурова · stendy.vercel.app */
/* Откат — шаг назад по правкам ручек: ⌘Z отменяет, ⇧⌘Z возвращает.
   Снят с tweakpane-undo-redo-plugin (cosmicshelter, 2024). Там автору пришлось
   лезть во внутренности чужой панели; здесь правка проходит через одну точку
   (izmenilos в panel.js), поэтому орган слушает событие и ничего не ломает.

   Одно перетаскивание ползунка = один шаг отмены: состояния копятся, пока рука
   движется, и записываются в стек через паузу — иначе откат отматывал бы по кадру.

   Объявление:  ['', 'Правки', 'otkat']            — строка с кнопками и счётчиком
                ['', 'Правки', 'otkat', { pauza: 400, glubina: 60 }]              */
(function () {
  var STIL = '.st-otkat{display:flex;gap:4px;margin-left:auto;align-items:center}' +
    '.st-otkat button{all:unset;padding:3px 9px;font:11px/1 var(--st-font);cursor:pointer;' +
    'border-radius:5px;background:var(--st-card);border:0.5px solid var(--st-hairline);' +
    'color:var(--st-text-2);transition:background .12s,color .12s}' +
    '.st-otkat button:hover:not([disabled]){background:var(--st-border);color:var(--st-text)}' +
    '.st-otkat button[disabled]{opacity:.32;cursor:default}' +
    '.st-otkat i{font-style:normal;font-size:10px;color:var(--st-text-3);min-width:3ch;text-align:right}';

  StendPanel.tip('otkat', function (row, d, P, api) {
    if (!document.getElementById('st-otkat-css')) {
      var s = document.createElement('style'); s.id = 'st-otkat-css';
      s.textContent = STIL; document.head.appendChild(s);
    }
    var o = d[3] || {};
    var PAUZA = o.pauza || 400, GLUBINA = o.glubina || 60;
    var stek = [JSON.stringify(P)], mesto = 0, taymer = null, svoya = false;

    var box = document.createElement('div'); box.className = 'st-otkat';
    var nazad = document.createElement('button'); nazad.textContent = 'Отменить';
    var vpered = document.createElement('button'); vpered.textContent = 'Вернуть';
    var schet = document.createElement('i');
    box.appendChild(nazad); box.appendChild(vpered); box.appendChild(schet);
    row.appendChild(box);

    function obnovit() {
      nazad.disabled = mesto <= 0;
      vpered.disabled = mesto >= stek.length - 1;
      schet.textContent = mesto > 0 ? mesto : '';
    }
    function zapomnit() {
      var snimok = JSON.stringify(P);
      if (snimok === stek[mesto]) return;
      stek = stek.slice(0, mesto + 1);      // новая ветка стирает отменённое будущее
      stek.push(snimok);
      if (stek.length > GLUBINA) stek.shift();
      mesto = stek.length - 1;
      obnovit();
    }
    function shag(kuda) {
      var novoe = mesto + kuda;
      if (novoe < 0 || novoe > stek.length - 1) return;
      mesto = novoe;
      svoya = true;                          // своя правка в стек не возвращается
      var z = JSON.parse(stek[mesto]);
      Object.keys(z).forEach(function (k) { P[k] = z[k]; });
      for (var k in api.controls) api.controls[k]();
      api.save();
      if (api.onChange) api.onChange();
      setTimeout(function () { svoya = false; }, 0);
      obnovit();
    }
    nazad.addEventListener('click', function () { shag(-1); });
    vpered.addEventListener('click', function () { shag(1); });

    document.addEventListener('stend:izmenenie', function (e) {
      if (svoya || (e.detail && e.detail.storageKey !== api.storageKey)) return;
      clearTimeout(taymer);
      taymer = setTimeout(zapomnit, PAUZA);  // рука остановилась — записали шаг
    });
    document.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey) || String(e.key).toLowerCase() !== 'z') return;
      e.preventDefault();
      clearTimeout(taymer); zapomnit();      // недописанный шаг закрываем до отката
      shag(e.shiftKey ? 1 : -1);
    });
    api.controls[d[0] || '__otkat'] = obnovit;
    obnovit();
  });
})();
