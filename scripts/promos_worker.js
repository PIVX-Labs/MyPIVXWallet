import { PromoCode } from 'pivx-promos';

// Listen for the caller giving the 'Promo Code' to derive
onmessage = async function (evt) {
    const code = new PromoCode(evt.data);

    // Setup the progress emitter
    code.progressEmitter.on('deriveProgress', (progress) => {
        postMessage({ type: 'progress', res: progress });
    });

    // Begin deriving, returning the finished key when complete
    const cWallet = await code.derivePrivateKey();
    postMessage({ type: 'key', res: cWallet });
};
