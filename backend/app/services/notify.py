"""SMS + email auto-reply. Stubs gracefully when creds are not configured."""

from typing import Any

import resend
from twilio.rest import Client as TwilioClient

from ..config import settings


def send_sms(to: str, body: str) -> dict[str, Any]:
    if not (
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    ):
        return {"status": "skipped", "reason": "twilio_not_configured"}
    client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
    msg = client.messages.create(
        body=body, from_=settings.twilio_from_number, to=to
    )
    return {"status": "queued", "provider_id": msg.sid}


def send_email(to: str, subject: str, body: str) -> dict[str, Any]:
    if not (settings.resend_api_key and settings.resend_from_email):
        return {"status": "skipped", "reason": "resend_not_configured"}
    resend.api_key = settings.resend_api_key
    res = resend.Emails.send(
        {
            "from": settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": body,
        }
    )
    return {"status": "queued", "provider_id": res.get("id")}
