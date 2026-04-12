from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.dependencies import get_current_user, get_db, require_owner
from app.models.user import User
from app.schemas.user import (
    PasswordChangeRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter()

_SEED_OWNER_ID = 1  # admin@khonho.com — must never be deactivated


# ---------------------------------------------------------------------------
# Static paths before /{id}
# ---------------------------------------------------------------------------

@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_own_password(
    body: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng",
        )
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}


# ---------------------------------------------------------------------------
# Owner-only CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    return db.query(User).order_by(User.created_at).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng",
        )
    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Owner cannot demote themselves
    if body.role == "staff" and user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể đổi role của chính mình thành staff",
        )

    data = body.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


@router.put("/{user_id}/toggle", response_model=UserResponse)
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Owner cannot deactivate themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tắt tài khoản của chính mình",
        )

    # Guard: ensure at least one active owner remains
    if target.role == "owner" and target.is_active:
        active_owners = db.query(User).filter(
            User.role == "owner",
            User.is_active == True,  # noqa: E712
        ).count()
        if active_owners <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phải có ít nhất 1 owner active",
            )

    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return target
