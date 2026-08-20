#!/usr/bin/env python3
"""
Снимок платформы Основа для стенда.

Забирает по API реальные группы, уроки, задания и сдачи, обезличивает студентов
и кладёт рядом файл osnova-dannye.js — его читает стенд.

Личные данные на стенд не уезжают: имена, почты и телефоны студентов заменяются,
тексты их работ — тоже. Содержание уроков остаётся настоящим, оно своё.

Запуск:  python3 osnova-snimok.py
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

BASE = os.environ.get("BASE")
KEY = os.environ.get("OSNOVA_API_KEY")

if not (BASE and KEY):
    # подхватываем ~/.env, если запустили без него
    env = Path.home() / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            m = re.match(r"^(?:export\s+)?([A-Za-z_0-9]+)=(.*)$", line.strip())
            if m:
                os.environ.setdefault(m.group(1), m.group(2).strip("'\""))
    BASE = os.environ.get("BASE")
    KEY = os.environ.get("OSNOVA_API_KEY")

if not (BASE and KEY):
    sys.exit("Нет BASE или OSNOVA_API_KEY — проверь ~/.env")


def get(path):
    out = subprocess.run(
        ["curl", "-s", "-H", f"Authorization: Bearer {KEY}", f"{BASE}{path}", "--max-time", "40"],
        capture_output=True, text=True,
    ).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        sys.exit(f"Платформа вернула не JSON на {path}")


# ---------- обезличивание ----------

IMENA = [
    "Анна К.", "Игорь Т.", "Мария С.", "Павел Д.", "Ольга В.", "Никита Р.",
    "Екатерина М.", "Дмитрий Л.", "Софья Ж.", "Артём Н.", "Полина Б.",
    "Роман Ф.", "Вера А.", "Тимур Х.", "Алиса П.", "Глеб Ю.", "Дарья З.",
    "Кирилл О.", "Нина Г.", "Максим Ч.", "Лидия Э.", "Степан И.",
]

RABOTY = [
    "Разложил процесс на пять узлов, два свёл в один. Передача между агентами работает.",
    "Прошёл разбор до конца. Застрял на границе между машинной и человеческой частью.",
    "Собрал связку из двух агентов, проверил на реальных данных клиента.",
    "Карта готова, но роли пока не развёл — не понял, где заканчивается один узел.",
    "Переделал после замечаний: убрал дублирование на этапе приёмки.",
]


def obezlich(ident, i):
    return {
        "id": f"s{i:02d}",
        "имя": IMENA[i % len(IMENA)],
        "источник": ident[:8],  # чтобы связи не потерялись
    }


# ---------- тип файла по имени ----------

def tip_fajla(imya):
    n = (imya or "").lower()
    if "презентац" in n or "слайд" in n:
        return "презентация"
    if "конспект" in n:
        return "конспект"
    if "промпт" in n or "prompt" in n or "тренаж" in n or "бриф" in n or "brief" in n:
        return "промпт"
    if "транскриб" in n:
        return "транскрибация"
    return "прочее"


# ---------- сборка ----------

print("Забираю группы…")
streams = get("/streams?mine=true").get("streams", [])
print("Забираю уроки…")
lessons = get("/lessons").get("lessons", [])
print("Забираю задания…")
assignments = get("/assignments").get("assignments", [])
print("Забираю сдачи…")
sdachi = get("/student-assignments?mine=true").get("studentAssignments", [])

# карта настоящий id студента -> обезличенный
karta = {}
for x in sdachi:
    st = x.get("student") or {}
    if st.get("id") and st["id"] not in karta:
        karta[st["id"]] = obezlich(st["id"], len(karta))

snimok = {
    "снято": subprocess.run(["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"],
                            capture_output=True, text=True).stdout.strip(),
    "группы": [
        {
            "id": s["id"][:8],
            "название": s["name"],
            "студентов": s.get("studentsCount", 0),
        }
        for s in streams
    ],
    "студенты": list(karta.values()),
    "уроки": [
        {
            "id": l["id"][:8],
            "название": l.get("title"),
            "описание": l.get("summary"),
            "заметка": l.get("notes"),
            "видео": bool(l.get("videoKey") or l.get("videoUrl")),
            "транскрибация": l.get("transcriptStatus"),
            "статус": l.get("status"),
            "дата": l.get("date"),
            "задание": {
                "название": l.get("assignmentTitle"),
                "описание": l.get("assignmentDescription"),
                "критерии": l.get("assignmentCriteria"),
            } if l.get("hasAssignment") else None,
            "файлы": [
                {
                    "имя": m.get("fileName"),
                    "тип": tip_fajla(m.get("fileName")),
                    "размер": m.get("size"),
                }
                for m in (l.get("materials") or [])
            ],
        }
        for l in lessons
    ],
    "сдачи": [
        {
            "id": x["id"][:8],
            "студент": karta.get((x.get("student") or {}).get("id"), {}).get("id"),
            "задание": (x.get("assignment") or {}).get("title"),
            "статус": x.get("status"),
            "работа": RABOTY[i % len(RABOTY)] if x.get("content") else None,
            "разбор": "Принято. Связка работает, границу узлов держишь." if x.get("reviewText") else None,
            "сдано": x.get("submittedAt"),
            "проверено": x.get("reviewedAt"),
        }
        for i, x in enumerate(sdachi)
    ],
}

# сводка — то, что стенд показывает как «правду о платформе»
snimok["сводка"] = {
    "уроков": len(snimok["уроки"]),
    "с_описанием": sum(1 for l in snimok["уроки"] if (l["описание"] or "").strip()),
    "с_заданием": sum(1 for l in snimok["уроки"] if l["задание"]),
    "с_видео": sum(1 for l in snimok["уроки"] if l["видео"]),
    "с_транскрибацией": sum(1 for l in snimok["уроки"] if l["транскрибация"]),
    "с_датой": sum(1 for l in snimok["уроки"] if l["дата"]),
    "файлов": sum(len(l["файлы"]) for l in snimok["уроки"]),
    "сдач": len(snimok["сдачи"]),
    "проверено": sum(1 for s in snimok["сдачи"] if s["статус"] == "reviewed"),
}

out = Path(__file__).parent / "osnova-dannye.js"
out.write_text(
    "// Снимок платформы Основа. Собран osnova-snimok.py, руками не править.\n"
    "// Студенты обезличены, содержание уроков настоящее.\n"
    "window.ДАННЫЕ = " + json.dumps(snimok, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)

s = snimok["сводка"]
print(f"\nГотово: {out.name}")
print(f"  группы {len(snimok['группы'])} · студенты {len(snimok['студенты'])} · уроки {s['уроков']} · сдачи {s['сдач']}")
print(f"  с описанием {s['с_описанием']}/{s['уроков']} · с заданием {s['с_заданием']} · "
      f"с видео {s['с_видео']} · с транскрибацией {s['с_транскрибацией']} · с датой {s['с_датой']}")
