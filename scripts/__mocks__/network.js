import { vi } from 'vitest';

export const getNetwork = vi.fn(() => {
    return {
        cachedBlockCount: 1504903,
        reset: vi.fn(),
        setWallet: vi.fn(),
    };
});
