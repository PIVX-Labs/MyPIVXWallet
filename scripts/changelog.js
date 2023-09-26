import { doms } from './global.js';
import { translation } from './i18n.js';
import { confirmPopup, sanitizeHTML } from './misc.js';

// ESLint error-skipping for webpack-injected globals
/* global VERSION */
/* global CHANGELOG */

/**
 * Check for recent local app updates
 */
export function checkForUpgrades() {
    // Check if the last used version doesn't match the current version.
    // Note: it's intended to skip if `lastVersion` is null, as this stops the popups for NEW users.
    const lastVersion = localStorage.getItem('version');
    if (lastVersion && lastVersion !== VERSION) {
        // Old user's first time on this update; display the changelog
        renderChangelog();
    }

    // Update the footer with our version
    doms.domVersion.innerText = 'v' + VERSION;

    // Update the last-used app version
    localStorage.setItem('version', VERSION);
}

/**
 * Render the Changelog from app versioning data, displaying it to the user
 */
export function renderChangelog() {
    let strHTML = '';

    // Loop every line of the markdown
    for (const rawLine of CHANGELOG.split(/\r?\n/)) {
        // Skip empty lines with linebreaks
        if (!rawLine.trim()) {
            strHTML += '<br><br>';
            continue;
        }

        // Parse the element type and the line content
        const type = rawLine[0];
        const line = rawLine.substring(1).trim();

        switch (type) {
            case '#':
                // `#` is a header, for titles like "New Features" or "Bug Fixes"
                strHTML += `<h3>${sanitizeHTML(line)}</h3>`;
                break;
            case '-':
                // `-` is a list element, for each 'New Feature' or 'Bug Fix' to be listed with
                strHTML += `<p>- ${sanitizeHTML(line)}</p>`;
                break;
            default:
                // If no element was recognised, it's just a plaintext line
                strHTML += `<p>${sanitizeHTML(type + line)}</p>`;
                break;
        }
    }

    // Enclose the Changelog in a body with a Changelog class
    const strFinalHTML = `<div class="changelog">${strHTML}</div>`;

    confirmPopup({
        title: translation.changelogTitle + ' ' + VERSION + '?',
        html: strFinalHTML,
        resolvePromise: false,
        hideConfirm: true,
    });
}
