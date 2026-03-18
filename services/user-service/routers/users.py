# services/user-service/routers/users.py
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.redis import redis_client
from core.security import hash_password, verify_password
from models.user import User
from schemas.user import TokenResponse, UserAuthPayload, UserLoginRequest, UserRegisterRequest, UserResponse

router = APIRouter(tags=["users"])


def get_token_ttl_seconds(user: User) -> int:
    if user.is_admin:
        return settings.jwt_expire_minutes_admin * 60
    return settings.jwt_expire_minutes_user * 60


def create_access_token(user: User, ttl_seconds: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "username": user.username,
        "is_admin": user.is_admin,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(authorization: str | None = Header(default=None)) -> UserAuthPayload:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")

    token = authorization.split(" ", maxsplit=1)[1]

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    redis_token = await redis_client.get(f"jwt:{user_id}")
    if redis_token != token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token not active")

    return UserAuthPayload(
        user_id=UUID(user_id),
        email=payload.get("email", ""),
        username=payload.get("username", ""),
        is_admin=payload.get("is_admin", False),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)) -> UserResponse:
    user = User(
        email=payload.email,
        username=payload.username,
        password=hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists") from exc

    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    query = select(User).where(User.email == payload.email)
    user = (await db.execute(query)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    ttl_seconds = get_token_ttl_seconds(user)
    access_token = create_access_token(user, ttl_seconds)
    await redis_client.setex(f"jwt:{user.id}", ttl_seconds, access_token)
    return TokenResponse(access_token=access_token, expires_in=ttl_seconds)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(current_user: UserAuthPayload = Depends(get_current_user)) -> None:
    await redis_client.delete(f"jwt:{current_user.user_id}")


@router.get("/me", response_model=UserAuthPayload)
async def read_me(current_user: UserAuthPayload = Depends(get_current_user)) -> UserAuthPayload:
    return current_user


@router.get("/admin/list", response_model=list[UserResponse])
async def list_users_for_admin(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=100, ge=1, le=100),
    current_user: UserAuthPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    offset = (page - 1) * size
    query = (
        select(User)
        .where(User.is_admin.is_(False))
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    users = (await db.execute(query)).scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def read_user(user_id: UUID, db: AsyncSession = Depends(get_db)) -> UserResponse:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)
