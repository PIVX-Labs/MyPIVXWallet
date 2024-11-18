import { OrderedArray } from '../../scripts/ordered_array.js';
import { beforeEach, it } from 'vitest';
import { getRandomInt } from '../../scripts/utils.js';

function verifyOrder(arr, fn) {
    let prev = arr[0];
    for (let i = 1; i < arr.length; i++) {
        expect(fn(prev, arr[i]));
        prev = arr[i];
    }
}
function insertFirstNaturals(arr, N) {
    for (let i = 0; i < N; i++) {
        arr.insert(i);
    }
}
describe('Ordered array tests', () => {
    /**
     * @type OrderedArray<number>
     */
    let arr;
    const sleep_time = 1000;
    beforeEach(() => {
        arr = new OrderedArray((x, y) => x >= y);
    });
    it('is actually ordered', () => {
        const Nit = 100;
        const Max = 1000;
        for (let i = 0; i < Nit; i++) {
            arr.insert(getRandomInt(Max));
        }
        verifyOrder(arr);
    });
    it('returns the internal data correctly', () => {
        insertFirstNaturals(arr, 3);
        expect(arr.get()).toStrictEqual([2, 1, 0]);
    });
    it('deletes correctly', () => {
        insertFirstNaturals(arr, 6);
        expect(arr.get()).toStrictEqual([5, 4, 3, 2, 1, 0]);
        arr.remove((x) => x === 1);
        expect(arr.get()).toStrictEqual([5, 4, 3, 2, 0]);
        arr.remove((x) => x < 4);
        expect(arr.get()).toStrictEqual([5, 4, 2, 0]);
        arr.remove((x) => x > 5);
        expect(arr.get()).toStrictEqual([5, 4, 2, 0]);
    });
    it('clears correctly', () => {
        insertFirstNaturals(arr, 6);
        expect(arr.get()).toStrictEqual([5, 4, 3, 2, 1, 0]);
        arr.clear();
        expect(arr.get()).toStrictEqual([]);
    });
});
