"""Notification agent implementations."""
import logging
from abc import ABC, abstractmethod

import httpx

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base notification agent."""

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    async def send(self, subject: str, body: str) -> None:
        ...

    @abstractmethod
    async def test(self) -> bool:
        ...


class DiscordAgent(BaseAgent):
    """Send notifications via Discord webhook."""

    async def send(self, subject: str, body: str) -> None:
        webhook_url = self.config["webhook_url"]
        payload = {
            "embeds": [
                {
                    "title": subject,
                    "description": body,
                    "color": 0x7C3AED,  # brand purple
                }
            ]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, timeout=10)
            resp.raise_for_status()

    async def test(self) -> bool:
        try:
            await self.send("MediaLedger Test", "This is a test notification from MediaLedger.")
            return True
        except Exception:
            logger.exception("Discord test failed")
            return False


class WebhookAgent(BaseAgent):
    """Send notifications via generic webhook (JSON POST)."""

    async def send(self, subject: str, body: str) -> None:
        url = self.config["url"]
        headers = self.config.get("headers", {})
        payload = {
            "subject": subject,
            "body": body,
            "source": "medialedger",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=10)
            resp.raise_for_status()

    async def test(self) -> bool:
        try:
            await self.send("MediaLedger Test", "This is a test notification.")
            return True
        except Exception:
            logger.exception("Webhook test failed")
            return False


class GotifyAgent(BaseAgent):
    """Send notifications via Gotify."""

    async def send(self, subject: str, body: str) -> None:
        url = self.config["url"].rstrip("/") + "/message"
        token = self.config["token"]
        payload = {
            "title": subject,
            "message": body,
            "priority": self.config.get("priority", 5),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json=payload,
                params={"token": token},
                timeout=10,
            )
            resp.raise_for_status()

    async def test(self) -> bool:
        try:
            await self.send("MediaLedger Test", "This is a test notification.")
            return True
        except Exception:
            logger.exception("Gotify test failed")
            return False


class NtfyAgent(BaseAgent):
    """Send notifications via ntfy."""

    async def send(self, subject: str, body: str) -> None:
        url = self.config.get("url", "https://ntfy.sh").rstrip("/")
        topic = self.config["topic"]
        headers = {"Title": subject}
        if self.config.get("token"):
            headers["Authorization"] = f"Bearer {self.config['token']}"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{url}/{topic}",
                content=body,
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()

    async def test(self) -> bool:
        try:
            await self.send("MediaLedger Test", "This is a test notification.")
            return True
        except Exception:
            logger.exception("ntfy test failed")
            return False


class EmailAgent(BaseAgent):
    """Send notifications via SMTP email."""

    async def send(self, subject: str, body: str) -> None:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = self.config["from_address"]
        msg["To"] = self.config["to_address"]

        with smtplib.SMTP(self.config["smtp_host"], self.config.get("smtp_port", 587)) as server:
            if self.config.get("use_tls", True):
                server.starttls()
            if self.config.get("smtp_user"):
                server.login(self.config["smtp_user"], self.config.get("smtp_password", ""))
            server.send_message(msg)

    async def test(self) -> bool:
        try:
            await self.send("MediaLedger Test", "This is a test notification.")
            return True
        except Exception:
            logger.exception("Email test failed")
            return False


AGENT_MAP = {
    "discord": DiscordAgent,
    "webhook": WebhookAgent,
    "gotify": GotifyAgent,
    "ntfy": NtfyAgent,
    "email": EmailAgent,
}


def create_agent(agent_type: str, config: dict) -> BaseAgent:
    cls = AGENT_MAP.get(agent_type)
    if not cls:
        raise ValueError(f"Unknown agent type: {agent_type}")
    return cls(config)
