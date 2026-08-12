<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/003-loyalty-program/plan.md
<!-- SPECKIT END -->

## Worktree development

When running development servers from a linked worktree, run `npm install` and
then `npm run dev:worktree`. It assigns isolated API and staff-web ports; do
not use the default `npm run dev` for parallel worktree sessions. PostgreSQL is
shared, so coordinate database migrations, seeds, and resets with other agents.
