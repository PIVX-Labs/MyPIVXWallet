# Patch 1
A patch for MPW v2.0, primarily resolving stability, performance and minor UX issues.

# Improvements
- Persistant Wallet Mode.
- Shield sync is visually smoother.
- Shield sync is persisted better between restarts.
- Automatic Node switching.
- Faster TXDB initialisation.

# Removals
- Legacy DB migration system.

# Bug Fixes
- Fixed issues with persisted unconfirmed Txs.
- Fixed a case in which Txs load in an incorrect order.
- Fixed Total Rewards counter.
- Fixed old v1.0 branding remnant.

# v2.0 - Major Update
This is the largest MPW upgrade since Shield; containing an incredible array of improvements and polish, with the aim of bringing MPW to a professional wallet standard, welcome to v2.0.

There are over 15k line changes in v2.0, this changelog will only show a small subset of notable changes, for more, head to GitHub.

# New Features
- Wallet Modes: Public and Private, a simplified experience.

# New Language
- 🇮🇳 Hindi (by Rushali Padhiary).

# Improvements
- Completely redesigned theme.
- A dozen Shield sync improvements.
- Added persistance for Ledger users.
- Added Exchange Address activity.
- Contacts are now Shield-based.
- Added address quick-refresh button.
- Moved from CoinGecko to Labs Oracle.
- Added Official PIVX Labs RPC Node.
- Added visibility toggle to Password fields.
- Fixed Over-Allocated proposal display.
- Gray-out Ledger if browser is unsupported.
- Gray-out Contact button until wallet is saved.
- Improved User Debug system.

# Removals
- Removed the Analytics system.
- Removed address identicons.
- Removed the 'disconnection' ability.
- Removed manual 'refresh' ability.

# Bug Fixes
- Fixed excessive blockbook error notifications.
- Fixed Shield getting stuck in a bad state with sapling root validation auto-resyncs.
- Fix Tx discarding on failed broadcasts.
- Fix some Legacy wallet syncing errors.
- Fixed inconsistent modal scrollbars.
- Fixed iOS auto-zoom.