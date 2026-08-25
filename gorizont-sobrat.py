# -*- coding: utf-8 -*-
"""Сборка ленты стенда из статьи хранилища.

Источник — один .md, в котором русский оригинал, строка «# English version»
и перевод с теми же заголовками. Из него выходит материал ленты: основной
язык записями, второй — картой переводов по адресу фрагмента.

Правила разбора объявлены здесь, а не подбираются по ходу:
  # заголовок        → титул (только первый)
  ## заголовок       → заголовок раздела, открывает новый раздел NN – 00
  **абзац целиком**  → врезка
  ![[файл|мера]]     → картинка; несколько подряд — стопка
  *подпись*          → подпись к предыдущей картинке
  | таблица |        → узкая идёт колонкой, широкая пропускается
  прочее             → абзац

Пролёт картинки выводится из её пропорции: вертикальная и квадратная — одна
колонка, горизонтальная — две, шире двух высот — три.
"""
import io, os, re, sys, shutil, json

try:
    from PIL import Image
except ImportError:
    sys.exit('нужен PIL')

HR = u'/Users/sergeigurov/Desktop/основа/Хранилище/'
STENDY = u'/Users/sergeigurov/stendy/'
# таблица шире этого числа знаков в самой длинной строке считается широкой
SHIROKAYA = 90


# Разделы, которые к статье не относятся: рабочие заметки автора.
SLUZHEBNYE = (u'Развилк', u'Подводка', u'Публикаци', u'Правк', u'Иллюстрации',
              u'Варианты заголовка', u'Сомнени', u'Из v', u'Что дальше',
              u'Version notes', u'Editorial')


def bez_sluzhebnyh(s):
    """Служебный раздел вырезается по имени, а не обрезанием всего хвоста:
       заметки автора могут стоять и в середине файла."""
    out, propusk = [], False
    for stroka in s.split('\n'):
        m = re.match(r'^(#{2,4}) (.+)$', stroka)
        if m:
            propusk = any(m.group(2).strip().startswith(k) for k in SLUZHEBNYE)
        if not propusk:
            out.append(stroka)
    return '\n'.join(out)


def polovinki(t):
    """Русский оригинал и английский перевод, без рабочих заметок."""
    t = re.sub(r'^---\n.*?\n---\n', '', t, count=1, flags=re.S)
    i = t.find('# English version')
    ru, en = (t[:i], t[i:]) if i >= 0 else (t, '')
    return bez_sluzhebnyh(ru), bez_sluzhebnyh(en.replace('# English version', '', 1))


def bloki(t):
    out = []
    for b in re.split(r'\n\s*\n', t):
        b = b.strip()
        if not b or b.startswith('>'):
            continue
        out.append(b)
    return out


def imya_kartinki(s):
    """В вики-ссылке мера отделена вертикальной чертой, а Обсидиан ставит
       перед ней обратный слэш — его надо снять, иначе имя не найдётся."""
    return s.split('|')[0].rstrip('\\').strip().split('/')[-1]


def kartinki_v(b):
    return [imya_kartinki(m) for m in re.findall(r'!\[\[([^\]]+)\]\]', b)]


SKLAD = {}


def sklad_kartinok():
    """Указатель «имя файла → путь»: ссылки в статьях идут голым именем,
       а лежат картинки по разным папкам хранилища."""
    if SKLAD: return SKLAD
    for koren, papki, fayly in os.walk(HR):
        papki[:] = [d for d in papki if not d.startswith('.')]
        for f in fayly:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif')):
                SKLAD.setdefault(f, os.path.join(koren, f))
    return SKLAD


def podpis_li(b):
    s = b.strip()
    return s.startswith('*') and s.endswith('*') and not s.startswith('**')


def tablica(b):
    stroki = [s for s in b.split('\n') if s.strip().startswith('|')]
    if len(stroki) < 2:
        return None
    def yacheyki(s):
        # черта внутри вики-ссылки экранирована обратным слэшем — по ней не делим
        return [c.strip() for c in re.split(r'(?<!\\)\|', s.strip().strip('|'))]
    shapka = yacheyki(stroki[0])
    telo = [yacheyki(s) for s in stroki[2:]]
    return {'shapka': shapka, 'telo': telo,
            'shirina': max(len(s) for s in stroki)}


