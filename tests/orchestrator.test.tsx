import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PANE_PROPS = {
  title: 'Task tree',
  isFocused: false,
  bodyColumns: 90,
  placement: 'dock',
  scroll: { top: 0, bodyRows: 40 },
} as never

const PLAN = {
  goal: 'Clean up the docs and add tests',
  subtasks: [
    { id: 'T1', title: 'Fix typos in README', model: 'haiku', why: 'mechanical' },
    { id: 'T2', title: 'Write parser tests', model: 'sonnet' },
    { id: 'T3', title: 'Redesign the error model', model: 'opus', dependsOn: ['T2'] },
  ],
}

function spawnInput(description: string, extra: Record<string, unknown> = {}) {
  return {
    tool_use_id: `tu-${description}`,
    prompt: 'Do the subtask.',
    description,
    subagentType: 'general-purpose',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
    ...extra,
  } as never
}

function complete($: Engine, agentId: string, answer: string) {
  return $.turn.complete({
    answer,
    durationMs: 1000,
    isAborted: false,
    turnId: `turn-${agentId}`,
    agentId,
    reason: 'answer',
    usage: { model: 'claude-haiku-5-5', input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  } as never)
}

test('the plan sets each subagent model, and the tree shows the progress', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const spawned: Record<string, string | undefined> = {}
  let count = 0
  on('agent.spawn', ($, e) => {
    spawned[e.description] = e.model
    count += 1

    return { model: e.model ?? e.parentModel, agentId: `ag${count}` }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: 'ok' }))

  const planned = await $.tool.call({ tool: 'mcp__orchestrator__plan', ...PLAN } as never)
  expect(String(planned.result)).toContain('3 subtask(s) added')

  await $.agent.spawn(spawnInput('[T1] Fix typos'))
  await $.agent.spawn(spawnInput('[T2] Parser tests', { model: 'opus' }))
  expect(spawned['[T1] Fix typos']).toBe('haiku')
  // The plan wins over the model the orchestrator passed.
  expect(spawned['[T2] Parser tests']).toBe('sonnet')

  // A subagent of T2 spawns its own helper: the tree shows it under T2.
  await $.agent.spawn(spawnInput('Find parser files', { parentAgentId: 'ag2' }))
  expect(spawned['Find parser files']).toBeUndefined()

  await $.tool.call({ tool: 'Read', file_path: 'README.md', agentId: 'ag1' } as never)
  await $.tool.call({ tool: 'Edit', file_path: 'README.md', old_string: 'teh', new_string: 'the', agentId: 'ag1' } as never)
  await clock.advance(12_000)
  await complete($, 'ag1', 'Fixed 3 typos in README.md.')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'orchestrator', surface, component: 'Pane', requestId: 'orchestrator', props: PANE_PROPS })
    expect(await ui.find({ type: 'Text', text: /Clean up the docs/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1\/4 done/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /✔ T1 Fix typos in README \[haiku\]\s+12s · 2 tools · 1\.2k tok/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Fixed 3 typos/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /T2 Write parser tests \[sonnet\]/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /│\s+└─ . T2\.1 Find parser files/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /○ T3 Redesign the error model \[opus\]/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /after T2/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the tree is empty before a plan', async $ => {
  const ui = await $.ui.mount({ plugin: 'orchestrator', surface: 'terminal', component: 'Pane', requestId: 'orchestrator', props: PANE_PROPS })
  expect(await ui.find({ type: 'Text', text: /No task yet/ })).toBeDefined()
})

test('/orchestrate <task> answers at once, while the queued turn waits for the command to end', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', () => new Promise(() => undefined))
  const ran = await $.command.run({
    command: 'orchestrate',
    args: 'add a README',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  } as never)
  expect(ran.text).toContain('Orchestrating: add a README')
})
