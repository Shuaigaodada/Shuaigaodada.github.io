# Shared game economy

The account balance is platform-owned currency. A game may only change it through an append-only `wallet_transactions` entry and the matching balance update.

Core invariants:

- `amount < 0` commits chips to a table; `amount > 0` pays out or refunds chips.
- Every mutation carries a globally unique `idempotency_key`.
- `game_type`, `table_id`, and `round_id` identify the source of every change.
- A user can have only one row in `active_game_sessions`, preventing concurrent tables from overwriting or double-spending the same balance.
- A game stores committed chips separately from the remaining account balance.

Future games such as Texas Hold'em should reuse these tables and the pure betting calculations in `betting.ts`. They should add pot/side-pot rules to their own engine rather than adding game-specific balance columns to `users`.
