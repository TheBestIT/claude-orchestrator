# Changelog

## [0.1.1] - 2026-10-21

### Added

- A plugin icon at `.claude-plugin/icon.png`. The README shows the icon.

### Changed

- The author name is now TheBestIT in `plugin.json`, `marketplace.json` and `LICENSE`.

## [0.1.0] - 2026-10-18

### Added

- The `/orchestrate <task>` command. The main Claude instance splits the task into subtasks. Each subtask goes to a subagent.
- The `plan` tool. It records the goal and a tree of subtasks. Each subtask has a model tier: haiku, sonnet or opus.
- Model routing. The mod sets the subagent model from the plan.
- A live Task tree pane. It shows the status, model, time, tool calls, tokens and result of each subagent. Nested subagents show below their parent.
- The commands `/orchestrate on`, `/orchestrate off`, `/orchestrate tree` and `/orchestrate clear`.
- Tests for the model routing, the tree and the command.

### Fixed

- `/orchestrate <task>` did not answer. The command waited for its own queued prompt.
- `/orchestrate <task>` did not start the task. The engine stopped the queued prompt when the command ended. The mod now queues the prompt from a timer.

[0.1.1]: https://github.com/TheBestIT/claude-orchestrator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TheBestIT/claude-orchestrator/releases/tag/v0.1.0
