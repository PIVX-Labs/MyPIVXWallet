import { describe, it, expect } from 'vitest';
import { Reader } from '../../scripts/reader.js';

function createMockStream(chunks, contentLength = null) {
    let i = 0;
    return {
        headers: {
            get: (key) => (key === 'Content-Length' ? contentLength : null),
        },
        body: {
            getReader: () => {
                return {
                    read: async () => {
                        if (i < chunks.length) {
                            const value = chunks[i];
                            i++;
                            return { done: false, value };
                        }
                        return { done: true, value: null };
                    },
                };
            },
        },
    };
}

describe('Reader without content length', () => {
    it('should read bytes correctly when available', async () => {
        const mockStream = createMockStream([
            new Uint8Array([1, 2, 3, 4]),
            new Uint8Array([5, 6, 7, 8]),
        ]);

        const reader = new Reader(mockStream);

        const result1 = await reader.read(4);
        expect(result1).toEqual(new Uint8Array([1, 2, 3, 4]));

        const result2 = await reader.read(4);
        expect(result2).toEqual(new Uint8Array([5, 6, 7, 8]));

        // Reads after the stream is done should yield null
        expect(await reader.read(10)).toBe(null);
    });

    it('should wait for more bytes if not enough are available', async () => {
        const mockStream = createMockStream([
            new Uint8Array([1, 2, 3]),
            new Uint8Array([4, 5, 6]),
        ]);

        const reader = new Reader(mockStream);

        const result = await reader.read(6);
        expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
        // Reads after the stream is done should yield null
        expect(await reader.read(1)).toBe(null);
    });

    it('should throw an error if read is called multiple times concurrently', async () => {
        const mockStream = createMockStream([new Uint8Array([1, 2, 3])]);

        const reader = new Reader(mockStream);

        const read1 = reader.read(2);
        const read2 = reader.read(2);

        await expect(read2).rejects.toThrow('Called read more than once');
        await expect(read1).resolves.toEqual(new Uint8Array([1, 2]));
    });

    it('should handle reading less than available bytes', async () => {
        const mockStream = createMockStream([new Uint8Array([1, 2, 3, 4, 5])]);

        const reader = new Reader(mockStream);

        const result1 = await reader.read(3);
        expect(result1).toEqual(new Uint8Array([1, 2, 3]));

        const result2 = await reader.read(2);
        expect(result2).toEqual(new Uint8Array([4, 5]));
    });
});

describe('Reader with Content-Length', () => {
    it('should initialize buffer size based on Content-Length header', async () => {
        const mockStream = createMockStream([], 2048);
        const reader = new Reader(mockStream);

        // Read some bytes to indirectly validate initialization
        const readPromise = reader.read(0); // No bytes to read, but ensures no errors
        await expect(readPromise).resolves.toEqual(new Uint8Array(0));
    });

    it('should work if Content-Length is not set', async () => {
        const mockStream = createMockStream([]);
        const reader = new Reader(mockStream);

        // Read some bytes to validate no Content-Length doesn't break initialization
        const readPromise = reader.read(0);
        await expect(readPromise).resolves.toEqual(new Uint8Array(0));
    });

    it('should handle reading bytes when Content-Length is specified', async () => {
        const mockStream = createMockStream(
            [new Uint8Array([1, 2, 3, 4])],
            2048 // Content-Length
        );

        const reader = new Reader(mockStream);

        const result = await reader.read(4);
        expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('should resize the buffer if more bytes are received than Content-Length', async () => {
        const mockStream = createMockStream(
            [new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7, 8])],
            4 // Content-Length is smaller than total bytes received
        );

        const reader = new Reader(mockStream);

        const result1 = await reader.read(4);
        expect(result1).toEqual(new Uint8Array([1, 2, 3, 4]));

        const result2 = await reader.read(4);
        expect(result2).toEqual(new Uint8Array([5, 6, 7, 8]));
    });
});
