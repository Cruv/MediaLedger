"""Central notification dispatcher — sends notifications to all matching agents."""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationAgent, NotificationLog
from app.notifications.agents import create_agent

logger = logging.getLogger(__name__)

# Trigger types
TRIGGER_ON_PLAY = "on_play"
TRIGGER_ON_STOP = "on_stop"
TRIGGER_ON_CONCURRENT = "on_concurrent"
TRIGGER_ON_NEW_DEVICE = "on_new_device"
TRIGGER_SHARING_ALERT = "sharing_alert"
TRIGGER_REQUEST_AVAILABLE = "request_available"
TRIGGER_REQUEST_WATCHED = "request_watched"


class NotificationDispatcher:
    """Sends notifications to all enabled agents whose triggers match."""

    async def dispatch(
        self,
        db: AsyncSession,
        trigger: str,
        subject: str,
        body: str,
    ):
        """Send a notification to all agents with the given trigger enabled."""
        result = await db.execute(
            select(NotificationAgent).where(
                NotificationAgent.is_enabled == True,
                NotificationAgent.triggers.any(trigger),
            )
        )
        agents = result.scalars().all()

        for agent_row in agents:
            success = False
            error_msg = None
            try:
                agent = create_agent(agent_row.agent_type, agent_row.config_json)
                await agent.send(subject, body)
                success = True
                logger.info(
                    "Notification sent via %s (%s) for trigger %s",
                    agent_row.name, agent_row.agent_type, trigger,
                )
            except Exception as e:
                error_msg = str(e)
                logger.exception(
                    "Failed to send notification via %s (%s) for trigger %s",
                    agent_row.name, agent_row.agent_type, trigger,
                )

            log = NotificationLog(
                agent_id=agent_row.id,
                trigger_type=trigger,
                subject=subject,
                body=body,
                success=success,
                error_message=error_msg,
            )
            db.add(log)

        await db.flush()
