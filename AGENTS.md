# 🤖 AGENTS.md — Памятка и база знаний для AI-агентов Remigram

> **ВАЖНО ДЛЯ ВСЕХ AI-АГЕНТОВ:**
> Прежде чем приступать к анализу или модификации репозитория, **ВНИМАТЕЛЬНО ПРОЧТИТЕ ЭТОТ ФАЙЛ**. Он содержит полную карту проекта, контуры развертывания, список ключевых файлов, используемые скрипты и критические ограничения Telegram.

---

## 1. 📌 О проекте (Project Overview)

**Remigram (Telegram Reminder & Studio Mini App)** — веб-приложение (Telegram Mini App / TMA), предназначенное для:
1. **Remigram Studio:** Профессиональный визуальный редактор постов (Post Composer) для Telegram-каналов с поддержкой Rich Text, таблиц, чеклистов, KaTeX формул, цитат, медиа-вложений и интерактивных инлайн-кнопок.
2. **Reminders & Calendar:** Планировщик напоминаний, повторяющиеся задачи, календарная сетка, уведомления через Telegram-бота.
3. **Channel Management:** Управление каналами, подключение ботов-администраторов, мгновенная и отложенная публикация постов.

### Технологический стек:
- **Frontend:** React 18, TypeScript, Vite, Tiptap (ProseMirror), Framer Motion, Lucide React, KaTeX.
- **Backend:** Node.js, Express, TypeScript (в папке `backend/`).
- **Database & Auth:** Supabase (PostgreSQL), Telegram WebApp initData HMAC-SHA256 валидация.
- **Hosting / Deploy:** Railway Cloud Platform.

---

## 2. 🌐 Контуры развертывания (Environments)

В проекте строго разделены два контура:

### 🟢 DEV-КОНТУР (Линия разработки — РАБОТАТЬ ЗДЕСЬ)
- **Цель:** Разработка, внесение правок, проведение тестов и отладка UI/UX.
- **URL приложения:** `https://frontend-dev-production-b4d9.up.railway.app`
- **Railway проект:** `frontend-dev` (сервис `frontend-dev`)
- **Правило:** Все изменения, правки стилей, добавление фич и деплой выполняются **ИСКЛЮЧИТЕЛЬНО** на этот контур.

### 🔴 PROD-КОНТУР (Продакшн-линия — НЕ ТРОГАТЬ)
- **Цель:** Боевая версия для конечных пользователей.
- **Правило:** Агентам **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** напрямую изменять код или деплоить в Production без прямого и явного указания пользователя.

---

## 3. 🗺️ Карта репозитория (Codebase Map)

### 📁 Фронтенд (`src/`)

```
src/
├── components/
│   ├── studio/                           # Модуль Remigram Studio
│   │   ├── editor/                       # Визуальный редактор постов
│   │   │   ├── components/
│   │   │   │   ├── EditorToolbar.tsx     # Основной тулбар и шторка форматирования
│   │   │   │   ├── InsertBlockMenu.tsx   # Меню «+» для вставки объектов и медиа
│   │   │   │   ├── MediaModal.tsx        # Модалка прикрепления медиа (Photo/Video/Audio/Spoiler)
│   │   │   │   ├── LinkModal.tsx         # Модалка ссылок и инлайн-кнопок (URL/WebApp)
│   │   │   │   ├── MentionDateModal.tsx  # Модалка упоминаний пользователей и дат
│   │   │   │   ├── EmojiPickerDropdown.tsx # Пикер кастомных Telegram-эмодзи
│   │   │   │   ├── TelegramPreview.tsx   # Live Preview панель (эмуляция поста в канале)
│   │   │   │   └── OverlayPortal.tsx     # Портал для модалок поверх всего UI
│   │   │   ├── editor/
│   │   │   │   └── serialization/
│   │   │   │       ├── telegramSerializers.ts    # Конвертер Tiptap -> Telegram HTML / MD-V2 / Plain
│   │   │   │       └── telegramRichSerializer.ts # Сериализатор InputRichMessage
│   │   │   ├── TelegramPostEditor.tsx    # Главный контейнер редактора Studio
│   │   │   └── TelegramPostEditor.css    # Основные стили редактора, тулбара и превью
│   │   ├── ChannelManager.tsx            # Подключение и управление каналами
│   │   └── ScheduleModal.tsx             # Планировщик отложенной публикации
│   ├── RemindersList.tsx                 # Вкладка списка напоминаний
│   ├── CalendarView.tsx                  # Вкладка календаря
│   ├── ProfileModal.tsx                  # Профиль пользователя
│   └── Navigation.tsx                    # Нижняя навигационная панель табов
├── services/
│   ├── supabase.ts                       # Supabase клиент и типы
│   └── api.ts                            # Вызовы бэкенд API
├── App.tsx                               # Корневой роутер табов и контекст приложения
└── main.tsx                              # Точка входа React
```

