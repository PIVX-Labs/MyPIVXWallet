# Patch 1
This patch is primarily an immediate response to a newly discovered Tx serialisation bug affecting syncing - making it impossible to sync on Firefox, research by Duddino suggests this may actually be a bug in Firefox's Gecko engine, as the bug has only been replicatable on Firefox.

Additionally, various minor fixes and improvements were added to resolve some UX issues.

We are aware of a slight degredation in 'time-to-boot' for MPW when opened in a new tab, and issues on extremely slow networks, however, this will be resolved in early 2025.

# Improvements
- Added Privacy warning on XPub sharing.
- Improved space-use for PIVX Promos UI.

# Bug Fixes
- Fixed a rare serialisation issue causing failed syncs on Firefox (potentially a bug in Firefox's engine!).
- Fixed ability to unlock wallet in the Staking UI.
- Fixed Wallet Export file type.
- Fixed Wallet Export button icon.
- Fixed private key wrapping consistency.
- Re-added CSV Exports to PIVX Promos after UI regression.
- Fixed Governance display on iOS.

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