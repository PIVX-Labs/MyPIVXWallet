'use strict';

import { deriveAddress } from './wallet.js';
import { getSafeRand } from './misc.js';

const cKeypair = {
    pub: '',
    priv: new Uint8Array(),
};

onmessage = function (evt) {
    while (true) {
        const cKeypair = {};
        cKeypair.priv = getSafeRand();

        cKeypair.pub = deriveAddress({ pkBytes: cKeypair.priv });
        postMessage(cKeypair);
    }
};
