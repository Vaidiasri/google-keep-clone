export interface TodoSummary {
  id: number
  text: string
  done: boolean
  priority?: string
  subtaskCount: number
  parentText?: string
  progress?: number
  bossHp?: number
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
const AI_MODEL = process.env.AI_MODEL ?? 'gemini-2.0-flash'
const GEMINI_MODELS = [AI_MODEL, 'gemini-2.0-flash', 'gemini-1.5-flash']

export function isAiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY)
}

async function callGemini(system: string, user: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null

  for (const model of [...new Set(GEMINI_MODELS)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
          },
        }),
      })
      if (!res.ok) continue
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch {
      /* try next model */
    }
  }
  return null
}

function parseJson(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as Record<string, unknown>
    throw new Error('Invalid JSON')
  }
}

function heuristicSplit(text: string) {
  const cleaned = text.trim()
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
  const bulletItems: string[] = []
  let title: string | undefined
  const bulletRe = /^(\s*[-*•]\s+|\s*\d+\.\s+)/

  for (const raw of lines) {
    if (bulletRe.test(raw)) {
      const item = raw.replace(bulletRe, '').trim()
      if (item) bulletItems.push(item)
    } else if (!title && bulletItems.length === 0) {
      title = raw
    }
  }

  if (bulletItems.length === 0) {
    const parts = cleaned.split(/[,;]|\band\b/i).map((p) => p.trim().replace(/[.]$/, '')).filter(Boolean)
    if (parts.length >= 2) {
      title = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'New project'
      bulletItems.push(...parts.slice(1, 13).map((p) => p.slice(0, 120)))
    } else {
      const words = cleaned.split(/\s+/)
      title = words.length ? words.slice(0, 6).join(' ') : 'New project'
      bulletItems.push('Define scope', 'Break into steps', 'Start first step')
    }
  }

  if (!title) title = bulletItems[0] ?? 'New project'

  return {
    title: title.slice(0, 120),
    subtasks: bulletItems.slice(0, 12),
    reasoning: 'Generated with offline heuristic parser.',
  }
}

export async function aiSplit(text: string) {
  const system =
    'You are a task breakdown assistant. Return JSON only: {"title": string, "subtasks": string[], "reasoning": string}'
  const content = await callGemini(system, `Break this into a parent task and subtasks:\n"${text}"`)
  if (content) {
    try {
      const data = parseJson(content)
      return {
        title: String(data.title ?? 'New project').slice(0, 120),
        subtasks: (Array.isArray(data.subtasks) ? data.subtasks : []).map((s) => String(s).slice(0, 200)).slice(0, 12),
        reasoning: data.reasoning ? String(data.reasoning) : undefined,
      }
    } catch {
      /* fallback */
    }
  }
  return heuristicSplit(text)
}

function scoreTask(t: TodoSummary, focusTaskId?: number): number {
  let s = 1
  if (t.priority === 'high' || t.priority === 'urgent') s += 3
  else if (t.priority === 'medium') s += 2
  if (t.bossHp != null && t.bossHp > 0 && t.bossHp < 50) s += 1.5
  if (t.subtaskCount > 0) s += 0.5
  if (focusTaskId != null && t.id === focusTaskId) s -= 10
  return s
}

function coachPriorityMessage(pick: TodoSummary): string {
  if (pick.priority === 'high' || pick.priority === 'urgent') {
    return `This is your priority task — complete "${pick.text}" first before anything else.`
  }
  if (pick.bossHp != null && pick.bossHp < 50) {
    return `Boss HP is critical (${pick.bossHp}%) — finish "${pick.text}" now to close this fight.`
  }
  if (pick.parentText) {
    return `Focus here first — "${pick.text}" unblocks progress on ${pick.parentText}.`
  }
  return `This is your best next focus — complete "${pick.text}" first for maximum momentum.`
}

function coachCompletionPlan(pick: TodoSummary): string[] {
  const steps = [
    'Block 25 distraction-free minutes — phone away, one tab only.',
    `Clarify the done state: what does "finished" look like for "${pick.text}"?`,
  ]
  if (pick.subtaskCount > 0) {
    const pct = pick.progress ?? 0
    steps.push(
      `Attack subtasks in order — you are ${pct}% done; finish the smallest open step next.`
    )
  } else {
    steps.push('Break the task into 3 micro-steps and start with step 1 immediately.')
  }
  if (pick.bossHp != null && pick.bossHp > 0) {
    steps.push(
      `Stay on this until boss HP hits 0% (currently ${pick.bossHp}%) — no task switching.`
    )
  }
  steps.push('Check off the task, take a 2-minute reset, then pick the next priority.')
  return steps.slice(0, 6)
}