### 📁 Бэкенд (`backend/`)

```
backend/
├── api/
│   ├── channels.ts        # Публикация постов (sendMessage, sendPhoto, sendRichMessage)
│   ├── reminders.ts       # CRUD операции над напоминаниями
│   ├── broadcast.ts       # Массовая рассылка уведомлений
│   ├── check-reminders.ts # Фоновый крон проверки сработавших напоминаний
│   └── webhook.ts         # Telegram Bot Webhook обработчик
└── server.ts              # Express сервер
```

---

## 4. ⚡ Рабочие команды для агентов (Agent Runbook)

Всегда используйте абсолютный путь к Node.js на машине пользователя (`C:\Program Files\nodejs\node.exe`).

### 1. Сборка проекта (Build check):
```powershell
& "C:\Program Files\nodejs\node.exe" "./node_modules/vite/bin/vite.js" build
```

### 2. Деплой на Dev-контур Railway:
```powershell
& "C:\Program Files\nodejs\node.exe" "C:\Users\Noro\AppData\Roaming\npm\node_modules\@railway\cli\bin\railway.js" up --detach
```

### 3. Проверка статуса деплоя на Railway:
```powershell
& "C:\Program Files\nodejs\node.exe" "C:\Users\Noro\AppData\Roaming\npm\node_modules\@railway\cli\bin\railway.js" status
```

### 4. Тестирование интерфейса через Chrome DevTools Protocol (CDP):
В папке `scratch/` находятся скрипты для автоматизированного headless-тестирования в Chrome с эмуляцией мобильных (390×844) и десктопных (1200×850) экранов:
- `scratch/verify_all.mjs` — полный прогон с созданием скриншотов.

---

## 5. ⚠️ Критические ограничения Telegram (Must Know!)

### 1. Спецификация Telegram Bot API HTML
Официальный Telegram Bot API (`parse_mode: 'HTML'`) поддерживает **ТОЛЬКО** следующий ограниченный набор тегов:
- Поддерживаются: `<b>`, `<i>`, `<u>`, `<s>`, `<tg-spoiler>`, `<a>`, `<code>`, `<pre>`, `<blockquote>`, `<blockquote expandable>`, `<tg-emoji>`.
- **СТРОГО ЗАПРЕЩЕНЫ** в API: `<h1>-<h6>`, `<table>`, `<tr>`, `<td>`, `<th>`, `<ul>`, `<ol>`, `<li>`, `<details>`, `<summary>`, `<div>`, `<p>`.
- Если отправить неподдерживаемый тег, Telegram вернет ошибку: `400 Bad Request: can't parse entities: Unsupported start tag`.
- **Правило сериализации:** Заголовки конвертируются в `<b>...</b>`, списки — в строки с `• `, таблицы — в аккуратные моноширинные таблицы внутри `<pre>`, а раскрывающиеся блоки — в `<blockquote expandable>`.

### 2. Лимиты на длину текста
- Обычное текстовое сообщение (`sendMessage`): до **4 096** символов.
- Rich Messages (Bot API 10.1+): до **32 768** символов.
- **Подпись к медиа (`caption` в `sendPhoto`/`sendVideo`):** строго до **1 024** символов! Всегда обрезать `caption.slice(0, 1024)`.

### 3. Мобильные безопасные зоны (iOS Safe Areas)
- Вверху экрана Telegram Mini App расположена системная кнопка `✕ Закрыть` и заголовок.
- Для предотвращения перекрытия интерфейса всегда используйте:
  `padding-top: max(env(safe-area-inset-top, 0px), 16px);`
- Фиксированные плавающие элементы не должны перекрывать кнопку публикации и системные элементы Telegram.

---

## 6. 🏆 Золотые правила для AI-агентов (Golden Rules)

1. **Не тратить контекст на повторный аудит:** Ознакомьтесь с картой репозитория выше и сразу переходите к нужным файлам.
2. **Только Dev-линия:** Никогда не трогать прод-конфигурации или мастер-ветки без команды.
3. **Разделение инструментов:**
   - Меню **«+»** — только для объектов, внешних вставок и интерактива (Медиа, Кнопки, Таблица, Чеклист, Блок кода, Формулы, Карта).
   - Меню **форматирования (Drawer / Остров)** — для часто используемых текстовых стилей (H1-H3, Списки, Спойлер, Маркер, Моноширинный, Индексы).
4. **Обязательная проверка сборки:** Перед сдачей задачи пользователю убедитесь, что `vite build` проходит с кодом 0.
5. **Тестирование перед отчетом:** После деплоя всегда делайте проверочный скриншот через Chrome CDP, чтобы убедиться в отсутствии визуальных багов.
