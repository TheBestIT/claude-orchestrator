# Contributing to the orchestrator mod

Thank you for your interest in this project. This guide explains how to report a bug, propose a change, set up a local copy and prepare a pull request.

## Report a bug

1. Search the existing issues. The bug can already be reported.
2. Open a new issue. Use the bug report template.
3. Give the steps that cause the bug. Give the expected result and the actual result.
4. Give your Claude Code version, your operating system and the mod version.

## Propose a change

1. Open an issue first for a large change. Use the feature request template.
2. Describe the problem that the change solves. Describe the proposed behavior.
3. Wait for a maintainer reply before you start a large change.
4. For a small fix, open a pull request directly.

## Set up locally

1. Clone the repository.
2. Start Claude Code with the mod folder:

   ```
   claude --plugin-dir .
   ```

3. Run `/orchestrate tree` to check that the pane opens.

## Check before a pull request

Run both checks from the repository root:

```
claude plugin validate .
claude plugin test .
```

Fix every error before you open the pull request.

## Writing rule for documentation

All documentation uses ASD-STE100 Simplified Technical English. Follow these rules:

- Write short sentences. A procedural sentence has 20 words maximum.
- Use the active voice and the simple tenses.
- Start an instruction with a verb.
- Give one instruction in one sentence.
- Use one word with one meaning.
- Do not use the `-ing` form, except in a technical name.
- Use three words maximum in a group of nouns.

## Commit messages

- Write the subject in the imperative mood, for example `Add parser tests`.
- Keep the subject line to 72 characters or fewer.
- Start the subject with a capital letter. Do not end it with a period.
- Use the body to explain what changed and why. Wrap lines at 72 characters.
- Refer to an issue in the body when one exists, for example `Refs #12`.

## Pull requests

1. Create a branch from the default branch.
2. Make one change for each pull request.
3. Complete the checklist in the pull request template.
4. Wait for a maintainer review. Answer each review comment.

## License

Your contribution is licensed under the MIT License of this project.
