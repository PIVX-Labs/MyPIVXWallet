import { reactive } from 'vue';
import chainParams from '../chain_params.json';

// In most BTC-derived coins, the below parameters can be found in the 'src/chainparams.cpp' Mainnet configuration.
// These below params share the same names as the CPP params, so finding and editing these is easy-peasy!
// <[network_byte] [32_byte_payload] [0x01] [4_byte_checksum]>
export const PRIVKEY_BYTE_LENGTH = 38;

export const COIN_DECIMALS = 8;
export const COIN = 10 ** 8;

/** The maximum gap (absence of transactions within a range of derived addresses) before an account search ends */
export const MAX_ACCOUNT_GAP = 20;

/** The batch size of Shield block synchronisation */
export const SHIELD_BATCH_SYNC_SIZE = 32;

/** Transaction Sapling Version */
export const SAPLING_TX_VERSION = 3;

/* Internal tweaking parameters */
// A new encryption password must be 'at least' this long.
export const MIN_PASS_LENGTH = 6;

/** BIP21 coin prefix */
export const BIP21_PREFIX = 'pivx';

/* chainparams */
export const cChainParams = reactive({
    current: chainParams.main,
    ...chainParams,
});
