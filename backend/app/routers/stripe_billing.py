"""Stripe integration: webhook receiver, subscription sync, user management."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.media_servers.factory import get_client
from app.models.server import Server
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)

router = APIRouter()
# Separate public router for the webhook (no auth)
webhook_router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class LinkStripeRequest(BaseModel):
    user_id: str
    stripe_customer_id: str

class SyncSubscriptionRequest(BaseModel):
    stripe_customer_id: str


# ── Webhook ──────────────────────────────────────────────────

@webhook_router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Receive Stripe webhook events and act on subscription changes.
    Supported events:
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
    """
    payload = await request.body()

    # Verify signature if stripe_webhook_secret is configured
    stripe_webhook_secret = getattr(settings, "stripe_webhook_secret", None)
    event: dict | None = None

    if stripe_webhook_secret:
        try:
            import stripe
            sig_header = request.headers.get("stripe-signature", "")
            event = stripe.Webhook.construct_event(
                payload, sig_header, stripe_webhook_secret
            )
        except Exception as e:
            logger.warning("Stripe webhook signature verification failed: %s", e)
            raise HTTPException(400, f"Webhook signature verification failed: {e}")
    else:
        import json
        event = json.loads(payload)

    event_type = event.get("type", "")
    data_obj = event.get("data", {}).get("object", {})

    logger.info("Stripe webhook received: %s", event_type)

    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
    ):
        await _handle_subscription_update(db, data_obj)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_cancelled(db, data_obj)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data_obj)
    elif event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(db, data_obj)

    return {"received": True}


async def _handle_subscription_update(db: AsyncSession, sub: dict):
    """Update user subscription status when a subscription is created or updated."""
    customer_id = sub.get("customer")
    sub_id = sub.get("id")
    status = sub.get("status")  # active, past_due, canceled, trialing, etc.

    users = await _find_users_by_stripe(db, customer_id)
    for user in users:
        user.stripe_subscription_id = sub_id
        user.subscription_status = status
        if status == "active" and user.is_disabled:
            user.is_disabled = False
            user.auto_disabled_at = None
            # Re-enable on server
            await _set_server_disabled(db, user, False)
            logger.info("Re-enabled user %s due to active subscription", user.username)
    await db.commit()


async def _handle_subscription_cancelled(db: AsyncSession, sub: dict):
    """Disable users when their subscription is cancelled."""
    customer_id = sub.get("customer")
    users = await _find_users_by_stripe(db, customer_id)
    for user in users:
        user.subscription_status = "canceled"
        if not user.is_disabled:
            user.is_disabled = True
            from datetime import datetime, timezone
            user.auto_disabled_at = datetime.now(timezone.utc)
            await _set_server_disabled(db, user, True)
            logger.info("Disabled user %s due to cancelled subscription", user.username)
    await db.commit()


async def _handle_payment_failed(db: AsyncSession, invoice: dict):
    """Mark subscription as past_due on payment failure."""
    customer_id = invoice.get("customer")
    users = await _find_users_by_stripe(db, customer_id)
    for user in users:
        user.subscription_status = "past_due"
    await db.commit()

    # Send notification
    if users:
        from app.notifications.dispatcher import NotificationDispatcher
        dispatcher = NotificationDispatcher()
        await dispatcher.dispatch(
            db,
            trigger="payment_failed",
            subject=f"Payment failed for {users[0].username}",
            body=f"Stripe payment failed for customer {customer_id}. User access may be affected.",
        )


async def _handle_payment_succeeded(db: AsyncSession, invoice: dict):
    """Ensure user is active after successful payment."""
    customer_id = invoice.get("customer")
    users = await _find_users_by_stripe(db, customer_id)
    for user in users:
        if user.subscription_status == "past_due":
            user.subscription_status = "active"
        if user.is_disabled and user.subscription_status == "active":
            user.is_disabled = False
            user.auto_disabled_at = None
            await _set_server_disabled(db, user, False)
    await db.commit()


# ── Admin APIs ───────────────────────────────────────────────

@router.post("/link")
async def link_stripe_customer(body: LinkStripeRequest, db: AsyncSession = Depends(get_db)):
    """Link a MediaLedger user to a Stripe customer ID."""
    import uuid
    user = await db.get(MediaServerUser, uuid.UUID(body.user_id))
    if not user:
        raise HTTPException(404, "User not found")
    user.stripe_customer_id = body.stripe_customer_id
    await db.commit()
    return {"ok": True, "username": user.username, "stripe_customer_id": body.stripe_customer_id}


@router.get("/subscriptions")
async def list_subscriptions(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List users with Stripe subscription info."""
    query = select(MediaServerUser).where(
        MediaServerUser.stripe_customer_id.isnot(None)
    ).order_by(MediaServerUser.username)
    if status:
        query = query.where(MediaServerUser.subscription_status == status)
    result = await db.execute(query)
    users = result.scalars().all()
    return [
        {
            "user_id": str(u.id),
            "username": u.username,
            "server_id": str(u.server_id),
            "stripe_customer_id": u.stripe_customer_id,
            "stripe_subscription_id": u.stripe_subscription_id,
            "subscription_status": u.subscription_status,
            "is_disabled": u.is_disabled,
        }
        for u in users
    ]


@router.post("/sync/{stripe_customer_id}")
async def sync_subscription(
    stripe_customer_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Manually sync a user's subscription status from Stripe."""
    stripe_api_key = getattr(settings, "stripe_api_key", None)
    if not stripe_api_key:
        raise HTTPException(500, "Stripe API key not configured")

    try:
        import stripe
        stripe.api_key = stripe_api_key
        subscriptions = stripe.Subscription.list(customer=stripe_customer_id, limit=1)
        if not subscriptions.data:
            return {"status": "no_subscription", "customer_id": stripe_customer_id}

        sub = subscriptions.data[0]
        await _handle_subscription_update(db, {
            "customer": stripe_customer_id,
            "id": sub.id,
            "status": sub.status,
        })
        return {
            "status": sub.status,
            "subscription_id": sub.id,
            "customer_id": stripe_customer_id,
        }
    except ImportError:
        raise HTTPException(500, "stripe package not installed")
    except Exception as e:
        raise HTTPException(500, f"Stripe sync failed: {e}")


@router.delete("/unlink/{user_id}")
async def unlink_stripe(user_id: str, db: AsyncSession = Depends(get_db)):
    """Remove Stripe association from a user."""
    import uuid
    user = await db.get(MediaServerUser, uuid.UUID(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    user.stripe_customer_id = None
    user.stripe_subscription_id = None
    user.subscription_status = None
    await db.commit()
    return {"ok": True}


# ── Helpers ──────────────────────────────────────────────────

async def _find_users_by_stripe(db: AsyncSession, customer_id: str) -> list[MediaServerUser]:
    result = await db.execute(
        select(MediaServerUser).where(
            MediaServerUser.stripe_customer_id == customer_id
        )
    )
    return list(result.scalars().all())


async def _set_server_disabled(db: AsyncSession, user: MediaServerUser, disabled: bool):
    """Enable or disable a user on their media server."""
    try:
        server = await db.get(Server, user.server_id)
        if not server or not server.is_active:
            return
        client = await get_client(
            str(server.id), server.server_type, server.base_url, server.api_key
        )
        policy = await client.get_user_policy(user.remote_user_id)
        policy["IsDisabled"] = disabled
        await client.set_user_policy(user.remote_user_id, policy)
    except Exception:
        logger.exception(
            "Failed to %s user %s on server %s",
            "disable" if disabled else "enable",
            user.username,
            user.server_id,
        )
