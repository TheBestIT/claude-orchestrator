# Example 3: Always-on mode

## Goal

Make each task in a session use orchestrator mode. Then turn the mode off. Use the same mode in `claude -p`.

## Steps

### Interactive session

1. Type the command:

   ```
   /orchestrate on
   ```

   The mod answers: `Orchestrator mode is on: each task is split and delegated.`

2. Type a normal prompt. You do not need the `/orchestrate` command:

   ```
   Rename the function getData to loadData in the whole project, then update the docs
   ```

   The mod adds the orchestrator rules to the session prompt. The orchestrator calls the plan tool and starts the subagents.

3. Type a second normal prompt:

   ```
   Now add a retry to loadData and write tests for it
   ```

4. Type the command to stop:

   ```
   /orchestrate off
   ```

   The mod answers: `Orchestrator mode is off.`

### Path with `claude -p`

In `claude -p`, `/orchestrate <task>` does not start the task. Use `/orchestrate on` first. Then send the task in the same session.

1. Make a file `input.jsonl` with two lines. Each line is one user message:

   ```
   {"type":"user","message":{"role":"user","content":"/orchestrate on"}}
   {"type":"user","message":{"role":"user","content":"Rename getData to loadData in the whole project, then update the docs"}}
   ```

2. Run the command:

   ```
   claude -p --plugin-dir D:\Projects\claude-orchestrator --input-format stream-json --output-format stream-json --verbose < input.jsonl
   ```

## Expected result

In the interactive session, the pane shows the tree for each task. For the first prompt, it can show this text:

```
◐ Rename getData to loadData and update the docs
1/2 done · 1 running · 19s · 2.6k tok
├─ ✔ T1 Rename getData to loadData [haiku]  11s · 4 tools · 2.6k tok
│    Renamed 14 uses in 6 files.
└─ ◐ T2 Update the docs [sonnet]  8s · 1 tools
     → Read

■ haiku 1  ■ sonnet 1
```

For the second prompt, the plan has a new goal. The mod starts a new tree. Use `/orchestrate clear` to remove a tree.

With `claude -p`, the output is a stream of JSON lines. The first line has `"type":"system"` and `"subtype":"init"`. Its tool list includes `mcp__orchestrator__plan`. Its slash command list includes `orchestrate`.

## Notes

- Mode `on` stays until you send `/orchestrate off` or the session ends.
- The rules tell the orchestrator to split a task that has more than one step.
- `--output-format stream-json` needs `--verbose` when you use it with `-p`.
- The pane shows only in the interactive terminal. In `claude -p`, read the stream output to see the subagent work.
- For other options, run `claude --help`.
