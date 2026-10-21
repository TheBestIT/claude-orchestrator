import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Run, TaskNode, Tier } from '../types'

const PANE = 'orchestrator'
const PLAN_TOOL = 'mcp__orchestrator__plan'
const ROOT = '*'
const TIERS: readonly Tier[] = ['haiku', 'sonnet', 'opus']
// The orchestrator puts "[T1]" at the start of an Agent description to link the subagent to a subtask.
const TAG = /^\s*\[([A-Za-z0-9_.-]{1,24})\]/

const runAtom = atom({ plugin: 'orchestrator', key: 'run' } as const, null)
const isAlways = atom({ plugin: 'orchestrator', key: 'isAlways' } as const, false)
const nowAtom = atom({ plugin: 'orchestrator', key: 'now' } as const, 0)

const ROUTING = `Model routing (pick the cheapest model that can do the subtask well):
- haiku: mechanical, low-risk work with a clear answer. Typo and grammar fixes, renames, formatting, version bumps, simple lookups and file searches, short summaries, boilerplate from an example.
- sonnet: normal engineering work. Features with a clear spec, tests, moderate bugs, docs, refactors in one module, code review of a small change.
- opus: hard reasoning. Architecture and design, subtle or cross-cutting bugs, concurrency, security, performance analysis, ambiguous requirements, integration of other subagents' work when it conflicts.`

const PROTOCOL = `You are the orchestrator. Do not do the work yourself. Split it and delegate it.

1. Read only enough of the project to split the task well.
2. Call the ${PLAN_TOOL} tool with the goal and a tree of subtasks. Give each subtask a short id (T1, T2, T2.1...), a title, a model tier, a one-line reason for the tier, an optional parent id, and optional dependsOn ids. Keep subtasks small and independent where you can.
3. For each subtask, call the Agent tool. Start its description with the id in brackets, for example "[T2] Add parser tests". The mod sets the model from the plan, so you need not pass one.
4. Give each subagent focused context, not the whole conversation: the goal in one sentence, the exact files and paths, the facts you already found, the constraints, the acceptance criteria, and what to report back. Tell it what is out of scope. Tell it to report what it could not do, for example a command that was blocked.
5. Run independent subtasks in parallel (several Agent calls in one message). Run dependent subtasks after their dependencies finish, and pass the results they need.
6. If a result shows new work, call ${PLAN_TOOL} again with the same goal to add subtasks, then delegate them.
7. When all subtasks are done, check the results. Do not trust a claim without evidence (a cheap model can say that tests passed when it did not run them). Fix conflicts (delegate the fix too), and give the user a short summary.

${ROUTING}`

type $ = EngineInterface

