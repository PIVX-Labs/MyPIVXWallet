import { EventEmitter } from 'events';

/**
 * Wrapper class around EventEmitter that allow to enable/disable specific events.
 * By defaults all events are enabled, and can be disabled by calling disableEvent
 */
class EventEmitterWrapper {
    /** @type{EventEmitter} */
    #internalEmitter;
    /**
     * Set of disabled events
     * @type {Set<string>}
     */
    #disabledEvents = new Set();
    constructor() {
        this.#internalEmitter = new EventEmitter();
    }

    on(eventName, listener) {
        this.#internalEmitter.on(eventName, listener);
    }

    emit(eventName, ...args) {
        if (this.#disabledEvents.has(eventName)) {
            return;
        }
        this.#internalEmitter.emit(eventName, ...args);
    }

    /**
     * Disable an event
     * @param {string} eventName
     */
    disableEvent(eventName) {
        this.#disabledEvents.add(eventName);
    }
    /**
     * Enable a (previously disabled) event
     * @param {string} eventName
     */
    enableEvent(eventName) {
        this.#disabledEvents.delete(eventName);
    }
}

const eventEmitter = new EventEmitterWrapper();

/**
 * Get the application wide event emitter.
 * @returns {EventEmitterWrapper}
 */
export function getEventEmitter() {
    return eventEmitter;
}