def razobrat(t):
    """Список сырых кусков: (род, содержимое).

       Разбор идёт по строкам, а не по абзацам: в исходниках картинка и её
       подпись стоят внутри абзаца, несколько картинок — на одной строке,
       а иногда за картинкой сразу идёт текст. Абзацем считается то, что
       осталось между этими находками."""
    kuski, tekst, gruppa, tab = [], [], [], []

    def sdat_tekst():
        if not tekst: return
        b = '\n'.join(tekst).strip()
        del tekst[:]
        if not b: return
        if re.match(r'^\*\*[^*]+\*\*$', b.replace('\n', ' ').strip()):
            kuski.append(('lead', b.replace('**', '').strip()))
        else:
            kuski.append(('text', b))

    def sdat_gruppu(pod=None):
        if not gruppa: return
        kuski.append(('fig', {'fayly': list(gruppa), 'pod': pod}))
        del gruppa[:]

    def sdat_tablicu():
        if not tab: return
        kuski.append(('tabl', tablica('\n'.join(tab))))
        del tab[:]

    for stroka in t.split('\n'):
        s1 = stroka.strip()
        if s1.startswith('|'):
            sdat_tekst(); sdat_gruppu(); tab.append(s1); continue
        sdat_tablicu()
        if not s1:
            sdat_tekst(); sdat_gruppu(); continue
        if s1.startswith('# '):
            sdat_tekst(); sdat_gruppu()
            kuski.append(('title', s1[2:].strip())); continue
        if re.match(r'^#{2,4} ', s1):
            sdat_tekst(); sdat_gruppu()
            kuski.append(('head', re.sub(r'^#{2,4} ', '', s1).strip())); continue
        if '![[' in s1:
            sdat_tekst()
            gruppa.extend(kartinki_v(s1))
            ostatok = re.sub(r'!\[\[[^\]]+\]\]', '', s1).strip()
            if len(ostatok) > 2: tekst.append(ostatok)
            continue
        if podpis_li(s1):
            if gruppa: sdat_gruppu(s1.strip('*').strip())
            else: kuski.append(('cap', s1.strip('*').strip()))
            continue
        sdat_gruppu()
        tekst.append(stroka)
    sdat_tekst(); sdat_gruppu(); sdat_tablicu()
    return kuski


def chistka(s):
    s = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', s)   # вики-ссылка → текст
    s = re.sub(r'\[\[([^\]]+)\]\]', r'\1', s)
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)         # md-ссылка → текст
    s = s.replace('**', '').replace('`', '')
    s = re.sub(r'[ \t]+\n', '\n', s)
    return s.strip()


TRANSLIT = {u'а':'a',u'б':'b',u'в':'v',u'г':'g',u'д':'d',u'е':'e',u'ё':'e',u'ж':'zh',
 u'з':'z',u'и':'i',u'й':'y',u'к':'k',u'л':'l',u'м':'m',u'н':'n',u'о':'o',u'п':'p',
 u'р':'r',u'с':'s',u'т':'t',u'у':'u',u'ф':'f',u'х':'h',u'ц':'c',u'ч':'ch',u'ш':'sh',
 u'щ':'sch',u'ъ':'',u'ы':'y',u'ь':'',u'э':'e',u'ю':'yu',u'я':'ya'}


def bezopasno(imya):
    """Имя файла в адресе: без пробелов, кириллицы и заглавных.
       «Pasted image 20260812.png» в ссылке пришлось бы кодировать, а
       закодированное имя нечитаемо в материале."""
    koren, tochka, rasshirenie = imya.rpartition('.')
    koren = koren.lower()
    out = []
    for ch in koren:
        if ch in TRANSLIT: out.append(TRANSLIT[ch])
        elif ch.isalnum(): out.append(ch)
        else: out.append('-')
    koren = re.sub(r'-+', '-', ''.join(out)).strip('-')
    return koren + '.' + rasshirenie.lower()


# Картинка кладётся в ленту не тяжелее, чем нужно: сверх этой ширины
# растр пережимается, вектор идёт как есть.
MAX_SHIRINA = 1600


