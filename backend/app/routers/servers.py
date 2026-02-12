import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.media_servers.factory import create_client, invalidate_client
from app.models.server import Server
from app.schemas.server import ServerCreate, ServerResponse, ServerTestResult, ServerUpdate

router = APIRouter()


@router.get("/", response_model=list[ServerResponse])
async def list_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).order_by(Server.name))
    return result.scalars().all()


@router.post("/", response_model=ServerResponse, status_code=201)
async def add_server(body: ServerCreate, db: AsyncSession = Depends(get_db)):
    # Test connectivity first
    client = create_client(body.server_type, body.base_url, body.api_key, "test")
    try:
        info = await client.test_connection()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot connect to server: {e}")
    finally:
        await client.close()

    server = Server(
        name=body.name,
        server_type=body.server_type,
        base_url=body.base_url.rstrip("/"),
        api_key=body.api_key,
        poll_interval_sec=body.poll_interval_sec,
        server_id=info.server_id,
        server_version=info.version,
    )
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return server


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.put("/{server_id}", response_model=ServerResponse)
async def update_server(server_id: uuid.UUID, body: ServerUpdate, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "base_url" and value:
            value = value.rstrip("/")
        setattr(server, field, value)

    invalidate_client(str(server_id))
    await db.flush()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=204)
async def delete_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    invalidate_client(str(server_id))
    await db.delete(server)


@router.post("/{server_id}/test", response_model=ServerTestResult)
async def test_server(server_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    client = create_client(server.server_type, server.base_url, server.api_key, str(server.id))
    try:
        info = await client.test_connection()
        return ServerTestResult(
            success=True,
            server_name=info.server_name,
            server_id=info.server_id,
            version=info.version,
        )
    except Exception as e:
        return ServerTestResult(success=False, error=str(e))
    finally:
        await client.close()
