from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from emailer import send_password_reset_email, send_verification_email
from models import User
from schemas import ForgotPasswordRequest, LoginRequest, OkResponse, RegisterRequest, ResetPasswordRequest
from security import (
    SimpleRateLimiter,
    hash_password,
    generate_reset_token,
    generate_verification_token,
    verify_password,
    verify_reset_token,
    verify_verification_token,
)
from settings import get_settings


router = APIRouter(tags=["auth"])

settings = get_settings()

register_limiter_email = SimpleRateLimiter(max_hits=5, window_seconds=60)
register_limiter_ip = SimpleRateLimiter(max_hits=10, window_seconds=60)
login_limiter_email = SimpleRateLimiter(max_hits=10, window_seconds=60)
login_limiter_ip = SimpleRateLimiter(max_hits=20, window_seconds=60)
password_limiter_email = SimpleRateLimiter(max_hits=5, window_seconds=60)
password_limiter_ip = SimpleRateLimiter(max_hits=10, window_seconds=60)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/register", response_model=OkResponse)
async def register_user(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    email = payload.email.lower()
    register_limiter_email.check(email)
    if request.client and request.client.host:
        register_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")
        if payload.password:
            user.password_hash = hash_password(payload.password)
    else:
        user = User(
            email=email,
            password_hash=hash_password(payload.password) if payload.password else None,
        )
        session.add(user)

    await session.commit()

    token = generate_verification_token(email)
    verify_url = f"{str(settings.public_base_url).rstrip('/')}/verify?token={token}"
    
    # Send email in background, but don't fail registration if email fails
    try:
        background_tasks.add_task(send_verification_email, email, verify_url)
    except Exception as e:
        # Log error but continue (email is not critical for registration)
        import logging
        logging.error(f"Failed to queue verification email: {e}")
    
    return OkResponse()


@router.get("/verify", response_class=HTMLResponse)
async def verify_email(token: str, session: AsyncSession = Depends(get_session)) -> HTMLResponse:
    email = verify_verification_token(token)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return HTMLResponse(status_code=404, content="<!DOCTYPE html><p>❌ User not found.</p>")
    if not user.is_active:
        return HTMLResponse(status_code=400, content="<!DOCTYPE html><p>🚫 Account inactive.</p>")

    if not user.verified_at:
        user.verified_at = _now()
        await session.commit()

    return HTMLResponse(content="<!DOCTYPE html><p>✅ Email verified.</p>")


@router.post("/login", response_model=OkResponse)
async def login(payload: LoginRequest, request: Request, session: AsyncSession = Depends(get_session)) -> OkResponse:
    email = payload.email.lower()
    login_limiter_email.check(email)
    if request.client and request.client.host:
        login_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # In desktop mode (local DB), we skip email verification check if verified_at is null
    # This allows users to login immediately after registration
    import sys
    is_desktop = getattr(sys, 'frozen', False)
    if not is_desktop and not user.verified_at:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not verified")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = _now()
    await session.commit()
    return OkResponse()


@router.post("/password/forgot", response_model=OkResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    email = payload.email.lower()
    password_limiter_email.check(email)
    if request.client and request.client.host:
        password_limiter_ip.check(request.client.host)

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = generate_reset_token(email)
        reset_url = f"{str(settings.public_base_url).rstrip('/')}/password/reset?token={token}"
        background_tasks.add_task(send_password_reset_email, email, reset_url)

    return OkResponse()


@router.get("/password/reset", response_class=HTMLResponse)
async def password_reset_form(token: str) -> HTMLResponse:
    """Show password reset form."""
    # Verify token is valid before showing form
    try:
        verify_reset_token(token)
    except HTTPException:
        return HTMLResponse(
            status_code=400,
            content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>KIKA - Password Reset</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           display: flex; justify-content: center; align-items: center; min-height: 100vh; 
                           margin: 0; background: #f5f5f5; }
                    .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                                 max-width: 400px; width: 90%; text-align: center; }
                    h1 { color: #d32f2f; margin-bottom: 1rem; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Invalid or Expired Link</h1>
                    <p>This password reset link is invalid or has expired.</p>
                    <p>Please request a new password reset from the KIKA app.</p>
                </div>
            </body>
            </html>
            """
        )
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>KIKA - Reset Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   display: flex; justify-content: center; align-items: center; min-height: 100vh; 
                   margin: 0; background: #f5f5f5; }}
            .container {{ background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                         max-width: 400px; width: 90%; }}
            h1 {{ color: #1976d2; text-align: center; margin-bottom: 1.5rem; }}
            .form-group {{ margin-bottom: 1rem; }}
            label {{ display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333; }}
            input {{ width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; 
                    font-size: 1rem; box-sizing: border-box; }}
            input:focus {{ outline: none; border-color: #1976d2; }}
            button {{ width: 100%; padding: 0.75rem; background: #1976d2; color: white; border: none; 
                     border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem; }}
            button:hover {{ background: #1565c0; }}
            button:disabled {{ background: #ccc; cursor: not-allowed; }}
            .error {{ color: #d32f2f; font-size: 0.875rem; margin-top: 0.5rem; display: none; }}
            .success {{ text-align: center; }}
            .success h2 {{ color: #2e7d32; }}
            .hint {{ font-size: 0.75rem; color: #666; margin-top: 0.25rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div id="form-container">
                <h1>⚛️ KIKA</h1>
                <h2 style="text-align: center; color: #333; font-weight: normal;">Reset Your Password</h2>
                <form id="reset-form">
                    <div class="form-group">
                        <label for="password">New Password</label>
                        <input type="password" id="password" name="password" required minlength="8">
                        <div class="hint">Minimum 8 characters</div>
                    </div>
                    <div class="form-group">
                        <label for="confirm">Confirm Password</label>
                        <input type="password" id="confirm" name="confirm" required minlength="8">
                    </div>
                    <div id="error" class="error"></div>
                    <button type="submit" id="submit-btn">Reset Password</button>
                </form>
            </div>
            <div id="success-container" class="success" style="display: none;">
                <h2>✅ Password Reset Successfully!</h2>
                <p>You can now sign in to KIKA with your new password.</p>
            </div>
        </div>
        <script>
            const form = document.getElementById('reset-form');
            const errorDiv = document.getElementById('error');
            const submitBtn = document.getElementById('submit-btn');
            const formContainer = document.getElementById('form-container');
            const successContainer = document.getElementById('success-container');
            
            form.addEventListener('submit', async (e) => {{
                e.preventDefault();
                errorDiv.style.display = 'none';
                
                const password = document.getElementById('password').value;
                const confirm = document.getElementById('confirm').value;
                
                if (password !== confirm) {{
                    errorDiv.textContent = 'Passwords do not match';
                    errorDiv.style.display = 'block';
                    return;
                }}
                
                if (password.length < 8) {{
                    errorDiv.textContent = 'Password must be at least 8 characters';
                    errorDiv.style.display = 'block';
                    return;
                }}
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Resetting...';
                
                try {{
                    const response = await fetch('/password/reset', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            token: '{token}',
                            new_password: password
                        }})
                    }});
                    
                    if (response.ok) {{
                        formContainer.style.display = 'none';
                        successContainer.style.display = 'block';
                    }} else {{
                        const data = await response.json();
                        errorDiv.textContent = data.detail || 'Failed to reset password. Please try again.';
                        errorDiv.style.display = 'block';
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Reset Password';
                    }}
                }} catch (err) {{
                    errorDiv.textContent = 'Connection error. Please try again.';
                    errorDiv.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Reset Password';
                }}
            }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post("/password/reset", response_model=OkResponse)
async def reset_password(payload: ResetPasswordRequest, session: AsyncSession = Depends(get_session)) -> OkResponse:
    email = verify_reset_token(payload.token).lower()

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")

    user.password_hash = hash_password(payload.new_password)
    if not user.verified_at:
        user.verified_at = _now()

    await session.commit()
    return OkResponse()
