import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();

/**
 * Get the application wide event emitter.
 * @returns {EventEmitter}
 */
export function getEventEmitter() {
    return eventEmitter;
}
