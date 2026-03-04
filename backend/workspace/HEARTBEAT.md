# Machine Jester — Heartbeat Instructions

These instructions run every 30 minutes via OpenClaw's cron system.
Read MEMORY.md and check for any of the following conditions.
If none apply, do nothing (output NO_ACTION and stop).

---

## Check 1 — Pending Reminders

Read MEMORY.md.
Look for lines matching: `- REMIND: [date] [message]`
If today's date matches any reminder and it has not been sent yet:
1. Send the reminder to the user via Telegram
2. Mark it as sent: replace `REMIND:` with `REMINDED:`

---

## Check 2 — Watch Pattern Alert

Read MEMORY.md.
Look for lines matching: `- WATCH_COUNT: [pattern] [count]`
If any count >= 3 and the automation hasn't been proposed yet (no `WATCH_AUTO:` line for this pattern):
1. Generate a Python automation script for that pattern
2. Propose it to the user in Telegram with the script attached
3. Add a line: `- WATCH_AUTO: [pattern] proposed [date]`

---

## Check 3 — Daily Briefing (9am UTC only)

Only run this check if current UTC hour == 9 and current UTC minute < 31.
Check MEMORY.md for a line: `- BRIEFING_SENT: [today's date]`
If no such line exists:
1. Read the last 7 lines of MEMORY.md
2. Compose a brief daily summary (max 5 bullet points)
3. Send to user in Telegram:

```
🃏 Morning briefing

[bullet points of recent context]

What are we building today?
```

4. Append to MEMORY.md: `- BRIEFING_SENT: [today's date]`

---

## Fallback

If none of the above conditions apply:
Output exactly: `NO_ACTION`
Do not send any message to the user.
