import { describe, it, vi, expect } from 'vitest';
import { SaplingParams } from '../../scripts/sapling_params.js';

vi.mock('./event_bus', () => ({
    getEventEmitter: vi.fn(() => ({
        emit: vi.fn(),
    })),
}));

// Mock dependencies
const mockNetwork = {
    getSaplingOutput: vi.fn(),
    getSaplingSpend: vi.fn(),
};

const mockDatabase = {
    getShieldParams: vi.fn(),
    setShieldParams: vi.fn(),
};

const mockShield = {
    loadSaplingProverWithBytes: vi.fn(),
};

describe('SaplingParams', () => {
    let saplingParams;

    beforeEach(() => {
        saplingParams = new SaplingParams(mockNetwork, mockDatabase);
        vi.clearAllMocks();
    });

    describe('fetch', () => {
        it('should fetch params from the network, update progress, and store them', async () => {
            const mockResponse = {
                clone: () => ({
                    body: {
                        getReader: () => ({
                            read: vi
                                .fn()
                                .mockResolvedValueOnce({
                                    value: new Uint8Array([1, 2]),
                                    done: false,
                                })
                                .mockResolvedValueOnce({ done: true }),
                        }),
                    },
                }),
                headers: {
                    get: vi.fn(() => '4'),
                },
                arrayBuffer: vi.fn(() =>
                    Promise.resolve(new Uint8Array([1, 2, 3, 4]))
                ),
            };

            mockNetwork.getSaplingOutput.mockResolvedValue(mockResponse);
            mockNetwork.getSaplingSpend.mockResolvedValue(mockResponse);

            await saplingParams.fetch(mockShield);

            expect(mockNetwork.getSaplingOutput).toHaveBeenCalled();
            expect(mockNetwork.getSaplingSpend).toHaveBeenCalled();
            expect(mockShield.loadSaplingProverWithBytes).toHaveBeenCalledWith(
                expect.any(Uint8Array),
                expect.any(Uint8Array)
            );
            expect(mockDatabase.setShieldParams).toHaveBeenCalledWith(
                expect.any(Uint8Array),
                expect.any(Uint8Array)
            );
        });

        it('should not fetch params from the network if database params are valid', async () => {
            const mockParams = [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4, 5, 6]),
            ];
            mockDatabase.getShieldParams.mockResolvedValue(mockParams);

            await saplingParams.fetch(mockShield);

            expect(mockNetwork.getSaplingOutput).not.toHaveBeenCalled();
            expect(mockNetwork.getSaplingSpend).not.toHaveBeenCalled();
            expect(mockShield.loadSaplingProverWithBytes).toHaveBeenCalledWith(
                mockParams[0],
                mockParams[1]
            );
        });
    });
});
