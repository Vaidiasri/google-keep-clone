from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from schema.user import UserMinimal


# TodoBase: Ye common fields hain jo har jagah use honge
class TodoBase(BaseModel):
    text: str
    done: bool = False
    parent_id: Optional[int] = Field(
        None, alias="parentId"
    )  # Nested todo ke liye (frontend sends 'parentId')


# TodoCreate: Naya todo banate waqt use hota hai
class TodoCreate(TodoBase):
    pass


# TodoUpdate: Update karte waqt fields optional honi chahiye (partial update)
class TodoUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    # parent_id usually update nahi karte, but agar karna ho to optional rakho


# TodoRead: Jab API se data wapas ata hai to is format mein ayega
class TodoRead(TodoBase):
    id: int
    text: str
    done: bool
    # Field aliases use kar rahe hain taaki frontend ko camelCase mile
    parent_id: Optional[int] = Field(None, alias="parentId")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    children: List["TodoRead"] = Field(
        [], alias="subTodos"
    )  # Frontend 'subTodos' expect kar raha hai

    # Ownership info
    user_id: Optional[int] = Field(None, alias="userId")
    owner: Optional[UserMinimal] = None

    class Config:
        from_attributes = True  # V2 Config: ORM se data padhne ke liye
        populate_by_name = (
            True  # Alias aur actual name dono se populate karne ki permission
        )


# Recursive reference update karna zaroori hai taaki children field kaam kare
TodoRead.update_forward_refs()
