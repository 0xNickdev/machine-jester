# 🃏 Machine Jester

```
frontend/   → Vercel  (сайт + DeepSeek прокси)
backend/    → Railway (OpenClaw Telegram бот)
```

---

## Деплой frontend → Vercel

### 1. Зайди на vercel.com → New Project
### 2. Import Git Repository — выбери репо, укажи **Root Directory: `frontend`**
### 3. В Vercel → Settings → Environment Variables добавь:

| Переменная | Значение |
|---|---|
| `DEEPSEEK_KEY` | Твой ключ с platform.deepseek.com |

### 4. Deploy

Vercel сам поднимет сайт + serverless функцию `/api/chat` которая проксирует DeepSeek.
Ключ DeepSeek **никогда не попадает в браузер**.

---

## Деплой backend → Railway

### 1. Зайди на railway.app → New Project → Deploy from GitHub
### 2. Выбери репо, укажи **Root Directory: `backend`**
### 3. В Railway → Variables добавь:

| Переменная | Значение |
|---|---|
| `TG_TOKEN` | Токен от @BotFather |
| `DEEPSEEK_KEY` | Тот же ключ DeepSeek |
| `VAULT_KEY` | 64-символьный hex (генерация ниже) |

**Сгенерировать VAULT_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy

Railway запустит `npm start` → `setup-runtime.js` запишет конфиг → `openclaw gateway` стартует.

### 5. Telegram → /start — бот онлайн

---

## Переменные окружения — итого

| Переменная | Где нужна | Откуда |
|---|---|---|
| `DEEPSEEK_KEY` | Vercel + Railway | platform.deepseek.com |
| `TG_TOKEN` | Railway только | @BotFather в Telegram |
| `VAULT_KEY` | Railway только | сгенерируй командой выше |
