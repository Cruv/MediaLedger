from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    LoginRequest,
    TokenResponse,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.settings import AppSetting

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return a JWT."""
    # Get stored admin credentials
    result = await db.execute(
        select(AppSetting).where(AppSetting.key == "admin_password_hash")
    )
    pw_setting = result.scalar_one_or_none()

    if not pw_setting or not pw_setting.value:
        # No password configured — first login sets the password
        raise HTTPException(status_code=400, detail="No admin password configured. Use /api/auth/setup.")

    username_result = await db.execute(
        select(AppSetting).where(AppSetting.key == "admin_username")
    )
    username_setting = username_result.scalar_one_or_none()
    admin_username = username_setting.value if username_setting else "admin"

    if body.username != admin_username:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, pw_setting.value):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=body.username)
    return TokenResponse(access_token=token)


@router.post("/setup", response_model=TokenResponse)
async def setup(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Initial setup: create admin credentials (only works if no password is set)."""
    result = await db.execute(
        select(AppSetting).where(AppSetting.key == "admin_password_hash")
    )
    existing = result.scalar_one_or_none()

    if existing and existing.value:
        raise HTTPException(status_code=400, detail="Admin already configured. Use /api/auth/login.")

    # Store username
    username_result = await db.execute(
        select(AppSetting).where(AppSetting.key == "admin_username")
    )
    username_setting = username_result.scalar_one_or_none()
    if username_setting:
        username_setting.value = body.username
    else:
        db.add(AppSetting(key="admin_username", value=body.username, value_type="string"))

    # Store password hash
    pw_hash = hash_password(body.password)
    if existing:
        existing.value = pw_hash
    else:
        db.add(AppSetting(key="admin_password_hash", value=pw_hash, value_type="string"))

    await db.commit()

    token = create_access_token(subject=body.username)
    return TokenResponse(access_token=token)


@router.get("/me")
async def get_me(user: str = Depends(get_current_user)):
    """Return the current user info (validates the token)."""
    return {"username": user}
