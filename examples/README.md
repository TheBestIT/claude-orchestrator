# Examples

These examples show how to use the orchestrator mod. Each example has a goal, steps, an expected result and notes.

| Example | What it shows |
| --- | --- |
| [01-docs-and-tests.md](01-docs-and-tests.md) | A small task with three flat subtasks, from the command to the final pane |
| [02-nested-subtasks.md](02-nested-subtasks.md) | A task with parent subtasks, child subtasks and `dependsOn` |
| [03-always-on-mode.md](03-always-on-mode.md) | `/orchestrate on`, `/orchestrate off` and the `claude -p` stream-json path |
| [04-model-routing.md](04-model-routing.md) | A table of sample subtasks and the model tier to pick for each |

Start Claude Code with the mod before you try an example:

```
claude --plugin-dir D:\Projects\claude-orchestrator
```

The plans and pane texts in these examples are samples. The real orchestrator can choose other ids, titles and times.
