# Example 4: Model routing

## Goal

Pick the right model tier for a subtask. Pick the cheapest model that can do the subtask well.

## Steps

1. Read the subtask.
2. Find the nearest row in the table below.
3. Put the tier in the `model` field of the plan tool.
4. Write the reason in the `why` field. Keep it to one line.

| Subtask | Tier | Why |
| --- | --- | --- |
| Fix three typos in README | `haiku` | Typo and grammar fixes are mechanical and low-risk. |
| Rename a function in all files | `haiku` | A rename has a clear answer. |
| Bump the version in package.json | `haiku` | A version bump is mechanical. |
| Find the files that use the parser | `haiku` | A simple search has a clear answer. |
| Write a short summary of a module | `haiku` | A short summary is low-risk. |
| Create a boilerplate file from an example | `haiku` | Boilerplate follows an example. |
| Add a CSV export with a clear spec | `sonnet` | A feature with a clear spec is normal engineering work. |
| Write unit tests for the parser | `sonnet` | Tests are normal engineering work. |
| Fix a bug in one function | `sonnet` | A moderate bug needs normal engineering skill. |
| Update the API docs | `sonnet` | Docs are normal engineering work. |
| Refactor one module | `sonnet` | A refactor in one module is normal work. |
| Review a small change | `sonnet` | A review of a small change is normal work. |
| Design the error model for the whole app | `opus` | Architecture and design need hard reasoning. |
| Find a bug that only shows under load | `opus` | A subtle bug can have causes in many places. |
| Fix a race condition in the queue | `opus` | Concurrency needs hard reasoning. |
| Check the login code for security holes | `opus` | Security work must be exact. |
| Find why the build is 3 times slower | `opus` | Performance analysis needs hard reasoning. |
| Build a feature from a vague request | `opus` | The requirements are unclear. |
| Merge the work of two subagents that conflict | `opus` | The integration of conflicting work needs hard reasoning. |

## Expected result

The plan has a tier for each subtask. The pane shows the tier in brackets and the count of each tier at the bottom:

```
◐ Speed up the build and fix the docs
1/3 done · 1 running · 33s · 7.9k tok
├─ ✔ T1 Fix typos in the docs [haiku]  9s · 2 tools · 1.1k tok
│    Fixed 5 typos in docs/guide.md.
├─ ◐ T2 Find why the build is slow [opus]  24s · 6 tools · 6.8k tok
│    → Bash
└─ ○ T3 Update the build docs [sonnet]
     after T2

■ haiku 1  ■ sonnet 1  ■ opus 1
```

## Notes

- The table follows the routing text in `hooks/register.tsx`. The plan tool description and the orchestrator rules use the same text.
- When a subtask is on the border of two tiers, split it. Give the mechanical part to `haiku` and the hard part to `opus`.
- The mod uses the plan tier, also when the orchestrator sends a different model to the Agent tool.
- A cheap model can say that it did a step when it did not. The orchestrator must check the evidence.
- An Agent call with no tag or an unknown id has no tier. The pane shows the model name or `inherit`.
