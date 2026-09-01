#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Реестр панелей стендов. Пересобирается, а не пишется руками:
   список из 25 стендов, поддерживаемый вручную, устареет за неделю.

   Источник истины — сами стенды. Описание берётся из шапки файла
   (её требует П1 свода), цифры считаются по коду.

       python3 ~/stendy/panel-lib/reestr.py          # пересобрать reestr.md
       python3 ~/stendy/panel-lib/reestr.py --pokazat # то же в консоль
"""
import re, sys, pathlib, datetime, collections

STENDY = pathlib.Path.home() / 'stendy'
VYHOD = STENDY / 'panel-lib' / 'reestr.md'

TIPY = {'кегль','кегль крупный','зазор','поле','путь','размер','длина','кернинг','время',
        'острота','ход','инерция','сила','счёт','угол','порог','скорость','цвет','палитра',
        'датчик','кривая','двоичное','выбор','этажи','пара','откат','доля','множитель',
        'градиент','пропорция'}

def zagolovok(t, imya):
    m = re.search(r'<title>(.*?)</title>', t, re.S)
    if m: return re.sub(r'\s+', ' ', m.group(1)).strip()
    return imya

def zakon_slovami(t):
    """Первый комментарий файла — закон словами по П1."""
    m = re.search(r'/\*(.*?)\*/', t, re.S)
    if not m: return ''
    stroki = [s.strip(' *\t') for s in m.group(1).strip().split('\n')]
    stroki = [s for s in stroki if s]
    if not stroki: return ''
    txt = ' '.join(stroki[:3])
    return (txt[:150] + '…') if len(txt) > 150 else txt

def razobrat(p):
    t = p.read_text(encoding='utf-8', errors='ignore')
    r = {'fail': p.name, 'imya': zagolovok(t, p.stem), 'zakon': zakon_slovami(t),
         'panel': 'StendPanel.build' in t, 'obyavlenie': 'izObyavleniya' in t,
         'stop': '?stop' in t or 'stop=' in t,
         'pravlen': datetime.date.fromtimestamp(p.stat().st_mtime).isoformat()}
    r['organy'] = sorted(set(re.findall(r'panel-lib/(\w+)\.js', t)))
    if r['obyavlenie']:
        tipy = [m for m in re.findall(r"\[\s*'[A-Za-z][\w]*'\s*,\s*'[^']*'\s*,\s*'([^']+)'", t)
                if m in TIPY]
        r['tipy'] = collections.Counter(tipy)
        r['ruchek'] = len(tipy)
    else:
        r['tipy'] = collections.Counter()
        # старый формат: ['ключ', 'Подпись', число, число, число]
        r['ruchek'] = len(re.findall(r"\[\s*'[A-Za-z][\w]*'\s*,\s*'[^']*'\s*,\s*-?[\d.]+\s*,", t))
    return r

def sobrat():
    fajly = sorted(p for p in STENDY.glob('*.html')
                   if not p.name.startswith('.') and 'panel-lib' not in p.name)
    return [razobrat(p) for p in fajly]

def otchet(rr):
    spanel = [r for r in rr if r['panel']]
    sob = [r for r in rr if r['obyavlenie']]
    vsego_ruchek = sum(r['ruchek'] for r in spanel)
    tipy = collections.Counter()
    for r in sob: tipy.update(r['tipy'])
    organy = collections.Counter()
    for r in spanel: organy.update(r['organy'])

    L = []
    L.append('# Реестр панелей стендов\n')
    L.append('Пересобирается: `python3 ~/stendy/panel-lib/reestr.py`. '
             'Руками не править — правка затрётся.\n')
    L.append(f'Снято {datetime.date.today().isoformat()}. '
             f'Стендов {len(rr)}, с панелью {len(spanel)}, '
             f'на объявлении {len(sob)}, ручек всего {vsego_ruchek}.\n')
    L.append('Реестр органов — хранилище, «Библиотека панелей/Приёмы панелей/00 Индекс».\n')

    L.append('\n## Стенды\n')
    L.append('| стенд | ручек | объявление | стоп-кадр | органы | правлен |')
    L.append('|---|---|---|---|---|---|')
    for r in sorted(rr, key=lambda x: -x['ruchek']):
        if not r['panel']:
            continue
        L.append('| {} | {} | {} | {} | {} | {} |'.format(
            r['imya'][:38], r['ruchek'],
            '✓' if r['obyavlenie'] else '—',
            '✓' if r['stop'] else '—',
            ', '.join(r['organy'])[:44] or '—', r['pravlen']))

    bez = [r for r in rr if not r['panel']]
    if bez:
        L.append('\n**Без панели:** ' + ', '.join(r['imya'][:30] for r in bez) + '\n')

    L.append('\n## Типы величин в работе\n')
    L.append('Считано по стендам на объявлении. Тип без употреблений — '
             'кандидат в каверны: либо запас, либо лишний.\n')
    L.append('| тип | сколько | стенды |')
    L.append('|---|---|---|')
    for t, n in tipy.most_common():
        gde = [r['imya'][:16] for r in sob if r['tipy'].get(t)]
        L.append(f'| {t} | {n} | {", ".join(gde)} |')
    nety = sorted(TIPY - set(tipy))
    if nety:
        L.append('\n**Ни разу не употреблены:** ' + ', '.join(nety) + '\n')

    L.append('\n## Органы в работе\n')
    L.append('| орган | стендов |')
    L.append('|---|---|')
    for o, n in organy.most_common():
        L.append(f'| {o} | {n} |')

    L.append('\n## Закон словами (шапка файла, П1)\n')
    for r in sorted(rr, key=lambda x: x['imya']):
        if r['panel']:
            L.append(f"- **{r['imya']}** — {r['zakon'] or '⚠ шапки нет'}")
    return '\n'.join(L) + '\n'

if __name__ == '__main__':
    rr = sobrat()
    txt = otchet(rr)
    if '--pokazat' in sys.argv:
        print(txt)
    else:
        VYHOD.write_text(txt, encoding='utf-8')
        print(f'{VYHOD}: {len(txt.splitlines())} строк, стендов {len(rr)}')