function str(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function tierOf(value: unknown): Tier | undefined {
  return TIERS.find(tier => tier === value)
}

function firstLine(text: string): string {
  const line = text.split('\n').map(one => one.trim()).find(one => one.length > 0) ?? ''
  return line.replace(/^[#>*\-\s]+/, '').slice(0, 160)
}

function patch($: $, match: (node: TaskNode) => boolean, change: (node: TaskNode) => TaskNode) {
  return update($, runAtom, run =>
    run === null ? null : { ...run, nodes: run.nodes.map(node => (match(node) ? change(node) : node)) },
  )
}

// Reads the plan tool's input and merges it into the run. A different goal starts a new run.
function mergePlan(run: Run | null, input: Record<string, unknown>, now: number): { run: Run; added: number } {
  const goal = str(input.goal, 300) || run?.goal || 'Task'
  const base: Run = run !== null && run.goal === goal ? run : { goal, startedAt: now, nodes: [] }
  const list = Array.isArray(input.subtasks) ? input.subtasks : []
  const nodes = [...base.nodes]
  let added = 0
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) continue
    const item = raw as Record<string, unknown>
    const id = str(item.id, 24).replace(/[^A-Za-z0-9_.-]/g, '')
    if (id === '') continue
    const fields = {
      title: str(item.title, 120) || id,
      tier: tierOf(item.model),
      why: str(item.why, 160) || undefined,
      parent: str(item.parent, 24) || null,
      dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn.map(one => str(one, 24)).filter(Boolean) : [],
    }
    const at = nodes.findIndex(node => node.id === id && !node.isAdhoc)
    const old = nodes[at]
    if (old !== undefined) {
      nodes[at] = { ...old, ...fields }
    } else {
      nodes.push({ id, ...fields, status: 'planned', isAdhoc: false, tools: 0, tokens: 0 })
      added += 1
    }
  }

  return { run: { ...base, endedAt: undefined, nodes }, added }
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))

  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`
}

function formatTokens(tokens: number): string {
  return tokens < 1000 ? `${tokens}` : `${(tokens / 1000).toFixed(1)}k`
}

function clip(text: string, room: number): string {
  if (room <= 1) return ''

  return text.length <= room ? text : `${text.slice(0, room - 1)}…`
}

const ICON = { planned: '○', running: '◐', done: '✔', failed: '✖' } as const
const SPIN = ['◐', '◓', '◑', '◒']
const STATUS_COLOR = { planned: 'inactive', running: 'warning', done: 'success', failed: 'error' } as const
const TIER_COLOR = { haiku: 'success', sonnet: 'suggestion', opus: 'merged' } as const

function tierLabel(node: TaskNode): string {
  const model = node.model ?? node.tier

  if (model === undefined) return 'inherit'
  const tier = TIERS.find(one => model.includes(one))

  return tier ?? model
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'orchestrate',
      description: 'Split a task into subtasks for subagents on fitting models (or: on | off | tree | clear)',
      argumentHint: '<task> | on | off | tree | clear',
    })
    await $.tool.register({
      name: 'plan',
      isDeferred: false,
      description: `Declare or extend the orchestration plan: the goal and a tree of subtasks, each with a model tier. Call it before you delegate subtasks with the Agent tool, and again with the same goal to add subtasks. The plan shows to the user as a live tree.\n\n${ROUTING}`,
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'The whole task in one sentence.' },
          subtasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Short id, such as T1 or T2.1. Put it in brackets at the start of the Agent description.' },
                title: { type: 'string', description: 'What the subtask does, in a few words.' },
                model: { type: 'string', enum: TIERS, description: 'The model tier for the subagent.' },
                why: { type: 'string', description: 'One line: why this tier.' },
                parent: { type: 'string', description: 'The id of the parent subtask, for a nested subtask.' },
                dependsOn: { type: 'array', items: { type: 'string' }, description: 'Ids that must finish first.' },
              },
              required: ['id', 'title', 'model'],
            },
          },
        },
        required: ['goal', 'subtasks'],
      },
    })
    // Moves the clock of the pane each second while a subagent runs, so the times count up.
    $.clock.every(1000, async () => {
      const run = await read($, runAtom)
      if (run === null || !run.nodes.some(node => node.status === 'running')) return
      const now = await $.clock.now()
      await update($, nowAtom, () => now)
    })

    return next(e)
  })

  on('command.run', { command: 'orchestrate' }, async ($, e) => {
    const args = e.args.trim()
    const word = args.toLowerCase()

    if (word === 'on' || word === 'off') {
      await update($, isAlways, () => word === 'on')

      return { text: word === 'on' ? 'Orchestrator mode is on: each task is split and delegated.' : 'Orchestrator mode is off.' }
    }
    if (word === 'clear') {
      await update($, runAtom, () => null)

      return { text: 'The task tree is clear.' }
    }
    await $.ui.open({ id: PANE, title: 'Task tree' })
    if (word === '' || word === 'tree') {
      return { text: 'The task tree pane is open.' }
    }
    // Submit from a timer: the queued turn starts only after this command ends, and the
    // engine stops the $ calls of the command when it ends.
    $.clock.after(50, () => {
      void $.prompt.submit({ text: `${PROTOCOL}\n\nThe task:\n${args}` }).catch(() => undefined)
    })

    return { text: `Orchestrating: ${clip(args, 80)}` }
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (!(await read($, isAlways))) return result

    return { sections: [...result.sections, { id: 'orchestrator:protocol', text: `When the user gives you a task with more than one step, act as follows.\n\n${PROTOCOL}`, scope: 'session' as const }] }
  })

  on('tool.call', { tool: PLAN_TOOL }, async ($, e) => {
    const now = await $.clock.now()
    let summary = { added: 0, total: 0, goal: '' }
    await update($, runAtom, run => {
      const merged = mergePlan(run, e as Record<string, unknown>, now)
      summary = { added: merged.added, total: merged.run.nodes.length, goal: merged.run.goal }

      return merged.run
    })
    void $.ui.open({ id: PANE, title: 'Task tree' })

    return {
      result: `Plan for "${summary.goal}": ${summary.added} subtask(s) added, ${summary.total} in the tree. Now delegate each subtask with the Agent tool. Start each description with its id in brackets, like "[T1] ...". The model comes from the plan.`,
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const run = await read($, runAtom)
    if (run === null || run.endedAt !== undefined || e.resume !== undefined || e.workflow !== undefined) return next(e)

    const tag = TAG.exec(e.description)?.[1]
    const planned = tag === undefined ? undefined : run.nodes.find(node => node.id === tag && !node.isAdhoc)
    const parentNode = run.nodes.find(node => node.agentId !== undefined && node.agentId === e.parentAgentId)
    const now = await $.clock.now()
    const id = planned?.id ?? `${parentNode?.id ?? 'A'}.${run.nodes.filter(node => node.isAdhoc).length + 1}`
    const tier = planned?.tier
    const input = tier !== undefined && !e.fork ? { ...e, model: tier } : e

    await update($, runAtom, current => {
      if (current === null) return null
      const fresh = { status: 'running' as const, toolUseId: e.tool_use_id, startedAt: now, endedAt: undefined, model: input.model }
      if (planned !== undefined) {
        return { ...current, nodes: current.nodes.map(node => (node.id === id && !node.isAdhoc ? { ...node, ...fresh } : node)) }
      }
      const adhoc: TaskNode = {
        id,
        title: e.description.replace(TAG, '').trim() || 'Subagent',
        parent: parentNode?.id ?? null,
        dependsOn: [],
        isAdhoc: true,
        tools: 0,
        tokens: 0,
        ...fresh,
      }

      return { ...current, nodes: [...current.nodes, adhoc] }
    })

    const isMine = (node: TaskNode) => node.id === id && node.toolUseId === e.tool_use_id
    const out = await next(input)
    if (out.deny !== undefined) {
      await patch($, isMine, node => ({ ...node, status: 'failed', summary: firstLine(out.deny), endedAt: now }))
    } else {
      await patch($, isMine, node => ({ ...node, agentId: out.agentId, model: out.model }))
    }

    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const agentId = e.agentId
      await patch($, node => node.agentId === agentId, node => ({ ...node, tools: node.tools + 1, lastTool: String(e.tool) }))
    }
    const ran = await next(e)
    if (e.tool === 'Agent' && (ran.deny !== undefined || ran.isError === true)) {
      const now = await $.clock.now()
      await patch($, node => node.toolUseId === e.tool_use_id && node.status === 'running', node => ({
        ...node,
        status: 'failed',
        endedAt: now,
        summary: node.summary ?? firstLine(ran.deny ?? 'The Agent call failed.'),
      }))
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    if (e.agentId !== undefined) {
      const agentId = e.agentId
      const usage = e.usage
      const tokens = usage === undefined ? 0 : usage.input_tokens + usage.output_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
      await patch($, node => node.agentId === agentId, node => ({
        ...node,
        status: e.reason === 'answer' ? 'done' : 'failed',
        endedAt: now,
        tokens: node.tokens + tokens,
        summary: firstLine(e.answer) || node.summary,
        model: usage?.model ?? node.model,
      }))
    } else {
      await update($, runAtom, run =>
        run === null || run.endedAt !== undefined || run.nodes.length === 0 || run.nodes.some(node => node.status === 'running' || node.status === 'planned')
          ? run
          : { ...run, endedAt: now },
      )
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const run = await read($, runAtom)
    const tick = await read($, nowAtom)
    const width = Math.max(30, e.props.bodyColumns)

    if (run === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No task yet.</Text>
          <Text dimColor>Type /orchestrate {'<task>'} to start one.</Text>
        </Box>
      )
    }

    const now = Math.max(tick, ...run.nodes.map(node => node.endedAt ?? node.startedAt ?? 0))
    const ids = new Set(run.nodes.map(node => node.id))
    const childrenOf = (parent: string) =>
      run.nodes.filter(node => (node.parent !== null && ids.has(node.parent) && node.parent !== node.id ? node.parent : ROOT) === parent)
    const count = (status: TaskNode['status']) => run.nodes.filter(node => node.status === status).length
    const tokens = run.nodes.reduce((sum, node) => sum + node.tokens, 0)
    const spin = SPIN[Math.floor(tick / 1000) % SPIN.length]
    const rows: unknown[] = []

    const walk = (parent: string, prefix: string, depth: number) => {
      const children = childrenOf(parent)
      children.forEach((node, index) => {
        const isLast = index === children.length - 1
        const branch = isLast ? '└─ ' : '├─ '
        const under = prefix + (isLast ? '   ' : '│  ')
        const icon = node.status === 'running' ? spin : ICON[node.status]
        const tier = tierLabel(node)
        const tierColor = TIER_COLOR[tier as Tier] ?? 'subtle'
        const elapsed = node.startedAt === undefined ? '' : formatDuration((node.endedAt ?? now) - node.startedAt)
        const meta = [elapsed, node.tools > 0 ? `${node.tools} tools` : '', node.tokens > 0 ? `${formatTokens(node.tokens)} tok` : '']
          .filter(Boolean)
          .join(' · ')
        const head = `${prefix}${branch}${icon} ${node.id} `
        const room = width - head.length - tier.length - 3 - (meta.length > 0 ? meta.length + 2 : 0)
        rows.push(
          <Text key={`n-${node.id}-${node.toolUseId ?? ''}`}>
            <Text dimColor>{prefix}{branch}</Text>
            <Text color={STATUS_COLOR[node.status]}>{icon} </Text>
            <Text bold>{node.id} </Text>
            <Text dimColor={node.status === 'planned'}>{clip(node.title, Math.max(8, room))} </Text>
            <Text color={tierColor}>[{tier}]</Text>
            {meta.length > 0 && <Text dimColor>  {meta}</Text>}
          </Text>,
        )
        const detail =
          node.status === 'running'
            ? node.lastTool !== undefined ? `→ ${node.lastTool}` : '→ starts'
            : node.status === 'planned'
              ? node.dependsOn.length > 0 ? `after ${node.dependsOn.join(', ')}` : node.why ?? ''
              : node.summary ?? ''
        if (detail !== '' && depth < 6) {
          rows.push(
            <Text key={`d-${node.id}-${node.toolUseId ?? ''}`} dimColor>
              {under}  {clip(detail, width - under.length - 2)}
            </Text>,
          )
        }
        walk(node.id, under, depth + 1)
      })
    }
    walk(ROOT, '', 0)

    const total = run.nodes.length
    const done = count('done')
    const isOver = run.endedAt !== undefined
    const headIcon = isOver ? (count('failed') > 0 ? '✖' : '✔') : count('running') > 0 ? spin : '◆'
    const summary = [
      `${done}/${total} done`,
      count('running') > 0 ? `${count('running')} running` : '',
      count('failed') > 0 ? `${count('failed')} failed` : '',
      formatDuration((run.endedAt ?? now) - run.startedAt),
      tokens > 0 ? `${formatTokens(tokens)} tok` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const byTier = TIERS.map(tier => [tier, run.nodes.filter(node => tierLabel(node) === tier).length] as const).filter(([, n]) => n > 0)

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="claude" bold>{headIcon} {clip(run.goal, width - 2)}</Text>
        </Text>
        <Text dimColor>{summary}</Text>
        {rows as never[]}
        {total === 0 && <Text dimColor>No subtasks yet.</Text>}
        <Text> </Text>
        <Text>
          {byTier.map(([tier, n]) => (
            <Text key={`t-${tier}`} color={TIER_COLOR[tier]}>
              ■ {tier} {n}{'  '}
            </Text>
          ))}
        </Text>
      </Box>
    )
  })
}
