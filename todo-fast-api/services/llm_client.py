import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

import schema.ai as ai_schemas

AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "gemini": "gemini-2.0-flash",
}
AI_MODEL = os.getenv("AI_MODEL", _DEFAULT_MODELS.get(AI_PROVIDER, "gpt-4o-mini"))

GEMINI_FALLBACK_MODELS = [
    AI_MODEL,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def _model_dump(obj: Any) -> Dict[str, Any]:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj.dict()


def is_ai_configured() -> bool:
    if AI_PROVIDER == "gemini":
        return bool(GEMINI_API_KEY)
    return bool(OPENAI_API_KEY)


def _call_openai(system: str, user: str) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.4,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    except Exception as exc:
        print(f"OpenAI call failed: {exc}")
        return None


def _call_gemini(system: str, user: str) -> Optional[str]:
    if not GEMINI_API_KEY:
        return None

    models_to_try = GEMINI_FALLBACK_MODELS if AI_PROVIDER == "gemini" else [AI_MODEL]
    seen: set[str] = set()
    for model in models_to_try:
        if model in seen:
            continue
        seen.add(model)
        result = _call_gemini_model(model, system, user)
        if result is not None:
            return result
    return None


def _call_gemini_model(model: str, system: str, user: str) -> Optional[str]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 800,
            "responseMimeType": "application/json",
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates") or []
            if not candidates:
                print("Gemini call failed: no candidates in response")
                return None
            parts = candidates[0].get("content", {}).get("parts") or []
            if not parts:
                print("Gemini call failed: no parts in response")
                return None
            return parts[0].get("text")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"Gemini HTTP error {exc.code} ({model}): {body}")
        return None
    except Exception as exc:
        print(f"Gemini call failed ({model}): {exc}")
        return None


def _call_llm(system: str, user: str) -> Optional[str]:
    if AI_PROVIDER == "gemini":
        return _call_gemini(system, user)
    return _call_openai(system, user)


def _parse_json(content: str) -> Dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            return json.loads(match.group())
        raise


def _heuristic_split(text: str) -> ai_schemas.AISplitResponse:
    cleaned = text.strip()
    lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip()]
    bullet_items: List[str] = []
    title: Optional[str] = None
    bullet_re = re.compile(r"^(\s*[-*•]\s+|\s*\d+\.\s+)")

    for raw in lines:
        if bullet_re.match(raw):
            item = bullet_re.sub("", raw).strip()
            if item:
                bullet_items.append(item)
        elif not title and not bullet_items:
            title = raw

    if not bullet_items:
        parts = re.split(r"[,;]|(?:\band\b)", cleaned, flags=re.IGNORECASE)
        parts = [p.strip(" .") for p in parts if p.strip()]
        if len(parts) >= 2:
            title = parts[0].title() if parts[0] else "New project"
            bullet_items = [p[:120].capitalize() for p in parts[1:12]]
        else:
            words = cleaned.split()
            title = " ".join(words[:6]).title() if words else "New project"
            bullet_items = [
                "Define scope",
                "Break into steps",
                "Start first step",
            ]

    if not title:
        title = bullet_items[0] if bullet_items else "New project"

    return ai_schemas.AISplitResponse(
        title=title[:120],
        subtasks=bullet_items[:12],
        reasoning="Generated with offline heuristic parser (no LLM key configured).",
    )