def polozhit(ist, vyhod, imya):
    """Копия картинки в папку стенда: вектор как есть, растр — в webp."""
    if imya.endswith('.svg'):
        shutil.copyfile(ist, vyhod + imya)
        return imya
    with Image.open(ist) as im:
        w, h = im.size
        if im.mode in ('P', 'LA'): im = im.convert('RGBA')
        if w > MAX_SHIRINA:
            h = int(round(h * MAX_SHIRINA / float(w))); w = MAX_SHIRINA
            im = im.resize((w, h), Image.LANCZOS)
        novoe = imya.rsplit('.', 1)[0] + '.webp'
        im.save(vyhod + novoe, 'WEBP', quality=82, method=4)
    return novoe


def prolyot(put):
    """Пролёт выводится из пропорции самой картинки, а не назначается."""
    try:
        with Image.open(put) as im:
            w, h = im.size
    except Exception:
        return 1, 0, 0
    if w <= h * 1.05:
        return 1, w, h
    if w > h * 2:
        return 3, w, h
    return 2, w, h


def sobrat(imya, put_md, papka_img, slug, dat_ru, dat_en, ttl_ru, ttl_en):
    t = io.open(HR + put_md, encoding='utf-8').read()
    ru_t, en_t = polovinki(t)
    ru, en = razobrat(ru_t), razobrat(en_t)

    """Половины сшиваются не по номеру куска, а сличением их устройства.
       Один лишний абзац в переводе сдвинул бы всё после себя — а он бывает:
       где-то жирная строка выделена только в одной половине. Поэтому род
       для сличения огрублён (врезка считается абзацем), а само сличение
       делает difflib: расхождение остаётся местным.  // без ручки"""
    import difflib
    def rod_dlya_sverki(k):
        r = k[0]
        if r == 'lead': r = 'text'
        if r == 'fig':  r = 'fig%d' % len(k[1]['fayly'])
        return r
    a = [rod_dlya_sverki(k) for k in ru]
    b = [rod_dlya_sverki(k) for k in en]
    shov = {}
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
        if tag == 'equal':
            for d in range(i2 - i1): shov[i1 + d] = j1 + d
    if len(shov) < len(ru):
        print(u'  · без перевода осталось кусков: %d из %d'
              % (len(ru) - len(shov), len(ru)))

    vyhod = STENDY + 'gorizont-img/' + slug + '/'
    if not os.path.isdir(vyhod):
        os.makedirs(vyhod)

    lenta, per = [], {}
    razdel, nomer, fignom = 1, 0, 0
    propushcheno = []

    def dobavit(z):
        """Буфер — пропуск; два пропуска подряд это уже дыра, а не пауза."""
        if z['t'] == 'buffer' and (not lenta or lenta[-1]['t'] == 'buffer'):
            return
        lenta.append(z)

    def klyuch(zap):
        if zap['t'] == 'title': return 'title'
        if zap['t'] == 'cap': return 'cap-' + zap['to']
        return zap['n']

    def para(j, pole):
        """Перевод куска, сшитого с этим."""
        k = shov.get(j)
        return en[k][1] if k is not None else None

    for j, (rod, telo) in enumerate(ru):
        if rod == 'title':
            # заголовок берётся объявленный: в файле первой строкой стоит
            # рабочее имя черновика, а не название статьи
            dobavit({'t': 'title', 'date': dat_ru, 'text': ttl_ru})
            per['title'] = {'date': dat_en, 'text': ttl_en}
            dobavit({'t': 'buffer'})
            continue

        if rod == 'head':
            razdel += 1 if lenta else 0
            nomer = 0
            n = '%02d – 00' % razdel
            dobavit({'t': 'buffer'})
            zap = {'t': 'head', 'n': n, 'text': chistka(telo)}
            dobavit(zap)
            p = para(j, 'text')
            if p: per[n] = {'text': chistka(p)}
            continue

        if rod in ('text', 'lead'):
            nomer += 1
            n = '%02d – %02d' % (razdel, nomer)
            zap = {'t': rod, 'n': n, 'text': chistka(telo)}
            dobavit(zap)
            p = para(j, 'text')
            if p: per[n] = {'text': chistka(p)}
            continue

        if rod == 'fig':
            fayly = telo['fayly']
            gruppa = []
            for f in fayly:
                ist = sklad_kartinok().get(f, '')
                if not ist or not os.path.isfile(ist):
                    propushcheno.append(u'нет файла ' + f)
                    continue
                sp, w, h = prolyot(ist)
                if not w:
                    propushcheno.append(u'не прочиталась ' + f)
                    continue
                nov = polozhit(ist, vyhod, bezopasno(f))
                fignom += 1
                gruppa.append({'n': '%02d' % fignom, 'src': nov,
                               'w': min(w, MAX_SHIRINA),
                               'h': int(round(h * min(w, MAX_SHIRINA) / float(w))),
                               'span': sp})
            if not gruppa:
                continue
            dobavit({'t': 'buffer'})
            if len(gruppa) == 1:
                g = gruppa[0]
                dobavit({'t': 'fig', 'n': g['n'], 'span': g['span'],
                              'src': g['src'], 'w': g['w'], 'h': g['h']})
            else:
                for g in gruppa:
                    dobavit({'t': 'fig', 'n': g['n'], 'span': g['span'],
                                  'src': g['src'], 'w': g['w'], 'h': g['h']})
            if telo['pod']:
                zap = {'t': 'cap', 'to': gruppa[0]['n'], 'arrow': '←',
                       'text': chistka(telo['pod'])}
                dobavit(zap)
                p = para(j, 'pod')
                if p and isinstance(p, dict) and p.get('pod'):
                    per['cap-' + gruppa[0]['n']] = {'text': chistka(p['pod'])}
            dobavit({'t': 'buffer'})
            continue

        if rod == 'tabl':
            tb = telo
            kartinochnaya = bool(tb['telo']) and all(
                all(c.startswith('![[') for c in r if c) for r in tb['telo'] if r)
            if kartinochnaya and tb['telo']:
                # это не таблица, а пара картинок с подписями в шапке
                dobavit({'t': 'buffer'})
                pervy = None
                for k, yach in enumerate(tb['telo'][0]):
                    m = re.match(r'!\[\[([^\]]+)\]\]', yach)
                    if not m: continue
                    f = imya_kartinki(m.group(1))
                    ist = sklad_kartinok().get(f, '')
                    if not ist or not os.path.isfile(ist):
                        propushcheno.append(u'нет файла ' + f); continue
                    sp, w, h = prolyot(ist)
                    nov = polozhit(ist, vyhod, bezopasno(f))
                    fignom += 1
                    nn = '%02d' % fignom
                    pervy = pervy or nn
                    dobavit({'t': 'fig', 'n': nn, 'span': sp, 'src': nov,
                             'w': min(w, MAX_SHIRINA),
                             'h': int(round(h * min(w, MAX_SHIRINA) / float(w)))})
                if pervy:
                    pod = u' · '.join(c for c in tb['shapka'] if c)
                    dobavit({'t': 'cap', 'to': pervy, 'arrow': '←',
                                  'text': chistka(pod)})
                    pe = para(j, None)
                    if pe and isinstance(pe, dict):
                        pod_en = u' · '.join(c for c in pe['shapka'] if c)
                        per['cap-' + pervy] = {'text': chistka(pod_en)}
                dobavit({'t': 'buffer'})
                continue
            if tb['shirina'] > SHIROKAYA or len(tb['shapka']) > 2:
                propushcheno.append(u'широкая таблица %d×%d, %d знаков в строке'
                                    % (len(tb['shapka']), len(tb['telo']), tb['shirina']))
                continue
            nomer += 1
            n = '%02d – %02d' % (razdel, nomer)
            dobavit({'t': 'tabl', 'n': n,
                          'shapka': [chistka(c) for c in tb['shapka']],
                          'telo': [[chistka(c) for c in r] for r in tb['telo']]})
            pe = para(j, None)
            if pe and isinstance(pe, dict):
                per[n] = {'shapka': [chistka(c) for c in pe['shapka']],
                          'telo': [[chistka(c) for c in r] for r in pe['telo']]}
            continue

    dobavit({'t': 'buffer'})
    return lenta, per, propushcheno, len(ru), len(en)


