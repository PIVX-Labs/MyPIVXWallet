import { getEventEmitter } from '../../scripts/event_bus.js';
import { beforeEach, it } from 'vitest';

describe('Event Emitter tests', () => {
    let varInt = 0;
    const event1 = 'event1';
    const event2 = 'event2';

    beforeEach(() => {
        varInt = 0;
        getEventEmitter().on(event1, async (newVal) => {
            varInt = newVal;
        });
        getEventEmitter().on(event2, async (newVal) => {
            varInt = -newVal;
        });
        expect(varInt).toBe(0);
    });

    it('enables events by default', () => {
        getEventEmitter().emit(event1, 1);
        expect(varInt).toBe(1);
    });

    it('successfully disable and enable events', () => {
        getEventEmitter().disableEvent(event1);
        getEventEmitter().emit(event1, 1);
        expect(varInt).toBe(0);
        getEventEmitter().enableEvent(event1);
        getEventEmitter().emit(event1, 2);
        expect(varInt).toBe(2);
    });
    test('events are independent', () => {
        // Disabling event1 doesn't affect event2
        getEventEmitter().disableEvent(event1);
        getEventEmitter().emit(event2, 50);
        expect(varInt).toBe(-50);
    });
});
