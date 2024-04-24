import { lockableFunction } from '../../scripts/lock.js';
import { sleep } from '../../scripts/utils.js';
import { beforeEach, it } from 'vitest';

describe('Lockable function tests', () => {
    let test_function;
    const sleep_time = 1000;
    beforeEach(() => {
        test_function = lockableFunction(async (str_input) => {
            await sleep(sleep_time);
            return str_input;
        });
    });
    it('Lockable function returns the correct value', async () => {
        expect(await test_function('test_locks')).toBe('test_locks');
    });
    it('Lockable function gives the correct value for the lock', async () => {
        // At the beginning there is no lock
        expect(test_function.isLocked()).toBeFalsy();
        test_function('test_locks');
        await sleep(sleep_time / 2);
        // When the function is running the lock is acquired
        expect(test_function.isLocked()).toBeTruthy();
        await sleep(sleep_time / 2);
        // When the function stop running the lock is dropped
        expect(test_function.isLocked()).toBeFalsy();
    });
    it("Calling when locked doesn't make the function run twice", async () => {
        test_function('test_locks');
        expect(await test_function('test_locks')).toBeUndefined();
    });
});