def js(s):
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    s = s.replace('\n', '\\n').replace(u'\u2028', '\\u2028')
    return '"' + s + '"'


def zapis_js(z):
    poryadok = ['t', 'n', 'to', 'arrow', 'date', 'text', 'by', 'pod',
                'span', 'src', 'w', 'h', 'shapka', 'telo']
    chasti = []
    for k in poryadok:
        if k not in z: continue
        v = z[k]
        if isinstance(v, (int,)) and not isinstance(v, bool):
            chasti.append('%s: %d' % (k, v))
        elif isinstance(v, list):
            if v and isinstance(v[0], list):
                chasti.append('%s: [%s]' % (k, ', '.join(
                    '[' + ', '.join(js(c) for c in r) + ']' for r in v)))
            else:
                chasti.append('%s: [%s]' % (k, ', '.join(js(c) for c in v)))
        else:
            chasti.append('%s: %s' % (k, js(v)))
    return '{ ' + ', '.join(chasti) + ' }'


def zapisat(slug, imya_ru, imya_en, lenta, per, yazyk, shapka):
    imya = 'gorizont-%s.js' % slug
    L = ['// %s' % shapka.replace('\n', '\n// ')]
    L.append('window.GORIZONT_STATI = window.GORIZONT_STATI || {};')
    L.append("window.GORIZONT_STATI['%s'] = {" % slug)
    L.append("  slug: '%s'," % slug)
    L.append('  imya: { ru: %s, en: %s },' % (js(imya_ru), js(imya_en)))
    L.append("  yazyk: '%s'," % yazyk)
    L.append("  img: '/gorizont-img/%s/'," % slug)
    L.append('  lenta: [')
    for z in lenta:
        L.append('    %s,' % zapis_js(z))
    L[-1] = L[-1][:-1]
    L.append('  ],')
    L.append('  per: {')
    for k in per:
        L.append('    "%s": %s,' % (k, zapis_js(dict(per[k], t='—'))
                                    .replace('{ t: "—", ', '{ ')))
    if per: L[-1] = L[-1][:-1]
    L.append('  }')
    L.append('};')
    io.open(STENDY + imya, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    return imya


STATI = [
  dict(imya='Пространство', slug='prostranstvo',
       md='04 Контент/В работе/Пост — Пространство — черновик v3.md',
       img='04 Контент/В работе/Пост — Пространство — иллюстрации',
       dat_ru='12 августа /2026', dat_en='12 August /2026',
       ru='Пространство как невидимый инструмент дизайна',
       en='Space as the Invisible Instrument of Design'),
  dict(imya='Пять слов', slug='pyat-slov',
       md='04 Контент/В работе/Статья — Пять слов о форме (текст v2).md',
       img='04 Контент/В работе/Статья — Пять слов — иллюстрации',
       dat_ru='август /2026', dat_en='August /2026',
       ru='Структура и архитектура, композиция, конструкция и сетка, или пять вопросов дизайнеру',
       en='Structure and Architecture, Composition, Construction and the Grid — or Five Questions to Ask a Designer'),
  dict(imya='Вайб-кодинг', slug='vaib-koding',
       md='04 Контент/В работе/Пост — Вайб-кодинг — умение объяснить макет — черновик v2.md',
       img='04 Контент/В работе/Пост — Вайб-кодинг — иллюстрации',
       dat_ru='24 июля /2026', dat_en='24 July /2026',
       ru='Вайб-кодинг — Лови волну!', en='Vibe-coding — Catch the Wave!'),
]

for st in STATI:
    print('═' * 78)
    print(st['imya'])
    lenta, per, prop, n_ru, n_en = sobrat(
        st['imya'], st['md'], st['img'], st['slug'], st['dat_ru'], st['dat_en'],
        st['ru'], st['en'])
    shapka = (u'Материал стенда: «%s».\nСобран из «%s» скриптом sobrat.py.\n'
              u'Русский — оригинал, английский — перевод; перевод ключуется '
              u'адресом фрагмента.' % (st['ru'], st['md'].split('/')[-1]))
    f = zapisat(st['slug'], st['ru'], st['en'], lenta, per, 'ru', shapka)
    import collections
    c = collections.Counter(z['t'] for z in lenta)
    print(u'  кусков: ru %d, en %d' % (n_ru, n_en))
    print(u'  колонок %d: %s' % (len(lenta), ', '.join(
        '%s %d' % (k, v) for k, v in sorted(c.items()))))
    print(u'  переводов %d' % len(per))
    for p in prop: print(u'  пропущено: %s' % p)
    print(u'  → %s' % f)
