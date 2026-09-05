# Contributing

## Setup

```bash
pnpm install
pnpm test
```

## Commits

English Conventional Commits only (`feat(parser):`, `fix(types):`, `docs(readme):`). Do not use `update`, `fix`, `final`, or non-English messages.

Run before you commit:

```bash
pnpm format:check
pnpm typecheck
pnpm test
```

## Scope

Keep PRs coherent. Do not mix parser work with MCP protocol changes. Update README and `memory/CURRENT.md` when user-facing behavior or project state changes.

Do not add benchmark numbers unless they come from a tagged `bench-vX` run with N ≥ 3.

## License

Contributions are Apache-2.0.
