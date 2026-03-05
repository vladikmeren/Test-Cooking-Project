# 🍽️ TasteBook — Setup Guide

Личная кулинарная книга для двоих. Хостинг бесплатный, нужен только домен (~1-3€/год).

---

## Что нужно (всё бесплатно кроме домена)

| Сервис | Для чего | Цена |
|--------|----------|------|
| [Netlify](https://netlify.com) | Хостинг + serverless functions | Бесплатно |
| [Supabase](https://supabase.com) | База данных рецептов | Бесплатно (500MB) |
| [Anthropic](https://console.anthropic.com) | AI для извлечения рецептов | ~$0.01-0.05 за рецепт |
| Домен | Твой адрес | 1-3€/год |

---

## Шаг 1 — Supabase (база данных)

1. Зайди на [supabase.com](https://supabase.com) → Sign up → New project
2. Выбери регион **Frankfurt (eu-central-1)** — ближе к Европе
3. Запомни пароль проекта
4. После создания иди в **SQL Editor → New query**
5. Вставь содержимое файла `supabase-schema.sql` и нажми **Run**
6. Иди в **Settings → API** и скопируй:
   - `Project URL` → это `VITE_SUPABASE_URL`
   - `anon public` key → это `VITE_SUPABASE_ANON_KEY`

---

## Шаг 2 — Anthropic API ключ

1. Зайди на [console.anthropic.com](https://console.anthropic.com)
2. **API Keys → Create Key**
3. Скопируй ключ (начинается с `sk-ant-...`) → это `ANTHROPIC_API_KEY`
4. Пополни баланс на $5 — хватит на ~200-500 добавлений рецептов

---

## Шаг 3 — GitHub (нужен для Netlify)

1. Создай аккаунт на [github.com](https://github.com) если нет
2. Создай новый репозиторий (New repository), назови `tastebook`
3. Загрузи все файлы проекта:
   ```bash
   # В папке проекта:
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/ВАШ_НИК/tastebook.git
   git push -u origin main
   ```
   Или просто перетащи файлы через веб-интерфейс GitHub.

---

## Шаг 4 — Netlify (хостинг)

1. Зайди на [netlify.com](https://netlify.com) → Sign up with GitHub
2. **Add new site → Import an existing project → GitHub**
3. Выбери репозиторий `tastebook`
4. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Нажми **Deploy site**
6. После деплоя иди в **Site settings → Environment variables** и добавь:
   ```
   VITE_SUPABASE_URL       = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJhbGci...
   ANTHROPIC_API_KEY       = sk-ant-...
   ```
7. **Deploys → Trigger deploy** — передеплой с новыми переменными

---

## Шаг 5 — Домен (опционально)

1. Купи домен на [porkbun.com](https://porkbun.com) или [namecheap.com](https://namecheap.com) (~1-3€)
2. В Netlify: **Domain management → Add custom domain**
3. Следуй инструкции — Netlify сам выдаст SSL сертификат бесплатно

---

## Локальная разработка

```bash
# Установить зависимости
npm install

# Создать .env файл
cp .env.example .env
# Заполни .env значениями из Supabase и Anthropic

# Запустить локально (нужен Netlify CLI для функций)
npm install -g netlify-cli
netlify dev
```

---

## Структура проекта

```
tastebook/
├── netlify/
│   └── functions/
│       └── extract-recipe.mjs   ← AI extraction (server-side, ключ скрыт)
├── src/
│   ├── components/
│   │   ├── Header.jsx           ← Шапка с переключением темы/языка
│   │   ├── SearchBar.jsx        ← Поиск
│   │   ├── CategoryGrid.jsx     ← Фильтр по категориям
│   │   ├── RecipeCard.jsx       ← Карточка рецепта
│   │   ├── AddRecipeModal.jsx   ← Модалка добавления
│   │   └── RecipeDetail.jsx     ← Детальный просмотр
│   ├── lib/
│   │   ├── supabase.js          ← Клиент БД
│   │   └── api.js               ← Определение платформ, AI вызов
│   ├── i18n.js                  ← RU/EN переводы + категории
│   ├── App.jsx                  ← Главный компонент
│   └── index.css                ← Темы, переменные, утилиты
├── supabase-schema.sql          ← SQL для создания таблицы
├── netlify.toml                 ← Конфиг деплоя
└── .env.example                 ← Пример переменных окружения
```

---

## FAQ

**Q: Сайт доступен всем по ссылке?**  
A: Да, любой у кого есть ссылка может просматривать и добавлять рецепты.

**Q: Сколько стоит использование?**  
A: Хостинг бесплатный. Anthropic API — примерно $0.01-0.05 за рецепт по ссылке, ручное добавление бесплатно.

**Q: Как ограничить доступ только для двоих?**  
A: Можно добавить простой пароль через Netlify Password Protection (бесплатно для одного пароля).

**Q: Данные в безопасности?**  
A: Да. Supabase хранит данные в EU. Anthropic API ключ никогда не уходит в браузер — только через serverless function.
