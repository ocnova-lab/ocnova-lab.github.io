#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сторож реестра стендов. Реестр правится руками — описания и есть его
   ценность; сторож только не даёт потерять новое.

   Проходит по объявленным местам, находит страницы и докладывает те,
   чья основа имени не упоминается в реестре.

       python3 ~/stendy/reestr-stendov.py
"""
import pathlib, re, sys

DOM = pathlib.Path.home()
REESTR = DOM / 'Desktop/основа/Хранилище/07 Мастерская/Реестр стендов и работ.md'

MESTA = [
    ('песочница',   DOM / 'stendy',        '*.html'),
    ('песочница',   DOM / 'stendy',        '*/index.html'),
    ('витрина',     DOM / 'showcase',      '*.html'),
    ('проект',      DOM / 'mapa-grid',     '*.html'),
    ('хранилище',   DOM / 'Desktop/основа/Хранилище/02 Программа/Рабочее/ИТМО — Вёрстка', '*.html'),
]
# отдельные проекты — по имени папки, не по файлам
PROEKTY = ['osnova-workshop', 'gurovdsgn', 'gurov-works', 'osnova-gallery',
           'modulnyi-longread', 'mdl-gr2', 'zvuk', 'norgram-2017']

SLUZHEBNOE = {'index'}   # оглавления сами по себе в реестр не просятся

def zagolovok(p):
    """Реестр называет работы по-человечески, поэтому сверяем и по <title>.
       Берём начало заголовка: «Mapa Grid — WebGL» ищется как «mapa grid».
       Загрубление намеренное: сторож бережёт работу целиком, не каждый файл."""
    try: s = p.read_text(encoding='utf-8', errors='ignore')[:4000]
    except Exception: return ''
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    if not m: return ''
    z = re.sub(r'\s+', ' ', m.group(1)).strip().lower()
    z = re.split(r'[—·\-|(]', z)[0].strip()
    return z if len(z) >= 4 else ''

def osnova(p):
    """diagonal-obyavl.html → diagonal-obyavl; jonway/index.html → jonway"""
    return p.parent.name if p.name == 'index.html' and p.parent.name != p.parents[1].name \
           else p.stem

def main():
    if not REESTR.exists():
        print('реестра нет:', REESTR); return 1
    t = REESTR.read_text(encoding='utf-8').lower()

    propushcheno, vsego = [], 0
    for gruppa, kornen, shablon in MESTA:
        if not kornen.exists(): continue
        for p in sorted(kornen.glob(shablon)):
            if 'node_modules' in str(p) or p.parent.name in ('.site', 'panel-lib'): continue
            o = osnova(p); vsego += 1
            if o in SLUZHEBNOE: continue
            # ищем основу имени и человеческое имя файла
            if o.lower() in t or (zagolovok(p) and zagolovok(p) in t): continue
            propushcheno.append((gruppa, str(p).replace(str(DOM), '~')))
    for d in PROEKTY:
        if (DOM / d).exists():
            vsego += 1
            if d.lower() not in t:
                propushcheno.append(('проект', '~/' + d))

    print(f'Реестр: {REESTR.name}')
    print(f'Найдено на диске: {vsego}. Не упомянуто в реестре: {len(propushcheno)}.')
    if propushcheno:
        print('\nДобавить в реестр (сторож видит файл, не замысел — описание руками):')
        for g, p in propushcheno:
            print(f'  [{g}] {p}')
    else:
        print('Всё на месте.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
