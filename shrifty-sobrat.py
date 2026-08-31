#!/usr/bin/env python3
# Каталог шрифтов мака: файл → семейство, начертание, класс, кириллица.
# Имена файлов ничего не значат («названия (23).ttf»), настоящее имя лежит
# внутри — в таблице name. Читаем только нужные куски, а не весь шрифт.
import os, sys, glob, json, struct, time

PAPKI = [os.path.expanduser('~/Library/Fonts'), '/Library/Fonts',
         '/System/Library/Fonts', '/System/Library/Fonts/Supplemental',
         os.path.expanduser('~/stendy/fonts')]

def zapisi_name(f, ofs):
    """Таблица name: id 1 — семейство, 2 — начертание, 16/17 — типографские."""
    f.seek(ofs)
    fmt, n, so = struct.unpack('>HHH', f.read(6))
    out = {}
    zap = f.read(12 * n)
    stroki = f.read(65536)
    for i in range(n):
        pid, eid, lid, nid, dl, do = struct.unpack('>HHHHHH', zap[i*12:(i+1)*12])
        if nid not in (1, 2, 16, 17): continue
        s = stroki[do + so - 6 - 12*n:][:dl] if False else None
        f.seek(ofs + so + do); s = f.read(dl)
        try:
            t = s.decode('utf-16-be') if (pid == 3 or pid == 0) else s.decode('mac-roman')
        except Exception:
            continue
        t = t.strip('\x00 ').strip()
        if t and nid not in out: out[nid] = t
    return out

def est_kirillica(f, ofs):
    """cmap: есть ли У+0410 (А). Формат 4 и 12 покрывают почти всё."""
    try:
        f.seek(ofs); ver, n = struct.unpack('>HH', f.read(4))
        podt = [struct.unpack('>HHI', f.read(8)) for _ in range(n)]
        for pid, eid, o in podt:
            if not (pid == 3 and eid in (1, 10)): continue
            f.seek(ofs + o); fmt = struct.unpack('>H', f.read(2))[0]
            if fmt == 4:
                f.read(4); seg2 = struct.unpack('>H', f.read(2))[0]
                f.read(6)
                kon = struct.unpack(f'>{seg2//2}H', f.read(seg2))
                f.read(2)
                nach = struct.unpack(f'>{seg2//2}H', f.read(seg2))
                for a, b in zip(nach, kon):
                    if a <= 0x410 <= b: return True
            elif fmt == 12:
                f.read(10); ng = struct.unpack('>I', f.read(4))[0]
                for _ in range(min(ng, 5000)):
                    a, b, _g = struct.unpack('>III', f.read(12))
                    if a <= 0x410 <= b: return True
    except Exception:
        pass
    return False

def odin(f, baza=0):
    f.seek(baza)
    tag = f.read(4)
    if tag not in (b'\x00\x01\x00\x00', b'OTTO', b'true', b'ttcf'): return None
    n = struct.unpack('>H', f.read(2))[0]
    f.read(6)
    tabl = {}
    for _ in range(n):
        t, _cs, o, l = struct.unpack('>4sIII', f.read(16))
        tabl[t] = o
    if b'name' not in tabl: return None
    im = zapisi_name(f, tabl[b'name'])
    sem = im.get(16) or im.get(1)
    if not sem: return None
    return {'semya': sem, 'nachertanie': im.get(17) or im.get(2) or 'Regular',
            'mono': b'CFF ' in tabl or True,   # уточняется ниже по post
            'kir': est_kirillica(f, tabl[b'cmap']) if b'cmap' in tabl else False}

def iz_faila(p):
    out = []
    try:
        with open(p, 'rb') as f:
            if f.read(4) == b'ttcf':
                f.seek(8); k = struct.unpack('>I', f.read(4))[0]
                ofs = struct.unpack(f'>{k}I', f.read(4*k))
                for o in ofs[:12]:
                    r = odin(f, o)
                    if r: out.append(r)
            else:
                r = odin(f, 0)
                if r: out.append(r)
    except Exception:
        pass
    return out

def sobrat():
    t0 = time.time()
    semi = {}
    vsego = 0
    for d in PAPKI:
        for p in glob.glob(d + '/**/*', recursive=True):
            if not p.lower().endswith(('.otf', '.ttf', '.ttc', '.woff2', '.woff')): continue
            vsego += 1
            for r in iz_faila(p):
                s = semi.setdefault(r['semya'], {'semya': r['semya'], 'nach': set(),
                                                 'kir': False, 'gde': set()})
                s['nach'].add(r['nachertanie'])
                s['kir'] |= r['kir']
                s['gde'].add('система' if p.startswith('/System') else
                             'стенды' if '/stendy/' in p else 'мои')
    spisok = [{'semya': v['semya'], 'nach': sorted(v['nach'])[:12],
               'kir': v['kir'], 'gde': sorted(v['gde'])} for v in semi.values()]
    spisok.sort(key=lambda x: x['semya'].lower())
    print(f'файлов просмотрено: {vsego}, семейств: {len(spisok)}, '
          f'с кириллицей: {sum(1 for x in spisok if x["kir"])}, '
          f'за {time.time()-t0:.1f} с')
    return spisok

if __name__ == '__main__':
    sp = sobrat()
    out = os.path.expanduser('~/stendy/shrifty-data.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// каталог шрифтов мака, собран shrifty-sobrat.py\n')
        f.write('window.SHRIFTY = ' + json.dumps(sp, ensure_ascii=False) + ';\n')
    print('записано:', out, f'({os.path.getsize(out)//1024} КБ)')
