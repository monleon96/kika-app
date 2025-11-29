"""Admin CLI for KIKA backend."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

import click
from rich.console import Console
from sqlalchemy import select

from db import async_session_factory
from models import User
from security import hash_password


console = Console()


def _run(coro):
    return asyncio.run(coro)


@click.group()
def cli():
    """Admin CLI for KIKA backend."""
    pass


@cli.command()
@click.argument("email")
@click.option("--password", "-p", default=None, help="Password for the user")
@click.option("--verify", is_flag=True, help="Mark as verified")
def create_user(email: str, password: Optional[str], verify: bool):
    """Create a new user."""
    async def _create():
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == email.lower()))
            if result.scalar_one_or_none():
                console.print(f"[yellow]User {email.lower()} already exists[/yellow]")
                raise SystemExit(1)
            
            user = User(
                email=email.lower(),
                password_hash=hash_password(password) if password else None,
                is_active=True,
            )
            if verify:
                user.verified_at = datetime.now(timezone.utc)
            
            session.add(user)
            await session.commit()
            console.print(f"[green]✓ Created: {user.email}[/green]")
            if verify:
                console.print("[green]✓ Verified[/green]")
            if password:
                console.print("[green]✓ Password set[/green]")
    
    _run(_create())


@cli.command()
@click.argument("email")
def deactivate_user(email: str):
    """Deactivate a user."""
    async def _deactivate():
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == email.lower()))
            user = result.scalar_one_or_none()
            if not user:
                console.print(f"[red]User {email.lower()} not found[/red]")
                raise SystemExit(1)
            
            user.is_active = False
            await session.commit()
            console.print(f"[green]✓ Deactivated: {user.email}[/green]")
    
    _run(_deactivate())


@cli.command()
@click.option("--limit", "-l", default=100, help="Max users to show")
def list_users(limit: int):
    """List users."""
    async def _list():
        async with async_session_factory() as session:
            result = await session.execute(
                select(User).order_by(User.created_at.desc()).limit(limit)
            )
            users = result.scalars().all()
            
            if not users:
                console.print("[yellow]No users found[/yellow]")
                return
            
            console.print(f"[bold]{len(users)} users:[/bold]\n")
            for user in users:
                v = "✓" if user.verified_at else "✗"
                a = "✓" if user.is_active else "✗"
                p = "✓" if user.password_hash else "✗"
                console.print(
                    f"  {user.email}\n"
                    f"    verified:{v}  active:{a}  password:{p}\n"
                    f"    created:{user.created_at.isoformat()}"
                )
    
    _run(_list())


if __name__ == "__main__":
    cli()
