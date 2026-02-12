import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.tags import UserTag, UserTagAssignment
from app.schemas.tags import AssignTagRequest, UserTagCreate, UserTagResponse, UserTagUpdate

router = APIRouter()


@router.get("/", response_model=list[UserTagResponse])
async def list_tags(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            UserTag,
            func.count(UserTagAssignment.user_id).label("user_count"),
        )
        .outerjoin(UserTagAssignment, UserTag.id == UserTagAssignment.tag_id)
        .group_by(UserTag.id)
        .order_by(UserTag.name)
    )
    result = await db.execute(query)
    return [
        UserTagResponse(
            id=row[0].id,
            name=row[0].name,
            color=row[0].color,
            description=row[0].description,
            user_count=row[1],
            created_at=row[0].created_at,
        )
        for row in result.all()
    ]


@router.post("/", response_model=UserTagResponse, status_code=201)
async def create_tag(body: UserTagCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(UserTag).where(UserTag.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tag name already exists")

    tag = UserTag(name=body.name, color=body.color, description=body.description)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return UserTagResponse(
        id=tag.id, name=tag.name, color=tag.color,
        description=tag.description, user_count=0, created_at=tag.created_at,
    )


@router.patch("/{tag_id}", response_model=UserTagResponse)
async def update_tag(tag_id: uuid.UUID, body: UserTagUpdate, db: AsyncSession = Depends(get_db)):
    tag = await db.get(UserTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if body.name is not None:
        tag.name = body.name
    if body.color is not None:
        tag.color = body.color
    if body.description is not None:
        tag.description = body.description

    await db.commit()
    await db.refresh(tag)

    count_result = await db.execute(
        select(func.count(UserTagAssignment.user_id)).where(UserTagAssignment.tag_id == tag_id)
    )
    user_count = count_result.scalar() or 0

    return UserTagResponse(
        id=tag.id, name=tag.name, color=tag.color,
        description=tag.description, user_count=user_count, created_at=tag.created_at,
    )


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    tag = await db.get(UserTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
    await db.commit()


@router.post("/{tag_id}/assign", status_code=204)
async def assign_tag(tag_id: uuid.UUID, body: AssignTagRequest, db: AsyncSession = Depends(get_db)):
    tag = await db.get(UserTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    for user_id in body.user_ids:
        existing = await db.execute(
            select(UserTagAssignment).where(
                UserTagAssignment.user_id == user_id,
                UserTagAssignment.tag_id == tag_id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(UserTagAssignment(user_id=user_id, tag_id=tag_id))

    await db.commit()


@router.post("/{tag_id}/unassign", status_code=204)
async def unassign_tag(tag_id: uuid.UUID, body: AssignTagRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(UserTagAssignment).where(
            UserTagAssignment.tag_id == tag_id,
            UserTagAssignment.user_id.in_(body.user_ids),
        )
    )
    await db.commit()
