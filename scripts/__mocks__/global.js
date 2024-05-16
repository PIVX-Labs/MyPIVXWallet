import { getEventEmitter } from '../event_bus.js';
import { vi } from 'vitest';

export let blockCount = 1504903;

export const start = vi.fn(() => {
    subscribeToNetworkEvents();
});

const subscribeToNetworkEvents = vi.fn(() => {
    getEventEmitter().on('new-block', (block) => {
        blockCount = block;
    });
});
