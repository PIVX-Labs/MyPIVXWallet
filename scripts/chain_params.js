// In most BTC-derived coins, the below parameters can be found in the 'src/chainparams.cpp' Mainnet configuration.
// These below params share the same names as the CPP params, so finding and editing these is easy-peasy!
// <[network_byte] [32_byte_payload] [0x01] [4_byte_checksum]>
export const PRIVKEY_BYTE_LENGTH = 38;

export const COIN_DECIMALS = 8;
export const COIN = 10 ** 8;

/** The maximum gap (absence of transactions within a range of derived addresses) before an account search ends */
export const MAX_ACCOUNT_GAP = 20;

/* Internal tweaking parameters */
// A new encryption password must be 'at least' this long.
export const MIN_PASS_LENGTH = 6;

// Cool stuff
export const donationAddress = 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb';

/* chainparams */
export const cChainParams = {
    current: null,
    main: {
        collateralInSats: 10000 * COIN,
        isTestnet: false,
        TICKER: 'PIV',
        PUBKEY_PREFIX: ['D'],
        STAKING_PREFIX: 'S',
        PUBKEY_ADDRESS: 30,
        SECRET_KEY: 212,
        BIP44_TYPE: 119,
        BIP44_TYPE_LEDGER: 77,
        PROTOCOL_VERSION: 70926,
        MASTERNODE_PORT: 51472,
        // A list of Labs-trusted explorers
        Explorers: [
            // Display name      Blockbook-compatible API base
            { name: 'rockdev', url: 'https://explorer.rockdev.org' },
            { name: 'zkBitcoin', url: 'https://zkbitcoin.com' },
        ],
        Nodes: [{ name: 'duddino', url: 'https://rpc.duddino.com/mainnet' }],
        Consensus: {
            // Network upgrades
            UPGRADE_V6_0: undefined,
        },
    },
    testnet: {
        collateralInSats: 10000 * COIN,
        isTestnet: true,
        TICKER: 'tPIV',
        PUBKEY_PREFIX: ['x', 'y'],
        STAKING_PREFIX: 'W',
        PUBKEY_ADDRESS: 139,
        SECRET_KEY: 239,
        BIP44_TYPE: 1,
        BIP44_TYPE_LEDGER: 1,
        PROTOCOL_VERSION: 70926,
        MASTERNODE_PORT: 51474,
        // A list of Labs-trusted explorers
        Explorers: [
            // Display name      Blockbook-compatible API base
            { name: 'rockdev', url: 'https://testnet.rockdev.org' },
        ],
        Nodes: [{ name: 'duddino', url: 'https://rpc.duddino.com/testnet' }],
        Consensus: {
            // Network upgrades
            UPGRADE_V6_0: undefined,
        },
    },
};
// Set default chain
cChainParams.current = cChainParams.main;
