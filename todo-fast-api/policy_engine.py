from enum import Enum
from typing import Any, Optional, Dict
from modal.user import User


class Action(str, Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class ResourceType(str, Enum):
    TODO = "TODO"
    USER = "USER"


def can(
    user: User,
    action: Action,
    res_type: ResourceType,
    resource: Any = None,
    context: Optional[Dict] = None,
) -> bool:
    """
    Policy-Based Access Control (PBAC) Engine.
    Determines if a user can perform an action on a resource based on attributes and context.
    """
    # 1. Global Admin Rule (GCP Style)
    # Admins have full access to everything in this system
    if user.role == "ADMIN":
        return True

    # 2. Resource Specific Rules
    if res_type == ResourceType.TODO:
        # Anyone can create a Todo
        if action == Action.CREATE:
            return True

        # For READ, UPDATE, DELETE, we need to check ownership
        if resource:
            # Only the owner can manage their own Todo items
            return resource.user_id == user.id

    if res_type == ResourceType.USER:
        # Users can READ their own profile
        if action == Action.READ:
            if resource:
                return resource.id == user.id
            return True  # Viewing general user list might be restricted in reality

    # 3. Environment/Context Based Rules (AWS/Conditions Style)
    if context:
        # Example: Business Hours check (Can be expanded)
        # current_hour = context.get("hour")
        # if action == Action.DELETE and (current_hour < 9 or current_hour > 18):
        #     return False
        pass

    # Default Deny (Security Best Practice)
    return False