function coachFromPick(pick: TodoSummary) {
  const reasonParts = [`"${pick.text}" is your top priority right now`]
  if (pick.priority === 'high' || pick.priority === 'urgent') {
    reasonParts.push('it is marked high priority')
  }
  if (pick.bossHp != null && pick.bossHp < 100) {
    reasonParts.push(`completing it drops boss HP from ${pick.bossHp}%`)
  }
  if (pick.parentText) reasonParts.push(`it advances ${pick.parentText}`)

  return {
    taskId: pick.id,
    taskText: pick.text,
    priorityMessage: coachPriorityMessage(pick),
    recommendation: `${reasonParts.join(' — ')}.`,
    completionPlan: coachCompletionPlan(pick),
    estimatedMinutes: 25,
    prioritySuggestion:
      pick.priority === 'high' || pick.priority === 'urgent'
        ? 'high'
        : (pick.priority ?? 'none'),
  }
}

export async function aiCoach(todos: TodoSummary[], focusTaskId?: number) {
  const incomplete = todos.filter((t) => !t.done)
  if (incomplete.length === 0) throw new Error('No incomplete tasks')

  const system =
    'You are an expert focus coach. Pick ONE task to complete FIRST. Return JSON only: ' +
    '{"taskId": number, "taskText": string, "priorityMessage": string, "recommendation": string, ' +
    '"completionPlan": string[] (4-6 steps for 100% efficient completion), ' +
    '"estimatedMinutes": number|null, "prioritySuggestion": "high"|"medium"|"low"|"none"|null}'
  let userMsg = `Incomplete tasks: ${JSON.stringify(incomplete.slice(0, 30))}`
  if (focusTaskId) userMsg += `\nAvoid recommending taskId ${focusTaskId} if possible.`

  const content = await callGemini(system, userMsg)
  if (content) {
    try {
      const data = parseJson(content)
      const taskId = Number(data.taskId)
      const match = incomplete.find((t) => t.id === taskId)
      if (match) {
        const planRaw = data.completionPlan ?? data.plan
        const plan = Array.isArray(planRaw)
          ? planRaw.map((s) => String(s).slice(0, 300)).slice(0, 6)
          : coachCompletionPlan(match)
        return {
          taskId: match.id,
          taskText: match.text,
          priorityMessage: String(
            data.priorityMessage ?? data.priorityReason ?? coachPriorityMessage(match)
          ).slice(0, 400),
          recommendation: String(data.recommendation ?? 'Focus on this task next.').slice(0, 500),
          completionPlan: plan.length ? plan : coachCompletionPlan(match),
          estimatedMinutes:
            typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : undefined,
          prioritySuggestion: data.prioritySuggestion as string | undefined,
        }
      }
    } catch {
      /* fallback */
    }
  }

  const pick = incomplete.reduce((best, t) =>
    scoreTask(t, focusTaskId) > scoreTask(best, focusTaskId) ? t : best
  )
  return coachFromPick(pick)
}

export async function aiBossLore(taskText: string, subtaskCount: number, progress: number) {
  const system =
    'Generate playful RPG boss flavor. Return JSON: {"bossName": string, "taunt": string, "defeatMessage": string}. Keep it friendly.'
  const content = await callGemini(system, `Task: "${taskText}", subtasks: ${subtaskCount}, progress: ${progress}%`)
  if (content) {
    try {
      const data = parseJson(content)
      return {
        bossName: String(data.bossName).slice(0, 80),
        taunt: String(data.taunt).slice(0, 200),
        defeatMessage: String(data.defeatMessage).slice(0, 200),
      }
    } catch {
      /* fallback */
    }
  }

  const base = taskText.split(/\s+/)[0]?.replace(/[^\w]/g, '') || 'Task'
  const name = base.charAt(0).toUpperCase() + base.slice(1)
  return {
    bossName: `The ${name} Behemoth`,
    taunt: `${subtaskCount} subtasks stand between you and victory!`,
    defeatMessage: `The ${name} Behemoth falls. ${taskText} — conquered!`,
  }
}

