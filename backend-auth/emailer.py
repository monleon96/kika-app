from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage
from typing import Optional

import httpx

from settings import get_settings


def _build_message(subject: str, to_email: str, text_body: str, html_body: str) -> EmailMessage:
    settings = get_settings()
    message = EmailMessage()
    message["Subject"] = subject
    message["To"] = to_email
    message["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    return message


def _send_mail_smtp(message: EmailMessage) -> None:
    """Legacy SMTP sending (deprecated)."""
    settings = get_settings()
    if not settings.smtp_host:
        raise RuntimeError("SMTP not configured")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as client:
        client.ehlo()
        if settings.smtp_user and settings.smtp_pass:
            client.starttls()
            client.login(settings.smtp_user, settings.smtp_pass)
        client.send_message(message)


async def _send_mail_brevo(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> None:
    """Send email via Brevo API (recommended)."""
    import logging
    settings = get_settings()
    
    if not settings.brevo_api_key:
        logging.error("Brevo API key not configured")
        raise RuntimeError("Brevo API key not configured")
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }
    
    payload = {
        "sender": {
            "name": settings.mail_from_name,
            "email": settings.mail_from,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    
    if text_body:
        payload["textContent"] = text_body
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            logging.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email via Brevo to {to_email}: {e}")
        raise


async def send_verification_email(email: str, verify_url: str) -> None:
    """Send verification email via Brevo API or SMTP."""
    import logging
    settings = get_settings()
    subject = "Verify your email for KIKA"
    text_body = (
        "Hello,\n\n"
        "Please verify your email by visiting the link below:\n"
        f"{verify_url}\n\n"
        "If you did not request this, you can ignore this message."
    )
    html_body = f"""
    <html>
      <body>
        <p>Hello,</p>
        <p>Please verify your email by clicking the button below:</p>
        <p><a href="{verify_url}" style="padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a></p>
        <p>If you did not request this, you can ignore this message.</p>
      </body>
    </html>
    """
    
    try:
        # Use Brevo API if configured
        if settings.brevo_api_key:
            await _send_mail_brevo(email, subject, html_body, text_body)
        elif settings.smtp_host:
            message = _build_message(subject, email, text_body, html_body)
            await asyncio.to_thread(_send_mail_smtp, message)
        else:
            logging.warning("No email service configured - skipping verification email")
    except Exception as e:
        # Log error but don't fail the registration
        logging.error(f"Failed to send verification email to {email}: {e}")


async def send_password_reset_email(email: str, reset_url: str) -> None:
    """Send password reset email via Brevo API or SMTP."""
    import logging
    settings = get_settings()
    subject = "Reset your KIKA password"
    text_body = (
        "Hello,\n\n"
        "You can reset your password by visiting the link below:\n"
        f"{reset_url}\n\n"
        "If you did not request a password reset, you can ignore this message."
    )
    html_body = f"""
    <html>
      <body>
        <p>Hello,</p>
        <p>You can reset your password by clicking the button below:</p>
        <p><a href="{reset_url}" style="padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
        <p>If you did not request a password reset, you can ignore this message.</p>
      </body>
    </html>
    """
    
    try:
        # Use Brevo API if configured
        if settings.brevo_api_key:
            await _send_mail_brevo(email, subject, html_body, text_body)
        elif settings.smtp_host:
            message = _build_message(subject, email, text_body, html_body)
            await asyncio.to_thread(_send_mail_smtp, message)
        else:
            logging.warning("No email service configured - skipping password reset email")
    except Exception as e:
        # Log error but don't fail the password reset
        logging.error(f"Failed to send password reset email to {email}: {e}")
