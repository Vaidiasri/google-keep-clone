from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
import policy_engine as pe
from utils import get_current_user, get_db
from modal.user import User
from modal.todo import Todo
from utils_cache import cache


class PolicyChecker:
    def __init__(self, action: pe.Action, resource_type: pe.ResourceType):
        self.action = action
        self.resource_type = resource_type

    async def __call__(
        self,
        todo_id: Optional[int] = None,
        if_match: Optional[int] = Header(None, alias="If-Match"),
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # 1. Identity Caching (User Context)
        # We cache the user's role and basic info to avoid frequent DB lookups
        cache_key_user = f"user:policy_context:{user.id}"
        cached_user_context = cache.get(cache_key_user)

        if not cached_user_context:
            # Simple context structure
            user_context = {"id": user.id, "role": user.role}
            cache.set(cache_key_user, user_context, ttl_seconds=300)  # 5 min

        resource = None

        # 2. Resource Handling & Caching
        if self.resource_type == pe.ResourceType.TODO and todo_id:
            # Check Resource Cache first
            cache_key_res = f"resource:meta:todo:{todo_id}"
            cached_res = cache.get(cache_key_res)

            if cached_res:
                # We need a proper SQLAlchemy object or a mock for 'can' check
                # For now, we fetch from DB if not in cache, or use cached attributes
                resource = db.query(Todo).filter(Todo.id == todo_id).first()
            else:
                resource = db.query(Todo).filter(Todo.id == todo_id).first()
                if resource:
                    # Cache basic metadata for policy checks
                    res_meta = {
                        "user_id": resource.user_id,
                        "version": resource.version,
                    }
                    cache.set(cache_key_res, res_meta, ttl_seconds=60)

            if not resource:
                raise HTTPException(status_code=404, detail="Todo not found")

            # 3. Etag / Concurrency Validation (If applicable)
            if (
                self.action in [pe.Action.UPDATE, pe.Action.DELETE]
                and if_match is not None
            ):
                if resource.version != if_match:
                    raise HTTPException(
                        status_code=status.HTTP_412_PRECONDITION_FAILED,
                        detail=f"Etag Mismatch: Current version is {resource.version}, but you provided {if_match}.",
                    )

        # 4. Policy Evaluation Engine
        if not pe.can(user, self.action, self.resource_type, resource):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You do not have {self.action} permission on this {self.resource_type}.",
            )

        return resource or user
