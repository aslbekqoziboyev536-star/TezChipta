---
trigger: always_on
---

Agent can modify files ONLY under the following conditions:

- Must clearly identify target file
- Must explain reason for modification
- Must apply minimal diff changes (not full file rewrite unless required)
- Must avoid destructive changes (deleting entire modules without reason)