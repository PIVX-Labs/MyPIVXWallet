import { deriveAddress } from './wallet.js';
import { getSafeRand } from './misc.js';

onmessage = function (_evt) {
    while (true) {
        const cKeypair = {};
        cKeypair.priv = getSafeRand();

        cKeypair.pub = deriveAddress({ pkBytes: cKeypair.priv });
        postMessage(cKeypair);
    }
};
