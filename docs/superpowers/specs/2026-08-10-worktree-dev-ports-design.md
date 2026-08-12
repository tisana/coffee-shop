# Worktree Development Ports Design

## Goal

Allow agents to run the API and staff web development servers from multiple Git
worktrees at the same time without fighting over the main checkout's ports.

## Current constraints

- The main checkout must retain `npm run dev` on API port `3000` and staff-web
  port `5173`.
- The existing development launcher already forwards its environment to both
  child processes.
- Worktrees use separate checkout-local files and logs, but the Docker
  PostgreSQL service remains shared on port `5432` and database `coffee_shop`.
- Existing Playwright and single-workspace commands must retain their default
  ports and behavior.

## Design

Add a dedicated `npm run dev:worktree` command. It will derive a stable slot
from the canonical absolute path of the current checkout and use that slot to
set a paired API and staff-web port before it starts the existing logged
development launcher:

- API: `4100 + slot`
- Staff web: `6100 + slot`

The slot is a SHA-256-derived integer from `0` through `999`. This gives each
worktree a repeatable address and keeps it away from the main checkout's
`3000`/`5173` defaults. `WORKTREE_API_PORT` and `WORKTREE_WEB_PORT` provide
explicit valid-port overrides if two paths happen to hash to the same slot or a
developer needs a known port.

The staff-web Vite configuration will read the launcher-provided web and API
ports, so the browser proxy always reaches the API from the same worktree.
Without those variables it will continue to use `5173` and `3000`.

The staff workspace's development command must not supply a conflicting Vite
`--port` argument. On Windows, the shared logged launcher will terminate each
workspace command as a process tree so a stopped worktree session cannot leave
Vite or `tsx watch` holding its derived ports.

## Repository guidance

- Add `.worktrees/` to `.gitignore`, making the recommended project-local
  worktree location safe to use.
- Document the command, printed URLs, override variables, setup requirements,
  and shared-database limitation in `README.md`.
- Add the command and the same database safety rule to `AGENTS.md`, so each
  agent sees the required workflow before starting a development session.

## Validation

Add a Node test that proves path-to-port derivation is stable, produces paired
ports in their documented ranges, and honors explicit overrides. Run it before
and after implementation. Then run the focused typecheck/build for the
staff-web configuration and inspect the Git worktree/ignore behavior.

## Non-goals

This change does not create separate PostgreSQL databases, change the default
development command, alter Playwright's default server, or automatically run
migrations or seeds.
