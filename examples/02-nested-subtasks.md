# Example 2: Nested subtasks

## Goal

Use a parent subtask with child subtasks. Use `dependsOn` to show the order of the work.

## Steps

1. Type the command:

   ```
   /orchestrate Add a CSV export to the report module, with tests
   ```

2. The orchestrator calls the `mcp__orchestrator__plan` tool. T2 is a parent. T2.1 and T2.2 are its children. T3 waits for T2.

   ```json
   {
     "goal": "Add a CSV export to the report module, with tests",
     "subtasks": [
       {
         "id": "T1",
         "title": "Find the report files",
         "model": "haiku",
         "why": "A file search has a clear answer."
       },
       {
         "id": "T2",
         "title": "Write the CSV export",
         "model": "sonnet",
         "why": "A feature with a clear spec.",
         "dependsOn": ["T1"]
       },
       {
         "id": "T2.1",
         "title": "Write the CSV encoder",
         "model": "sonnet",
         "why": "Normal engineering work.",
         "parent": "T2"
       },
       {
         "id": "T2.2",
         "title": "Add the export button",
         "model": "sonnet",
         "why": "A small change in one module.",
         "parent": "T2",
         "dependsOn": ["T2.1"]
       },
       {
         "id": "T3",
         "title": "Write export tests",
         "model": "sonnet",
         "why": "Tests with a clear spec.",
         "dependsOn": ["T2"]
       }
     ]
   }
   ```

3. The orchestrator starts T1 first. The other subtasks wait for it.

   ```
   [T1] Find the report files
   ```

4. After T1, the orchestrator starts the subagents for the children. T2.2 waits for T2.1.

   ```
   [T2.1] Write the CSV encoder
   [T2.2] Add the export button
   ```

5. After T2.1 and T2.2, the orchestrator starts the last subtask.

   ```
   [T3] Write export tests
   ```

6. Wait for the final summary.

## Expected result

At the start of the run, the pane shows this text. A planned subtask with `dependsOn` shows `after` and the ids:

```
◐ Add a CSV export to the report module, with tests
0/5 done · 1 running · 6s
├─ ◐ T1 Find the report files [haiku]  6s · 1 tools
│    → Grep
├─ ○ T2 Write the CSV export [sonnet]
│    after T1
│  ├─ ○ T2.1 Write the CSV encoder [sonnet]
│  │    Normal engineering work.
│  └─ ○ T2.2 Add the export button [sonnet]
│       after T2.1
└─ ○ T3 Write export tests [sonnet]
     after T2

■ haiku 1  ■ sonnet 4
```

At the end of the run, the pane shows this text:

```
✔ Add a CSV export to the report module, with tests
5/5 done · 2m31s · 31.0k tok
├─ ✔ T1 Find the report files [haiku]  7s · 3 tools · 1.4k tok
│    Found src/report/index.ts and src/report/view.tsx.
├─ ✔ T2 Write the CSV export [sonnet]  1m02s · 2 tools · 2.0k tok
│    The export is ready. See T2.1 and T2.2.
│  ├─ ✔ T2.1 Write the CSV encoder [sonnet]  38s · 7 tools · 9.7k tok
│  │    Added src/report/csv.ts with quote and comma rules.
│  └─ ✔ T2.2 Add the export button [sonnet]  21s · 4 tools · 6.5k tok
│       Added the button in src/report/view.tsx.
└─ ✔ T3 Write export tests [sonnet]  44s · 8 tools · 11.4k tok
     Added 9 tests. All 9 pass.

■ haiku 1  ■ sonnet 4
```

## Notes

- The `parent` field sets the place in the tree. A child shows below its parent.
- The `dependsOn` field does not start the subtasks. It only shows `after ...` in the pane. The orchestrator must run the subtasks in the right order.
- A subagent that another subagent starts also shows below its parent. If it has no tag, the mod gives it an ad hoc id.
- To add work later, the orchestrator calls the plan tool again with the same goal. The mod adds the new subtasks. A call with a different goal starts a new tree.