def ai_split(text: str) -> ai_schemas.AISplitResponse:
    system = (
        "You are a task breakdown assistant. Return JSON only: "
        '{"title": string, "subtasks": string[] (max 12, short, actionable), "reasoning": string}'
    )
    content = _call_llm(system, f'Break this into a parent task and subtasks:\n"{text}"')
    if content:
        try:
            data = _parse_json(content)
            return ai_schemas.AISplitResponse(
                title=str(data.get("title", "New project"))[:120],
                subtasks=[str(s)[:200] for s in data.get("subtasks", [])[:12]],
                reasoning=data.get("reasoning"),
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass
    return _heuristic_split(text)


def _coach_score(t: ai_schemas.TodoSummary, focus_task_id: Optional[int] = None) -> float:
    s = 1.0
    if t.priority in ("high", "urgent"):
        s += 3
    elif t.priority == "medium":
        s += 2
    if t.bossHp is not None and 0 < t.bossHp < 50:
        s += 1.5
    if t.subtaskCount > 0:
        s += 0.5
    if focus_task_id and t.id == focus_task_id:
        s -= 10
    return s


def _coach_priority_message(pick: ai_schemas.TodoSummary) -> str:
    if pick.priority in ("high", "urgent"):
        return (
            f'This is your priority task — complete "{pick.text}" first before anything else.'
        )
    if pick.bossHp is not None and pick.bossHp < 50:
        return (
            f'Boss HP is critical ({pick.bossHp}%) — finish "{pick.text}" now to close this fight.'
        )
    if pick.parentText:
        return (
            f'Focus here first — "{pick.text}" unblocks progress on {pick.parentText}.'
        )
    return (
        f'This is your best next focus — complete "{pick.text}" first for maximum momentum.'
    )


def _coach_completion_plan(pick: ai_schemas.TodoSummary) -> List[str]:
    minutes = 25
    steps = [
        f"Block {minutes} distraction-free minutes — phone away, one tab only.",
        f'Clarify the done state: what does "finished" look like for "{pick.text}"?',
    ]
    if pick.subtaskCount > 0:
        pct = pick.progress if pick.progress is not None else 0
        steps.append(
            f"Attack subtasks in order — you are {pct}% done; finish the smallest open step next."
        )
    else:
        steps.append("Break the task into 3 micro-steps and start with step 1 immediately.")
    if pick.bossHp is not None and pick.bossHp > 0:
        steps.append(
            f"Stay on this until boss HP hits 0% (currently {pick.bossHp}%) — no task switching."
        )
    steps.append("Check off the task, take a 2-minute reset, then pick the next priority.")
    return steps[:6]


def _coach_from_pick(pick: ai_schemas.TodoSummary) -> ai_schemas.AICoachResponse:
    reason_parts = [f'"{pick.text}" is your top priority right now']
    if pick.priority in ("high", "urgent"):
        reason_parts.append("it is marked high priority")
    if pick.bossHp is not None and pick.bossHp < 100:
        reason_parts.append(f"completing it drops boss HP from {pick.bossHp}%")
    if pick.parentText:
        reason_parts.append(f"it advances {pick.parentText}")

    return ai_schemas.AICoachResponse(
        taskId=pick.id,
        taskText=pick.text,
        priorityMessage=_coach_priority_message(pick),
        recommendation=" — ".join(reason_parts) + ".",
        completionPlan=_coach_completion_plan(pick),
        estimatedMinutes=25,
        prioritySuggestion=(
            "high"
            if pick.priority in ("high", "urgent")
            else pick.priority or "none"
        ),
    )


def _parse_coach_response(
    data: Dict[str, Any], incomplete: List[ai_schemas.TodoSummary]
) -> Optional[ai_schemas.AICoachResponse]:
    task_id = int(data["taskId"])
    match = next((t for t in incomplete if t.id == task_id), None)
    if not match:
        return None

    plan_raw = data.get("completionPlan") or data.get("plan") or []
    plan = [str(s)[:300] for s in plan_raw[:6]] if isinstance(plan_raw, list) else []
    if not plan:
        plan = _coach_completion_plan(match)

    priority_msg = str(
        data.get("priorityMessage")
        or data.get("priorityReason")
        or _coach_priority_message(match)
    )[:400]

    return ai_schemas.AICoachResponse(
        taskId=match.id,
        taskText=match.text,
        priorityMessage=priority_msg,
        recommendation=str(
            data.get("recommendation", "Focus on this task next.")
        )[:500],
        completionPlan=plan,
        estimatedMinutes=data.get("estimatedMinutes"),
        prioritySuggestion=data.get("prioritySuggestion"),
    )


def ai_coach(
    todos: List[ai_schemas.TodoSummary], focus_task_id: Optional[int] = None
) -> ai_schemas.AICoachResponse:
    incomplete = [t for t in todos if not t.done]
    if not incomplete:
        raise ValueError("No incomplete tasks")

    system = (
        "You are an expert focus coach for a todo app. Pick ONE incomplete task the user "
        "should complete FIRST. Be direct and actionable.\n"
        "Return JSON only:\n"
        '{"taskId": number, "taskText": string, '
        '"priorityMessage": string (tell user this is their priority — complete it first), '
        '"recommendation": string (1-2 sentences why this task wins), '
        '"completionPlan": string[] (4-6 concrete steps to finish with 100% efficiency — '
        "include time-boxing, order of work, and when to mark done), "
        '"estimatedMinutes": number|null, '
        '"prioritySuggestion": "high"|"medium"|"low"|"none"|null}'
    )
    summary = json.dumps([_model_dump(t) for t in incomplete[:30]])
    user_msg = f"Incomplete tasks: {summary}"
    if focus_task_id:
        user_msg += f"\nAvoid recommending taskId {focus_task_id} if possible."

    content = _call_llm(system, user_msg)
    if content:
        try:
            data = _parse_json(content)
            parsed = _parse_coach_response(data, incomplete)
            if parsed:
                return parsed
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass

    pick = max(incomplete, key=lambda t: _coach_score(t, focus_task_id))
    return _coach_from_pick(pick)


def ai_boss_lore(
    task_text: str, subtask_count: int, progress: int
) -> ai_schemas.AIBossLoreResponse:
    system = (
        "Generate playful RPG boss flavor for a todo parent task. "
        'Return JSON: {"bossName": string, "taunt": string, "defeatMessage": string}. '
        "Keep it friendly, not offensive."
    )
    user_msg = f'Task: "{task_text}", subtasks: {subtask_count}, progress: {progress}%'
    content = _call_llm(system, user_msg)
    if content:
        try:
            data = _parse_json(content)
            return ai_schemas.AIBossLoreResponse(
                bossName=str(data["bossName"])[:80],
                taunt=str(data["taunt"])[:200],
                defeatMessage=str(data["defeatMessage"])[:200],
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    base = task_text.split()[0].title() if task_text.split() else "Task"
    return ai_schemas.AIBossLoreResponse(
        bossName=f"The {base} Behemoth",
        taunt=f"{subtask_count} subtasks stand between you and victory!",
        defeatMessage=f"The {base} Behemoth falls. {task_text} — conquered!",
    )


def ai_briefing(
    todos: List[ai_schemas.TodoSummary], user_name: str
) -> ai_schemas.AIBriefingResponse:
    incomplete = [t for t in todos if not t.done]
    bosses = [t for t in incomplete if t.subtaskCount > 0]
    overall_done = sum(1 for t in todos if t.done)
    total = len(todos) or 1
    overall_pct = round((overall_done / total) * 100)

    system = (
        "Write a brief daily todo briefing. Max 3 sentences in summary. "
        'Return JSON: {"greeting": string, "summary": string, "topPriorities": string[], "encouragement": string}'
    )
    payload = json.dumps(
        {
            "userName": user_name,
            "incompleteCount": len(incomplete),
            "bossCount": len(bosses),
            "overallPercent": overall_pct,
            "tasks": [_model_dump(t) for t in incomplete[:15]],
        }
    )
    content = _call_llm(system, payload)
    if content:
        try:
            data = _parse_json(content)
            priorities = [str(p) for p in data.get("topPriorities", [])[:3]]
            return ai_schemas.AIBriefingResponse(
                greeting=str(data.get("greeting", f"Hello, {user_name}.")),
                summary=str(data.get("summary", "")),
                topPriorities=priorities,
                encouragement=str(data.get("encouragement", "You've got this.")),
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    top = sorted(
        incomplete,
        key=lambda t: (
            0 if t.priority in ("high", "urgent") else 1,
            -(t.subtaskCount or 0),
        ),
    )[:3]
    priorities = [t.text for t in top]
    focus = priorities[0] if priorities else "your next small win"

    return ai_schemas.AIBriefingResponse(
        greeting=f"Hello, {user_name}.",
        summary=(
            f"You have {len(incomplete)} active task{'s' if len(incomplete) != 1 else ''}"
            f"{' and ' + str(len(bosses)) + ' bosses' if bosses else ''}. "
            f"Overall progress is {overall_pct}%. Focus on **{focus}** first."
        ),
        topPriorities=priorities,
        encouragement="One completed task shifts the whole mood — pick one and start.",
    )


def ai_parse_task(text: str) -> ai_schemas.AIParseTaskResponse:
    stripped = text.strip()
    lower = stripped.lower()

    nl_patterns = [
        r"^(?:create|add|make)\s+(.+?)\s+with\s+(.+)$",
        r"^(.+?)\s+with\s+(.+?)\s+subtasks?$",
        r"^(.+?):\s*(.+)$",
    ]
    for pat in nl_patterns:
        m = re.match(pat, stripped, re.IGNORECASE)
        if m:
            parent = m.group(1).strip(" .")
            subs_raw = m.group(2)
            subs = [
                s.strip(" .")
                for s in re.split(r"[,;]|(?:\band\b)", subs_raw, flags=re.IGNORECASE)
                if s.strip()
            ]
            if parent and subs:
                return ai_schemas.AIParseTaskResponse(
                    parent=parent[:120],
                    subtasks=[s[:200] for s in subs[:12]],
                )

    if lower.startswith("/ai "):
        return ai_parse_task(stripped[4:].strip())

    system = (
        "Parse natural language into a parent task and subtasks. "
        'Return JSON: {"parent": string, "subtasks": string[]}. '
        "If input is a single simple task with no subtasks, return subtasks as empty array."
    )
    content = _call_llm(system, stripped)
    if content:
        try:
            data = _parse_json(content)
            return ai_schemas.AIParseTaskResponse(
                parent=str(data.get("parent", stripped))[:120],
                subtasks=[str(s)[:200] for s in data.get("subtasks", [])[:12]],
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    split = _heuristic_split(stripped)
    if len(split.subtasks) >= 2:
        return ai_schemas.AIParseTaskResponse(
            parent=split.title, subtasks=split.subtasks
        )
    return ai_schemas.AIParseTaskResponse(parent=stripped[:120], subtasks=[])
