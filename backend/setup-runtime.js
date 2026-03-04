/**
 * setup-runtime.js
 * Запускается перед openclaw gateway.
 * Читает переменные окружения Railway и записывает ~/.openclaw/openclaw.json
 */

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const crypto = require("crypto");

// ── Читаем env ──────────────────────────────────────────────────────────────
const TG_TOKEN     = process.env.TG_TOKEN     || "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "";
const VAULT_KEY    = process.env.VAULT_KEY    || "";
const PORT         = process.env.PORT         || "18789";
const SITE_URL     = process.env.SITE_URL     || "";

// Проверяем обязательные переменные
const missing = [];
if (!TG_TOKEN)     missing.push("TG_TOKEN");
if (!DEEPSEEK_KEY) missing.push("DEEPSEEK_KEY");
if (!VAULT_KEY)    missing.push("VAULT_KEY");

if (missing.length > 0) {
  console.error("❌  Missing Railway environment variables:", missing.join(", "));
  console.error("    Add them in Railway → Variables");
  process.exit(1);
}

// ── Пути ────────────────────────────────────────────────────────────────────
const HOME          = os.homedir();
const OPENCLAW_DIR  = path.join(HOME, ".openclaw");
const CONFIG_PATH   = path.join(OPENCLAW_DIR, "openclaw.json");
const SECRETS_DIR   = path.join(OPENCLAW_DIR, "secrets");
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, "workspace");

fs.mkdirSync(OPENCLAW_DIR,  { recursive: true });
fs.mkdirSync(SECRETS_DIR,   { recursive: true });
fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

// ── Копируем workspace ───────────────────────────────────────────────────────
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      // Не перезаписывать MEMORY.md если уже есть (сохраняем память между деплоями)
      if (entry.name === "MEMORY.md" && fs.existsSync(dstPath)) continue;
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

const localWorkspace = path.join(__dirname, "workspace");
if (fs.existsSync(localWorkspace)) {
  copyDir(localWorkspace, WORKSPACE_DIR);
  console.log("✓  Workspace copied to", WORKSPACE_DIR);
}

// ── Генерируем gateway token ─────────────────────────────────────────────────
const GATEWAY_TOKEN = crypto.randomBytes(24).toString("hex");

// ── Пишем openclaw.json ──────────────────────────────────────────────────────
const VAULT_FILE = path.join(WORKSPACE_DIR, "vault.enc.json");

const config = {
  gateway: {
    port: parseInt(PORT),
    mode: "local",
    bind: "all",          // Railway требует 0.0.0.0
    auth: {
      mode: "token",
      token: GATEWAY_TOKEN
    }
  },
  models: {
    mode: "merge",
    providers: {
      deepseek: {
        baseUrl: "https://api.deepseek.com",
        apiKey: DEEPSEEK_KEY,
        api: "openai-completions",
        models: [
          {
            id: "deepseek/deepseek-chat",
            name: "DeepSeek Chat",
            reasoning: false,
            input: ["text"],
            contextWindow: 65536,
            maxTokens: 8192,
            cost: { input: 0.00027, output: 0.001, cacheRead: 0, cacheWrite: 0 }
          },
          {
            id: "deepseek/deepseek-reasoner",
            name: "DeepSeek Reasoner",
            reasoning: true,
            input: ["text"],
            contextWindow: 65536,
            maxTokens: 8192,
            cost: { input: 0.00055, output: 0.00219, cacheRead: 0, cacheWrite: 0 }
          }
        ]
      }
    }
  },
  agents: {
    defaults: {
      model: {
        primary: "deepseek/deepseek-chat",
        fallback: ["deepseek/deepseek-reasoner"]
      },
      workspace: WORKSPACE_DIR,
      session: { maxHistory: 40, timeoutMinutes: 120 },
      heartbeat: { every: "30m" },
      contextPruning: { mode: "sliding", softThresholdTokens: 40000 },
      compaction: { mode: "safeguard" }
    }
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: TG_TOKEN,
      dmPolicy: "open",
      streamMode: "partial",
      linkPreview: false,
      capabilities: { inlineButtons: "all" },
      reactionNotifications: "own",
      customCommands: [
        { command: "code",   description: "Generate code — OpenCode engine" },
        { command: "chain",  description: "Build agent pipeline" },
        { command: "watch",  description: "Detect patterns, propose automations" },
        { command: "vault",  description: "Store secrets (AES-256)" },
        { command: "github", description: "GitHub repo status + auto-PR" },
        { command: "memory", description: "Show stored context" },
        { command: "dash",   description: "Live dashboard" },
        { command: "clear",  description: "Reset conversation" },
        { command: "help",   description: "All commands" }
      ]
    }
  },
  crons: {
    "jester-heartbeat": {
      schedule: "*/30 * * * *",
      task: "Run heartbeat: check HEARTBEAT.md for pending actions"
    },
    "jester-daily-briefing": {
      schedule: "0 9 * * *",
      task: "Send daily briefing: summarize MEMORY.md, post to Telegram"
    }
  },
  skills: {
    nativeSkills: true,
    entries: {
      "jester-code":   { enabled: true, model: "deepseek/deepseek-reasoner" },
      "jester-chain":  { enabled: true, model: "deepseek/deepseek-reasoner" },
      "jester-watch":  { enabled: true },
      "jester-vault":  { enabled: true },
      "jester-github": { enabled: true }
    }
  },
  tools: {
    shell: { enabled: true, timeout: 30 },
    files: { enabled: true },
    web:   { enabled: false }
  }
};

fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log("✓  ~/.openclaw/openclaw.json written");

// ── Пишем secrets env ────────────────────────────────────────────────────────
const secretsEnv = [
  `VAULT_KEY=${VAULT_KEY}`,
  `VAULT_FILE=${VAULT_FILE}`,
  `DEEPSEEK_KEY=${DEEPSEEK_KEY}`,
].join("\n");

const secretsPath = path.join(SECRETS_DIR, "jester.env");
fs.writeFileSync(secretsPath, secretsEnv, { mode: 0o600 });
console.log("✓  Secrets file written");

console.log("✓  Setup complete. Starting OpenClaw gateway on port", PORT);
