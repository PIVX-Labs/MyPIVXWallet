import { vi } from 'vitest';

export const getNetwork = vi.fn(() => {
    return {
        getBlockCount: vi.fn(() => {
            return 1504903;
        }),
        getLatestTxs: vi.fn(),
        sendTransaction: vi.fn(),
    };
});
