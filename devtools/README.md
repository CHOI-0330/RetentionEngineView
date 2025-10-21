# Devtools & Sandboxes

- `entitle/` keeps legacy adapters and mock data used for local-only scenarios. Enable them by setting `NEXT_PUBLIC_ENTITLE_SANDBOX=1` when you want to spin up the mock environment.
- `scenarios/` stores one-off scripts and E2E sketches that exercise the sandbox adapters without touching the production code paths.

These utilities are intentionally kept out of the runtime bundle. Always gate new helpers behind explicit feature flags or separate entry points.
