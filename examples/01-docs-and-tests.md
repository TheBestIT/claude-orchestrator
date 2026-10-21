# Example 1: Docs and tests

## Goal

Split a small task into three subtasks. Each subtask runs on a fitting model.

## Steps

1. Start Claude Code with the mod.
2. Type the command:

   ```
   /orchestrate Fix the typos in README.md, write tests for the parser, and review the error model
   ```

3. The mod opens the Task tree pane. The orchestrator reads the project.
4. The orchestrator calls the `mcp__orchestrator__plan` tool with this input:

   ```json
   {
     "goal": "Fix README typos, add parser tests and review the error model",
     "subtasks": [
       {
         "id": "T1",
         "title": "Fix typos in README",
         "model": "haiku",
         "why": "Typo fixes are mechanical work."
       },
       {
         "id": "T2",
         "title": "Write parser tests",
         "model": "sonnet",
         "why": "Tests with a clear spec are normal engineering work."
       },
       {
         "id": "T3",
         "title": "Review the error model",
         "model": "opus",
         "why": "The requirements are unclear and need design reasoning."
       }
     ]
   }
   ```

5. The orchestrator calls the Agent tool for each subtask. The subtasks are independent, so it sends the calls in one message. These are the descriptions:

   ```
   [T1] Fix typos in README
   [T2] Write parser tests
   [T3] Review the error model
   ```

6. The mod reads the id in brackets. It sets the model of each subagent from the plan.
7. Wait for the subagents to finish. The orchestrator checks the results and writes a short summary.

## Expected result

While the subagents run, the pane shows this text:

```
◐ Fix README typos, add parser tests and review the error model
1/3 done · 2 running · 24s · 3.4k tok
├─ ✔ T1 Fix typos in README [haiku]  8s · 2 tools · 1.2k tok
│    Fixed 3 typos in README.md.
├─ ◐ T2 Write parser tests [sonnet]  16s · 3 tools · 2.2k tok
│    → Edit
└─ ◐ T3 Review the error model [opus]  16s · 1 tools
     → Read

■ haiku 1  ■ sonnet 1  ■ opus 1
```

When all subtasks are done, the pane shows this text:

```
✔ Fix README typos, add parser tests and review the error model
3/3 done · 1m12s · 19.6k tok
├─ ✔ T1 Fix typos in README [haiku]  8s · 2 tools · 1.2k tok
│    Fixed 3 typos in README.md.
├─ ✔ T2 Write parser tests [sonnet]  41s · 9 tools · 8.1k tok
│    Added 6 tests in tests/parser.test.ts. All 6 pass.
└─ ✔ T3 Review the error model [opus]  58s · 6 tools · 10.3k tok
     The error model has two problems.

■ haiku 1  ■ sonnet 1  ■ opus 1
```

## Notes

- A planned subtask shows its `why` text under the title. A done subtask shows the first line of its answer.
- The orchestrator does not pass a model to the Agent tool. The mod uses the model of the plan.
- An Agent call with no `[T1]` tag in the description appears as an ad hoc node. Its id starts with `A.`.
- Use `/orchestrate clear` to remove the tree.
