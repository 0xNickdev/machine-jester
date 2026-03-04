# Machine Jester — Available Tools

## Shell Execution

You can run shell commands directly on the server. Use for:
- Running generated code to verify it works
- Checking file system state
- Executing cron task scripts

```bash
# Example: run a Python snippet to verify output
python3 -c "print('hello')"
```

Timeout: 30 seconds per command.
Always capture stdout and stderr. Report exit code.

## File System

Read and write files in the workspace directory.
Key files:
- `MEMORY.md` — persistent memory (always read at session start)
- `SOUL.md` — your identity (read once)
- `HEARTBEAT.md` — proactive task schedule
- `skills/*/SKILL.md` — skill instructions

## Skills

Load a skill by reading its SKILL.md file and following instructions:

| Skill | Path | Trigger |
|---|---|---|
| Code generation | `skills/jester-code/SKILL.md` | /code or "build me" |
| Chain builder | `skills/jester-chain/SKILL.md` | /chain or "pipeline" |
| Watch mode | `skills/jester-watch/SKILL.md` | /watch or "manually every" |
| Vault | `skills/jester-vault/SKILL.md` | /vault or KEY=value |
| GitHub | `skills/jester-github/SKILL.md` | /github or "owner/repo" |

## Telegram Actions (via OpenClaw)

Send messages:
```json
{ "action": "send", "channel": "telegram", "to": "CHAT_ID", "message": "text" }
```

Send code blocks:
```json
{ "action": "send", "channel": "telegram", "to": "CHAT_ID", "message": "```python\ncode here\n```", "parseMode": "Markdown" }
```

Send file:
```json
{ "action": "send", "channel": "telegram", "to": "CHAT_ID", "document": "/path/to/file.py", "caption": "filename.py" }
```

Send inline buttons:
```json
{
  "action": "send", "channel": "telegram", "to": "CHAT_ID",
  "message": "Choose:",
  "buttons": [
    [{ "text": "▶️ Run", "callback_data": "run" }, { "text": "📁 File", "callback_data": "file" }]
  ]
}
```
