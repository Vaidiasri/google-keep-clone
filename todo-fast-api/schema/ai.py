from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class TodoSummary(BaseModel):
    id: int
    text: str
    done: bool
    priority: Optional[str] = None
    subtaskCount: int = 0
    parentText: Optional[str] = None
    progress: Optional[int] = None
    bossHp: Optional[int] = None


class AISplitRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    parentId: Optional[int] = None


class AISplitResponse(BaseModel):
    title: str
    subtasks: List[str]
    reasoning: Optional[str] = None


class AICoachRequest(BaseModel):
    todos: List[TodoSummary]
    focusTaskId: Optional[int] = None


class AICoachResponse(BaseModel):
    taskId: int
    taskText: str
    priorityMessage: str
    recommendation: str
    completionPlan: List[str] = Field(default_factory=list)
    estimatedMinutes: Optional[int] = None
    prioritySuggestion: Optional[Literal["high", "medium", "low", "none"]] = None


class AIBossLoreRequest(BaseModel):
    taskText: str = Field(..., min_length=1, max_length=500)
    subtaskCount: int = Field(..., ge=0)
    progress: int = Field(..., ge=0, le=100)


class AIBossLoreResponse(BaseModel):
    bossName: str
    taunt: str
    defeatMessage: str


class AIBriefingRequest(BaseModel):
    todos: List[TodoSummary]
    userName: str = "there"


class AIBriefingResponse(BaseModel):
    greeting: str
    summary: str
    topPriorities: List[str]
    encouragement: str


class AIParseTaskRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=2000)


class AIParseTaskResponse(BaseModel):
    parent: str
    subtasks: List[str]
