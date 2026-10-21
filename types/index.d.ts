export type Tier = 'haiku' | 'sonnet' | 'opus'

export type NodeStatus = 'planned' | 'running' | 'done' | 'failed'

export type TaskNode = {
  id: string
  title: string
  parent: string | null
  tier?: Tier
  why?: string
  dependsOn: string[]
  status: NodeStatus
  isAdhoc: boolean
  model?: string
  agentId?: string
  toolUseId?: string
  startedAt?: number
  endedAt?: number
  tools: number
  lastTool?: string
  tokens: number
  summary?: string
}

export type Run = {
  goal: string
  startedAt: number
  endedAt?: number
  nodes: TaskNode[]
}

declare module 'claude-code' {
  interface PluginState {
    orchestrator: { run: Run | null; isAlways: boolean; now: number }
  }
}
