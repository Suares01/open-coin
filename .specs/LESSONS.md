# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When an AC promises atomicity or concurrency ordering, assert the failure or concurrency boundary and every persisted side effect, not only the final happy-path state.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `sqlite,transactions` · harmful: 0
- features: financial-sqlite-persistence
- evidence: FSP-37/FSP-38/FSP-43 (sqlite,transactions)
- last seen: 2026-08-04T21:54:25Z

### L-002 - When a spec requires a concrete SQL or lifecycle predicate, add an observable assertion for that predicate instead of inferring it from an end-state result.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `sqlite,contracts` · harmful: 0
- features: financial-sqlite-persistence
- evidence: FSP-03/FSP-11/FSP-13/FSP-30/FSP-35/FSP-39 (sqlite,contracts)
- last seen: 2026-08-04T21:54:25Z

### L-003 - Treat build warnings as gate failures whenever the acceptance criterion requires warning-free execution, even when the process exits zero.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `workspace,gates` · harmful: 0
- features: financial-sqlite-persistence
- evidence: validation.md:163 (workspace,gates)
- last seen: 2026-08-04T21:54:25Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