export async function aiBriefing(todos: TodoSummary[], userName: string) {
  const incomplete = todos.filter((t) => !t.done)
  const bosses = incomplete.filter((t) => t.subtaskCount > 0)
  const overallDone = todos.filter((t) => t.done).length
  const total = todos.length || 1
  const overallPct = Math.round((overallDone / total) * 100)

  const system =
    'Write a brief daily todo briefing. Return JSON: {"greeting": string, "summary": string, "topPriorities": string[], "encouragement": string}'
  const payload = JSON.stringify({
    userName,
    incompleteCount: incomplete.length,
    bossCount: bosses.length,
    overallPercent: overallPct,
    tasks: incomplete.slice(0, 15),
  })

  const content = await callGemini(system, payload)
  if (content) {
    try {
      const data = parseJson(content)
      return {
        greeting: String(data.greeting ?? `Hello, ${userName}.`),
        summary: String(data.summary ?? ''),
        topPriorities: (Array.isArray(data.topPriorities) ? data.topPriorities : []).map(String).slice(0, 3),
        encouragement: String(data.encouragement ?? "You've got this."),
      }
    } catch {
      /* fallback */
    }
  }

  const top = [...incomplete]
    .sort((a, b) => {
      const ap = a.priority === 'high' || a.priority === 'urgent' ? 0 : 1
      const bp = b.priority === 'high' || b.priority === 'urgent' ? 0 : 1
      if (ap !== bp) return ap - bp
      return (b.subtaskCount ?? 0) - (a.subtaskCount ?? 0)
    })
    .slice(0, 3)
  const priorities = top.map((t) => t.text)
  const focus = priorities[0] ?? 'your next small win'

  return {
    greeting: `Hello, ${userName}.`,
    summary: `You have ${incomplete.length} active task${incomplete.length !== 1 ? 's' : ''}${bosses.length ? ` and ${bosses.length} bosses` : ''}. Overall progress is ${overallPct}%. Focus on ${focus} first.`,
    topPriorities: priorities,
    encouragement: 'One completed task shifts the whole mood — pick one and start.',
  }
}

export async function aiParseTask(input: string) {
  const stripped = input.trim()
  const patterns = [
    /^(?:create|add|make)\s+(.+?)\s+with\s+(.+)$/i,
    /^(.+?)\s+with\s+(.+?)\s+subtasks?$/i,
    /^(.+?):\s*(.+)$/,
  ]

  for (const pat of patterns) {
    const m = stripped.match(pat)
    if (m) {
      const parent = m[1].trim().replace(/[.]$/, '')
      const subs = m[2]
        .split(/[,;]|\band\b/i)
        .map((s) => s.trim().replace(/[.]$/, ''))
        .filter(Boolean)
      if (parent && subs.length) {
        return { parent: parent.slice(0, 120), subtasks: subs.slice(0, 12).map((s) => s.slice(0, 200)) }
      }
    }
  }

  if (stripped.toLowerCase().startsWith('/ai ')) {
    return aiParseTask(stripped.slice(4).trim())
  }

  const system =
    'Parse natural language into parent + subtasks. Return JSON: {"parent": string, "subtasks": string[]}. Empty subtasks if single task.'
  const content = await callGemini(system, stripped)
  if (content) {
    try {
      const data = parseJson(content)
      return {
        parent: String(data.parent ?? stripped).slice(0, 120),
        subtasks: (Array.isArray(data.subtasks) ? data.subtasks : []).map((s) => String(s).slice(0, 200)).slice(0, 12),
      }
    } catch {
      /* fallback */
    }
  }

  const split = heuristicSplit(stripped)
  if (split.subtasks.length >= 2) {
    return { parent: split.title, subtasks: split.subtasks }
  }
  return { parent: stripped.slice(0, 120), subtasks: [] }
}

const DAILY_LIMIT = 50
const rateMap = new Map<number, { date: string; count: number }>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getRemaining(userId: number): number {
  const entry = rateMap.get(userId)
  if (!entry || entry.date !== todayKey()) return DAILY_LIMIT
  return Math.max(0, DAILY_LIMIT - entry.count)
}

export function checkRateLimit(userId: number): void {
  if (getRemaining(userId) <= 0) {
    throw new Error('Daily AI limit reached.')
  }
}

export function incrementRateLimit(userId: number): void {
  const date = todayKey()
  const entry = rateMap.get(userId)
  if (!entry || entry.date !== date) {
    rateMap.set(userId, { date, count: 1 })
  } else {
    entry.count += 1
  }
}

export function aiStatus(userId: number) {
  return {
    configured: isAiConfigured(),
    provider: isAiConfigured() ? 'gemini' : 'heuristic',
    model: isAiConfigured() ? AI_MODEL : 'offline',
    remainingToday: getRemaining(userId),
    dailyLimit: DAILY_LIMIT,
  }
}
