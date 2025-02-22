# Patch 2
This patch primarily resolves many of the inconveniences with Shield, Governance and Ledger features, while also handling a dozen smaller bugs around the app.

# Improvements
- Added a live progress bar to Shield Params download.
- Outgoing Shield Txs now reflect in-balance immediately.
- Added a tooltip to clarify Immature Stakes.
- Added a 'queue' to Ledger comms for improved stability.

# Bug Fixes
- Fixed various Proposal Submission issues.
- Fixed Ledger attempting to delegate 'unstake' change.
- Added ability to delete prev. "stuck" proposals.
- Fixed MN collaterals failing to lock.
- Fixed currency rounding causing slightly-off Fiat values.
- Disallowed Ledger Txs that are larger than Ledger permits.
- Disallowed non-numeric inputs in Transfer menus.
- Fixed NaN appearing in Payment URIs without Amounts.
- Fixed old alerts re-appearing.
- Fixed excess Ledger Import errors.
- Fixed inaccurate Stake amount alerts.
- Fixed incorrect icon metadata tag.

# v2.1 - Feature Update
This upgrade contains huge Shield Improvements; a 10-30x faster Shield Sync (device-dependent) and full Shield Activity support.

It also brings real-time activity for internal transactions, more efficient staking with automatic UTXO splitting, and a redesigned notification system.

# New Features
- Shield Activity: Shield TXs are now supported in your Activity.
- Real-time Activity: internal TXs now instantly show in your Activity.
- Stake Pre-Splitting: automatic UTXO splitting for max staking efficiency.
- New Notifications: beautified, with in-notif actions and prompts.

# Improvements
- Proposal Fees are now recognised in your Activity.
- Nicer Activity date format.
- Randomise initial Explorer + Node selections.
- Improved space-optimised PIVX Promos interface.

# Bug Fixes
- Fixed Unstaking for Ledger devices.
- Fixed Currency failing to render in certain conditions.
- Fixed getting stuck in Private mode when swapping to a public-only wallet.
- Fixed automatic HD address rotation.
- Fixed 'Total Rewards' counter computing wrong amounts.
- Fixed large-byte-size Txs failing due to using RPC GET requests.
- Fixed certain notifications failing to show.