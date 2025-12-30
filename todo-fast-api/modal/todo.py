from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base


class Todo(Base):
    __tablename__ = "Todo"  # Table ka naam (Prisma ke saath match kiya hai)

    # Columns define kar rahe hain
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)  # Todo ka text
    done = Column(Boolean, default=False)  # Status: Complete hai ya nahi

    # Ye columns automatically timestamp handle karte hain
    created_at = Column("createdAt", DateTime(timezone=True), server_default=func.now())
    # default=func.now() add kiya taaki creation time par bhi ye set ho (Not Null constraint fix)
    updated_at = Column(
        "updatedAt", DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Self-referential relationship implementation (Nested Todos ke liye)
    # 'parentId' column batata hai ki ye kiska child hai
    parent_id = Column("parentId", Integer, ForeignKey("Todo.id"), nullable=True)

    # 'children' relationship se hum iske saare bache access kar sakte hain
    children = relationship(
        "Todo",
        backref=backref("parent", remote_side=[id]),
        cascade="all, delete-orphan",
    )  # Parent delete hua to bache bhi delete

    # User relationship: Batata hai ye Todo kis user ka hai
    user_id = Column("userId", Integer, ForeignKey("User.id"), nullable=True)
    owner = relationship("User", back_populates="todos")

    # Concurrency control: Etag/Version marker
    version = Column(Integer, default=1)
