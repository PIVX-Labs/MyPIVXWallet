import { cChainParams } from './chain_params.js';
import { deriveAddress } from './encoding.js';
import { getSafeRand } from './utils.js';

/**
 * @param {MessageEvent<'main'|'testnet'>} event
 */
onmessage = (event) => {
    while (true) {
        // Ensure we're using the correct network
        cChainParams.current =
            cChainParams[event.data === 'mainnet' ? 'main' : 'testnet'];
        const cKeypair = {};
        cKeypair.priv = getSafeRand();

        cKeypair.pub = deriveAddress({ pkBytes: cKeypair.priv });
        postMessage(cKeypair);
    }
};
