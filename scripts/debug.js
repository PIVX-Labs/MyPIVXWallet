/* eslint-disable no-console */

import { debug } from './settings.js';
import debugParams from '../debug_config.json';

/**
 * Execute a given function if the provided topic is in the filtered list
 * @param {Function} func - a function we want to execute
 * @param {DebugTopic} topic - the topic of the debug
 * @param {...any} args - The arguments to pass to the function
 */
function debugEvalFilter(func, topic, ...args) {
    if (topic.value & enabledDebug) {
        func(...args);
    }
}
/**
 * call console.log if we are in debug mode
 * @param {DebugTopic} topic - topic of the debug
 * @param args - arguments to print
 */
export function debugLog(topic, ...args) {
    if (debug) {
        debugEvalFilter(console.log, topic, topic.name, ...args);
    }
}

/**
 * call console.warn
 * @param {DebugTopic} topic - topic of the debug
 * @param args - arguments to print
 */
export function debugWarn(topic, ...args) {
    debugEvalFilter(console.warn, topic, topic.name, ...args);
}

/**
 * call console.error
 * @param {DebugTopic} topic - topic of the debug
 * @param args - arguments to print
 */
export function debugError(topic, ...args) {
    debugEvalFilter(console.error, topic, topic.name, ...args);
}

/**
 * Start a timer if we are in debug
 * @param {DebugTopic} topic - topic of the debug
 * @param {String} label - the label of the timer
 */
export function debugTimerStart(topic, label) {
    if (debug) {
        debugEvalFilter(console.time, topic, topic.name + ' ' + label);
    }
}

/**
 * End a timer if we are in debug mode
 * @param {DebugTopic} topic - topic of the debug
 * @param {String} label - the label of the timer
 */
export function debugTimerEnd(topic, label) {
    if (debug) {
        debugEvalFilter(console.timeEnd, topic, topic.name + ' ' + label);
    }
}

class DebugTopic {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}
export const DebugTopics = {
    NET: new DebugTopic('[NET]', 1 << 0),
    GLOBAL: new DebugTopic('[GLOBAL]', 1 << 1),
    WALLET: new DebugTopic('[WALLET]', 1 << 2),
    MEMPOOL: new DebugTopic('[MEMPOOL]', 1 << 3),
    AES_GCM: new DebugTopic('[AES_GMC]', 1 << 4),
    DATABASE: new DebugTopic('[DATABASE]', 1 << 5),
    GOVERNANCE: new DebugTopic('[GOVERNANCE]', 1 << 6),
    I18N: new DebugTopic('[I18N]', 1 << 7),
    LEDGER: new DebugTopic('[LEDGER]', 1 << 8),
    MASTERNODE: new DebugTopic('[MASTERNODE]', 1 << 9),
    VANITY_GEN: new DebugTopic('[VANITY_GEN]', 1 << 10),
};

let enabledDebug = 0;

export async function loadDebug() {
    for (const topic in DebugTopics) {
        const index_str = DebugTopics[topic].name.toLowerCase().slice(1, -1);
        if (debugParams[index_str]) {
            enabledDebug += DebugTopics[topic].value;
        }
    }
}
