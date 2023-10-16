import QrScanner from 'qr-scanner';

import { doms } from './global.js';
import { ALERTS } from './i18n.js';
import { createAlert } from './misc.js';

/**
 * The active QR scanner (if one exists)
 * @type {QrScanner}
 */
let scanner = null;

/**
 * Asynchronously prompt a QR code scan, returning the QR string data on resolve or a `false` rejection on cancel or error
 * @returns {Promise<QrScanner.ScanResult | false>} - QR String data | false
 */
export async function scanQRCode() {
    // Don't create multiple scanners; in case of button spam
    if (scanner) return false;

    // Check for Camera support
    if (!QrScanner.hasCamera()) {
        createAlert('warning', ALERTS.NO_CAMERAS, 3000);
        return false;
    }

    return await new Promise((resolve, _reject) => {
        // Create a scanner
        scanner = new QrScanner(
            doms.domQrReaderStream,
            (res) => {
                stopQRScan();
                resolve(res);
            },
            {
                returnDetailedScanResult: true,
                preferredCamera: 'environment',
                highlightCodeOutline: true,
                highlightScanRegion: true,
            }
        );

        // Attempt to start scanning, then display the UI
        scanner
            .start()
            .then(() => {
                doms.domModalQRReader.classList.add('show');
                doms.domModalQRReader.style.display = 'block';
            })
            .catch((err) => {
                createAlert('warning', err, 2500);
                stopQRScan();
                resolve();
            });

        // If the close button is clicked, shutdown the scanner and destroy it to free memory
        doms.domCloseQrReaderBtn.addEventListener('click', () => {
            stopQRScan();
            resolve();
        });
    });
}

/**
 * Cancel an ongoing scan prompt
 */
export function stopQRScan() {
    if (!scanner) return;

    // Hide the modal
    doms.domModalQRReader.classList.remove('show');
    doms.domModalQRReader.style.display = 'none';

    // Shutdown the scanner and destroy it to free memory
    scanner.stop();
    scanner.destroy();
    scanner = null;
}
