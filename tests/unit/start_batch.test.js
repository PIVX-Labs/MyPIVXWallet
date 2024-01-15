import { startBatch } from '../../scripts/utils.js';
import { describe, it, test } from 'vitest';

describe('Start batch tests', () => {
    const basicFunc = async (arrSize, batchSize) => {
        const arr = new Array(arrSize).fill(0).map((_, i) => i * 2);
        const promiseFactory = async (i) => {
            return arr[i] * 2;
        };
        const res = await startBatch(promiseFactory, arr.length, batchSize);
        for (let i = 0; i < arr.length; i++) {
            expect(res[i]).toBe(arr[i] * 2);
        }
    };
    test('basic functionality', async () => await basicFunc(100, 8));
    it('works with batchSize > length', async () => basicFunc(4, 500));
    it('works with batchSize = length', async () => basicFunc(500, 500));

    it('correctly handles errors', async () => {
        const arr = new Array(100).fill(0).map((_, i) => i * 2);
        // Simulated fail calls with a ~80% success rate
        const failCalls = [
            5, 13, 16, 18, 20, 28, 29, 34, 40, 41, 51, 58, 65, 67, 70, 71, 73,
            81, 88, 91, 94, 97, 100, 105, 112, 115, 117, 119, 127, 128, 130,
        ];
        let counter = 0;
        const promiseFactory = async (i) => {
            counter++;
            if (failCalls.includes(counter)) {
                throw new Error(':(');
            }
            return arr[i] * 2;
        };
        const res = await startBatch(promiseFactory, arr.length, 8, 50);
        for (let i = 0; i < arr.length; i++) {
            expect(res[i]).toBe(arr[i] * 2);
        }
    });
});
