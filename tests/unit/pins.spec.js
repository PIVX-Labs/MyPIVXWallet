import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    verifySmtProof,
    fetchEVMRoot,
    fetchIndexerRoot,
    getEVMNetwork,
    getEvmRpcList,
    verifyRootValidityOnContract,
    isStrictShieldAddress,
    evmCall,
    isPIVXName,
    isPIVXNameTLD,
    PIVXNameTLDs,
    MIN_RPC_AGREEMENT,
    RpcQuorumError,
    IndexerUnreachableError,
    FETCH_TIMEOUT_MS,
    getNameResolverUrl,
    parseIndexerRoot,
} from '../../scripts/utils.pins.js';
import { mount } from '@vue/test-utils';
import PiNS from '../../scripts/dashboard/PiNS.vue';
import { Database } from '../../scripts/database.js';
import {
    AlertController,
    createAlert,
    createClosableAlert,
} from '../../scripts/alerts/alert.js';

vi.mock('../../scripts/i18n.js', () => {
    const translation = {
        pinsPolling: 'Polling...',
        pinsTitleSecurityWarning: 'Security Warning',
        pinsTextSecurityWarning:
            'The Name Service indexer returned a state root that has never been registered on the anchor contract.',
        pinsTitleSynced: 'Synced',
        pinsTextSynced: 'Synced success.',
        pinsTitleNotFound: 'Not Found',
        pinsTextNotFound: 'Not found.',
        pinsTitleSyncDelay: 'Sync Delay',
        pinsTitleSyncDelayNotFound: 'Sync Delay Not Found',
        pinsTextSyncDelayNotFound: 'Sync delay not found.',
        pinsTitleIndexerError: 'Indexer Error',
        pinsTextIndexerError: 'Error: {errMsg}',
        pinsBtnClose: 'Close',
        pinsBtnSend: 'Send',
        pinsBtnCancel: 'Cancel',
        pinsBtnRetry: 'Retry',
        pinsTextSyncDelayWait: 'Syncing, sending is paused.',
        pinsTitleRpcError: 'Blockchain Connection Error',
        pinsTextRpcError: 'RPC problem: {errMsg}',
        name: 'Name',
        address: 'Address',
        amount: 'Amount',
    };
    const ALERTS = {
        PINS_RESOLVING_DOMAIN: 'Resolving {strDomain}...',
        PINS_CHECKING_SYNC: 'Checking sync...',
        PINS_SYNCING_WAIT: 'Syncing...',
        PINS_SYNC_FAILED: 'Sync failed: {errMsg}',
        PINS_RESOLVE_FAILED: 'Resolve failed: {errMsg}',
        PINS_INVALID_FORMAT: 'Invalid format',
        PINS_INCOMPLETE_METADATA: 'Incomplete metadata',
        PINS_INVALID_PROOF: 'Invalid proof',
        PINS_INVALID_SHIELD: 'Invalid shield',
        PINS_NAME_MISMATCH: 'Name mismatch',
        PINS_NOT_FOUND: 'Not found',
        PINS_ADDRESS_CHANGED: '{strDomain} moved',
        PINS_CONTACT_COLLISION: '{strName} collides',
    };
    return {
        translation,
        ALERTS,
        tr: (message, variables) => {
            if (!message) return '';
            variables.forEach((element) => {
                message = message.replaceAll(
                    '{' + Object.keys(element)[0] + '}',
                    Object.values(element)[0]
                );
            });
            return message;
        },
        switchTranslation: vi.fn(),
    };
});

/**
 * A real answer from the production indexer for `alexxiy.pivx`, kept verbatim.
 *
 * This proof folds to `smt_root`, and that root was the anchor contract's
 * `currentRoot()` when it was captured - so the vector pins the wallet to the
 * protocol as actually deployed, not to whatever the wallet happens to compute.
 * Regenerate it with:
 *   curl -s -X POST -H 'Content-Type: application/json' -d '{}' \
 *        https://indexer.pivx.name/v1.0/resolve/alexxiy.pivx
 */
const LIVE_VECTOR = Object.freeze({
    domain_name: 'alexxiy.pivx',
    target_address:
        'ps19wd4eft4mw2mlwad6tjrny5hlvtdxymatu2e3dge7jr6scqask0llvdsa3xhx06499vmzymatxr',
    owner_pubkey:
        '3757ee1a8b3f10353ca6edd47b66920392b02e323dca3f3edddb5de142079a53',
    price: 0,
    nonce: 1786604913,
    smt_root:
        '1bebbbf778b7c70d7f28af955d28c65165d9b52e2128efdcebdd6f695a773ceb',
    merkle_proof: [
        'ce7b953670410e6a28bb669dbf36c92b3a1d3be8ad1053b9dfcf730049fe57ff',
        '8de7514f0d3a019a6cb017618c3c8f2774aaf063b47a0ed1fcc52e4a7080fa71',
        '654cb451e501cb7461dd845404e9c5f7b5fc6f13b6c4763bd6c01f43d1ec50f9',
    ],
    proof_depth: 3,
    proof_terminal: 'Occupied',
});

/** A copy of the live vector with one field changed. */
const tamper = (changes) => ({ ...LIVE_VECTOR, ...changes });

describe('verifySmtProof (compact SMT)', () => {
    it('verifies a real proof from the production indexer', () => {
        expect(
            verifySmtProof(LIVE_VECTOR, 'alexxiy.pivx', LIVE_VECTOR.smt_root)
        ).toBe(true);
    });

    it('accepts the name in any case, normalising once', () => {
        expect(
            verifySmtProof(LIVE_VECTOR, 'ALEXXIY.pivx', LIVE_VECTOR.smt_root)
        ).toBe(true);
        expect(
            verifySmtProof(LIVE_VECTOR, 'Alexxiy.PIVX', LIVE_VECTOR.smt_root)
        ).toBe(true);
    });

    it('rejects a proof folded for a different name', () => {
        expect(
            verifySmtProof(LIVE_VECTOR, 'alexxiy.safe', LIVE_VECTOR.smt_root)
        ).toBe(false);
        expect(
            verifySmtProof(LIVE_VECTOR, 'alexxi.pivx', LIVE_VECTOR.smt_root)
        ).toBe(false);
    });

    // Every field below is inside the leaf preimage, so changing any one of them
    // must break the fold. This is what stops a hostile indexer swapping the payout
    // address while keeping a proof that looks well formed.
    it('rejects a tampered target address', () => {
        expect(
            verifySmtProof(
                tamper({
                    target_address:
                        'ps19wd4eft4mw2mlwad6tjrny5hlvtdxymatu2e3dge7jr6scqask0llvdsa3xhx06499vmzymatxq',
                }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('rejects a tampered owner pubkey', () => {
        expect(
            verifySmtProof(
                tamper({
                    owner_pubkey:
                        '0000ee1a8b3f10353ca6edd47b66920392b02e323dca3f3edddb5de142079a53',
                }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('rejects a tampered price or nonce', () => {
        expect(
            verifySmtProof(
                tamper({ price: 1 }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        expect(
            verifySmtProof(
                tamper({ nonce: 1786604914 }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('rejects a tampered sibling', () => {
        const bad = tamper({
            merkle_proof: [
                '0000953670410e6a28bb669dbf36c92b3a1d3be8ad1053b9dfcf730049fe57ff',
                LIVE_VECTOR.merkle_proof[1],
            ],
        });
        expect(verifySmtProof(bad, 'alexxiy.pivx', LIVE_VECTOR.smt_root)).toBe(
            false
        );
    });

    it('rejects a tampered root', () => {
        expect(
            verifySmtProof(
                tamper({
                    smt_root:
                        '0000bbf778b7c70d7f28af955d28c65165d9b52e2128efdcebdd6f695a773ceb',
                }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    // The depth is self authenticating: folding a different number of times gives a
    // different root. These cases make sure we reject rather than fold blindly.
    it('rejects when proof_depth disagrees with the sibling count', () => {
        expect(
            verifySmtProof(
                tamper({ proof_depth: 2 }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        expect(
            verifySmtProof(
                tamper({ proof_depth: 4 }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('rejects a depth beyond the 128-bit key length', () => {
        expect(
            verifySmtProof(
                tamper({
                    proof_depth: 129,
                    merkle_proof: Array(129).fill(LIVE_VECTOR.merkle_proof[0]),
                }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    // A resolve is an inclusion proof. Absence is reported as "Domain not found",
    // so anything else here is malformed and must not be folded.
    it('rejects any terminal other than Occupied', () => {
        for (const terminal of ['Vacant', 'Blocked', '', undefined]) {
            expect(
                verifySmtProof(
                    tamper({ proof_terminal: terminal }),
                    'alexxiy.pivx',
                    LIVE_VECTOR.smt_root
                )
            ).toBe(false);
        }
    });

    it('rejects incomplete or malformed responses', () => {
        expect(verifySmtProof(null, 'alexxiy.pivx', LIVE_VECTOR.smt_root)).toBe(
            false
        );
        expect(verifySmtProof(LIVE_VECTOR, '', LIVE_VECTOR.smt_root)).toBe(
            false
        );
        expect(
            verifySmtProof(
                tamper({ target_address: '' }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        expect(
            verifySmtProof(
                tamper({ smt_root: '' }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        expect(
            verifySmtProof(
                tamper({ merkle_proof: 'not-an-array' }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        // a sibling that is not 32 bytes must be refused, not silently padded
        expect(
            verifySmtProof(
                tamper({ merkle_proof: ['abcd', LIVE_VECTOR.merkle_proof[1]] }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('handles a u64 price beyond Number.MAX_SAFE_INTEGER without losing precision', () => {
        // Both are > 2^53, and differ only in the low bits: as Numbers they would be
        // the same value, so a Number-based implementation would hash them alike.
        const a = tamper({ price: '18446744073709551615' });
        const b = tamper({ price: '18446744073709551614' });
        expect(verifySmtProof(a, 'alexxiy.pivx', LIVE_VECTOR.smt_root)).toBe(
            false
        );
        expect(verifySmtProof(b, 'alexxiy.pivx', LIVE_VECTOR.smt_root)).toBe(
            false
        );
        // and neither throws
    });

    // Guard against silently regressing to the old dense tree. Every leaf used to
    // sit at depth 128 with a 128-entry proof; if that shape ever comes back, the
    // wallet is talking to a protocol that no longer exists.
    it('does not accept an old-format 128-level proof', () => {
        const dense = tamper({
            proof_depth: 128,
            merkle_proof: Array(128).fill(
                '0000000000000000000000000000000000000000000000000000000000000000'
            ),
        });
        expect(
            verifySmtProof(dense, 'alexxiy.pivx', LIVE_VECTOR.smt_root)
        ).toBe(false);
        expect(LIVE_VECTOR.merkle_proof.length).not.toBe(128);
    });
});

/**
 * The leaf preimage is a bare concatenation with no length prefixes - that layout is
 * fixed by pins_core and the SP1 circuit, so it cannot be changed from the wallet side.
 * What the wallet can do is refuse any response whose fields are not exactly the shape
 * the protocol defines, which pins every boundary in the preimage and leaves nothing to
 * slide. These are the slides that would otherwise exist.
 */
describe('leaf preimage malleability', () => {
    const hex = (str) => Buffer.from(str, 'utf8').toString('hex');

    // Buffer.from(x, 'hex') stops at the first character it cannot decode and keeps
    // what it had, so 'ZZZZ' hashes identically to no suffix at all. The 64-character
    // rule refuses it before it reaches the hash.
    it('rejects an owner pubkey with undecodable trailing characters', () => {
        expect(
            verifySmtProof(
                tamper({ owner_pubkey: LIVE_VECTOR.owner_pubkey + 'ZZZZ' }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    // Move k bytes of the target address into the tail of the pubkey and the leaf hash
    // is unchanged: same bytes, different boundary. The forged target is a suffix of
    // the real one, and a 32-byte pubkey is the only pubkey accepted.
    it('rejects a pubkey that has swallowed the head of the target address', () => {
        for (const k of [1, 5, 20, 40]) {
            const slid = tamper({
                owner_pubkey:
                    LIVE_VECTOR.owner_pubkey +
                    hex(LIVE_VECTOR.target_address.slice(0, k)),
                target_address: LIVE_VECTOR.target_address.slice(k),
            });
            expect(
                verifySmtProof(slid, 'alexxiy.pivx', LIVE_VECTOR.smt_root)
            ).toBe(false);
        }
    });

    // The other end of the same slide: a short pubkey pushes bytes into the target,
    // which then starts with raw pubkey bytes.
    it('rejects a pubkey shorter than 32 bytes', () => {
        expect(
            verifySmtProof(
                tamper({ owner_pubkey: LIVE_VECTOR.owner_pubkey.slice(0, 60) }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    // The "prefix collision": hash_leaf('alexxiy.pivxfoo.safe', P, T, ...) is byte for
    // byte hash_leaf('alexxiy.pivx', hex('foo.safe') + P, T, ...). It needs a name with
    // a dot inside the label to exist in the tree, which the registry refuses at every
    // layer - but the wallet does not take that on trust either.
    it('rejects a domain/pubkey boundary slide', () => {
        expect(
            verifySmtProof(
                tamper({
                    owner_pubkey: hex('foo.safe') + LIVE_VECTOR.owner_pubkey,
                }),
                'alexxiy.pivx',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    // Names that could carry such a collision are not names at all.
    it('refuses to verify anything that is not a registrable name', () => {
        expect(
            verifySmtProof(
                LIVE_VECTOR,
                'alexxiy.pivxfoo.safe',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
        expect(
            verifySmtProof(LIVE_VECTOR, 'alexxiy..pivx', LIVE_VECTOR.smt_root)
        ).toBe(false);
    });

    // pins_core's rules make the valid-name set prefix free: exactly one dot, and
    // everything after it must be a whole zone. Extend any valid name by any byte and
    // the zone stops being a zone. Without that property the domain boundary could
    // slide even with every length pinned, so it is asserted, not assumed.
    it('no valid name is a byte prefix of another valid name', () => {
        const names = [];
        for (const tld of PIVXNameTLDs) {
            for (const label of ['a', 'ab', 'a-b', 'z0', 'alexxiy']) {
                names.push(label + tld);
            }
        }
        for (const short of names) {
            // every one-to-three character extension of a valid name
            const chars = 'abz0-.'.split('');
            let arrExt = [''];
            for (let depth = 0; depth < 3; depth++) {
                arrExt = arrExt.flatMap((e) => chars.map((c) => e + c));
                for (const ext of arrExt) {
                    expect(isPIVXName(short + ext)).toBe(false);
                }
            }
        }
    });

    // price and nonce are the two fixed-width fields; anything that is not an exact
    // u64 would have to be coerced, and a coercion is a second spelling of a value.
    it('rejects a price or nonce that is not an exact u64', () => {
        for (const bad of [
            -1,
            1.5,
            '0x10',
            '1e3',
            ' 1',
            '18446744073709551616',
            true,
            {},
        ]) {
            expect(
                verifySmtProof(
                    tamper({ nonce: bad }),
                    'alexxiy.pivx',
                    LIVE_VECTOR.smt_root
                )
            ).toBe(false);
        }
    });

    it('rejects a target address that is not exactly one Sapling address', () => {
        for (const bad of [
            LIVE_VECTOR.target_address.slice(0, -1),
            LIVE_VECTOR.target_address + 'a',
            LIVE_VECTOR.target_address.toUpperCase(),
            'ps1' + 'q'.repeat(75),
        ]) {
            expect(isStrictShieldAddress(bad)).toBe(false);
        }
        expect(isStrictShieldAddress(LIVE_VECTOR.target_address)).toBe(true);
    });
});

/**
 * The proof must fold to a root the chain vouched for. Folding to the root the same
 * response declared proves only that the response agrees with itself.
 */
describe('trusted root binding', () => {
    it('refuses to verify without a root from the caller', () => {
        expect(verifySmtProof(LIVE_VECTOR, 'alexxiy.pivx')).toBe(false);
        expect(verifySmtProof(LIVE_VECTOR, 'alexxiy.pivx', '')).toBe(false);
        expect(verifySmtProof(LIVE_VECTOR, 'alexxiy.pivx', 'not-a-root')).toBe(
            false
        );
    });

    it('rejects a proof that folds to a different root than the chain reports', () => {
        expect(
            verifySmtProof(
                LIVE_VECTOR,
                'alexxiy.pivx',
                '1111111111111111111111111111111111111111111111111111111111111111'
            )
        ).toBe(false);
    });

    /**
     * The vacuous proof: depth 0, with `smt_root` set to the response's own leaf hash,
     * so it folds to its own declared root. Internally consistent, and worth nothing.
     *
     * `c1427a59...` is SHA256(0x00 || 'alexxiy.pivx' || pubkey || target || 0u64 ||
     * 1786604913u64) - the live vector's own leaf. Against the chain's root it is
     * refused, which is the only judgement that matters: the root is no longer
     * something the response gets to supply.
     */
    it('rejects a self-rooted depth-0 proof against the chain root', () => {
        const selfRooted = tamper({
            merkle_proof: [],
            proof_depth: 0,
            smt_root:
                'c1427a5973e100b84eca8f44ed1e3a7be635e46a3154f076e3861e59fcbde16e',
        });
        // it really is self-consistent: fold of nothing is the leaf itself
        expect(
            verifySmtProof(selfRooted, 'alexxiy.pivx', selfRooted.smt_root)
        ).toBe(true);
        // ...and that buys it nothing, because the root comes from the contract
        expect(
            verifySmtProof(selfRooted, 'alexxiy.pivx', LIVE_VECTOR.smt_root)
        ).toBe(false);
    });

    it('accepts the 0x-prefixed spelling of the same root', () => {
        expect(
            verifySmtProof(
                LIVE_VECTOR,
                'alexxiy.pivx',
                '0x' + LIVE_VECTOR.smt_root.toUpperCase()
            )
        ).toBe(true);
    });
});

describe('isPIVXName', () => {
    it.each([
        // supported TLDs, any case
        ['alex.pivx', true],
        ['richard.secure', true],
        ['hello-world.safe', true],
        ['pivx-123.private', true],
        ['ALEX.pivx', true],
        // not a name at all, or not one of ours
        ['alex.pivx2', false],
        ['alex.pivx.name', false],
        ['alex', false],
        ['', false],
        [null, false],
        [undefined, false],
        // hyphens: inside only, never doubled
        ['-alex.pivx', false],
        ['alex-.pivx', false],
        ['al--ex.pivx', false],
        ['al-ex.pivx', true],
        // length: a non-empty label, 64 characters in all
        ['.pivx', false],
        ['a.pivx', true],
        ['a'.repeat(59) + '.pivx', true],
        ['a'.repeat(60) + '.pivx', false],
        // characters: lowercase alphanumerics and hyphens
        ['al_ex.pivx', false],
        ['alex!.pivx', false],
        ['alex space.pivx', false],
    ])('isPIVXName(%j) is %s', (strName, fExpected) => {
        expect(isPIVXName(strName)).toBe(fExpected);
    });
});

describe('isPIVXNameTLD', () => {
    it.each([
        ['alex.pivx', true],
        ['test.secure', true],
        ['check.safe', true],
        ['secret.private', true],
        ['upper.PIVX', true],
        ['alex.pivx2', false],
        ['alex.name', false],
        ['alex', false],
        ['', false],
    ])('isPIVXNameTLD(%j) is %s', (strName, fExpected) => {
        expect(isPIVXNameTLD(strName)).toBe(fExpected);
    });
});

describe('EVM and Indexer Root Checking', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reads the chain root with currentRoot() straight from the browser', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                result: '0x7fbe8f29f7278db7a665de4f1255927b40b648b43e55b34bb3e0405edb5e7d12',
            }),
        });

        const root = await fetchEVMRoot(
            ['https://rpc-url', 'https://rpc-url-2'],
            '0xcontract'
        );
        expect(root).toBe(
            '7fbe8f29f7278db7a665de4f1255927b40b648b43e55b34bb3e0405edb5e7d12'
        );
        expect(fetch).toHaveBeenCalledWith(
            'https://rpc-url',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [
                        {
                            to: '0xcontract',
                            data: '0xfdab463d', // currentRoot()
                        },
                        'latest',
                    ],
                    id: 1,
                }),
            })
        );
    });

    // getRoot, never info: info makes the indexer call the anchor contract server
    // side, so every user's request would go out through the indexer's single IP.
    it('reads the indexer root from /v1.0/getRoot, not /v1.0/info', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                response:
                    '7FBE8F29F7278DB7A665DE4F1255927B40B648B43E55B34BB3E0405EDB5E7D12',
            }),
        });

        const root = await fetchIndexerRoot('https://indexer.pivx.name/');
        expect(root).toBe(
            '7fbe8f29f7278db7a665de4f1255927b40b648b43e55b34bb3e0405edb5e7d12'
        );
        expect(fetch).toHaveBeenCalledWith(
            'https://indexer.pivx.name/v1.0/getRoot',
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
    });

    /**
     * Checked where it arrives. Passed on, a malformed root would become malformed
     * `isRootValid` calldata, the endpoints would refuse it, and the RPC layer would
     * take the blame for the indexer's answer.
     */
    it('rejects a malformed root from the indexer', async () => {
        for (const strBad of ['zz'.repeat(32), 'ab'.repeat(33), '1234', '']) {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: strBad }),
            });
            await expect(
                fetchIndexerRoot('https://indexer.pivx.name')
            ).rejects.toThrow(/malformed root|Invalid response/);
        }
        expect(parseIndexerRoot('0x' + 'AB'.repeat(32))).toBe('ab'.repeat(32));
    });

    it('rejects a getRoot answer that is not a bare string', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            // the old /v1.0/info shape must not be accepted here
            json: async () => ({ response: { indexer_smt_root: 'deadbeef' } }),
        });
        await expect(
            fetchIndexerRoot('https://indexer.pivx.name')
        ).rejects.toThrow(/Invalid response/);
    });

    it('asks the contract with isRootValid(bytes32) and reads a single bool', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                result: '0x0000000000000000000000000000000000000000000000000000000000000001',
            }),
        });

        const valid = await verifyRootValidityOnContract(
            ['https://rpc-url', 'https://rpc-url-2'],
            '0xcontract',
            LIVE_VECTOR.smt_root
        );
        expect(valid).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
            'https://rpc-url',
            expect.objectContaining({
                body: expect.stringContaining(
                    '0x30ef41b4' + LIVE_VECTOR.smt_root
                ),
            })
        );
    });

    it('returns false for a root the contract has never accepted', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                result: '0x0000000000000000000000000000000000000000000000000000000000000000',
            }),
        });
        expect(
            await verifyRootValidityOnContract(
                ['https://rpc-url', 'https://rpc-url-2'],
                '0xcontract',
                LIVE_VECTOR.smt_root
            )
        ).toBe(false);
    });

    it('reports a silent indexer as unreachable, which is worth waiting out', async () => {
        vi.useFakeTimers();
        try {
            fetch.mockImplementation(
                (url, { signal }) =>
                    new Promise((_, reject) =>
                        signal.addEventListener('abort', () =>
                            reject(new DOMException('aborted', 'AbortError'))
                        )
                    )
            );
            const p = fetchIndexerRoot('https://indexer.pivx.name').catch(
                (e) => e
            );
            await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);
            const e = await p;
            expect(e).toBeInstanceOf(IndexerUnreachableError);
            expect(e.message).toMatch(/within 10s/);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('PiNS.vue Component', () => {
    let nAlertsBefore = 0;

    beforeEach(async () => {
        vi.useFakeTimers();
        nAlertsBefore = AlertController.getInstance().getAlerts().length;
        vi.stubGlobal('fetch', vi.fn());
        vi.spyOn(Database, 'getInstance').mockResolvedValue({
            getSettings: async () => ({
                nameResolvingApi: 'https://indexer.pivx.name',
                // deliberately not one of the endpoints chain params declares: a stored
                // RPC that has fallen out of the list must not lead, or take the
                // endpoint list - and the quorum with it - down to one
                evmRpc: 'https://stale-rpc.example',
                evmNetworkId: 56,
            }),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    /**
     * Route mocks by URL and calldata rather than by call order: the component
     * starts the chain read and the resolve concurrently, so ordering is not a
     * stable thing to assert on.
     */
    function routeFetch({ resolve, indexerRoot, evmRoot, rootValid }) {
        fetch.mockImplementation(async (url, opts) => {
            const body = opts?.body ? JSON.parse(opts.body) : null;
            if (String(url).includes('/v1.0/resolve/')) {
                return { ok: true, json: async () => resolve };
            }
            if (String(url).includes('/v1.0/getRoot')) {
                return {
                    ok: true,
                    json: async () => ({ response: indexerRoot }),
                };
            }
            const data = body?.params?.[0]?.data ?? '';
            if (data.startsWith('0xfdab463d')) {
                return {
                    ok: true,
                    json: async () => ({ result: '0x' + evmRoot }),
                };
            }
            if (data.startsWith('0x30ef41b4')) {
                return {
                    ok: true,
                    json: async () => ({
                        result:
                            '0x' + (rootValid ? '1' : '0').padStart(64, '0'),
                    }),
                };
            }
            throw new Error('unexpected fetch: ' + url + ' ' + data);
        });
    }

    /** Alerts raised by this test only; the controller is a process-wide singleton. */
    function newAlerts() {
        return AlertController.getInstance()
            .getAlerts()
            .slice(nAlertsBefore)
            .map((a) => String(a.message));
    }

    const OTHER_ROOT =
        '1111000000000000000000000000000000000000000000000000000000000000';

    it('sends when the indexer and the contract agree on the root', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.emitted('send')?.[0]?.[0]?.address).toBe(
            LIVE_VECTOR.target_address
        );
    });

    it('shows the security warning and stops polling when the indexer root is unknown to the contract', async () => {
        routeFetch({
            resolve: { error: { error_message: 'Domain not found' } },
            indexerRoot:
                '2222000000000000000000000000000000000000000000000000000000000000',
            evmRoot: OTHER_ROOT,
            rootValid: false,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.vm.syncModalState).toBe('invalid_root');
        expect(wrapper.vm.syncModalTitle).toBe('Security Warning');
        // no send may be armed once the root is rejected
        expect(wrapper.vm.pendingSendParams).toBe(null);
    });

    /**
     * A root the contract accepted but has since moved past. The indexer is behind, and
     * the only thing on offer is waiting: there is no button that sends against a root
     * the chain no longer attests to, whether it is one checkpoint old or a year old.
     */
    it('offers no way to send while the indexer is behind', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.vm.syncModalState).toBe('warning');
        expect(wrapper.vm.syncModalIsPolling).toBe(true);
        expect(wrapper.emitted('send')).toBeUndefined();
        // the confirm button is bound to the synced state only
        const buttons = wrapper.findAll('button');
        expect(buttons.some((b) => b.text() === 'Send anyway')).toBe(false);
    });

    it('flips to synced once the indexer catches up, and sends on confirmation', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalState).toBe('warning');

        // the indexer catches up: the chain now reports the root it was serving
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });
        await vi.advanceTimersByTimeAsync(15000);
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.vm.syncModalState).toBe('synced');
        // still nothing sent without the user saying so
        expect(wrapper.emitted('send')).toBeUndefined();

        wrapper.vm.closeSyncModal(true);
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.emitted('send')?.[0]?.[0]?.address).toBe(
            LIVE_VECTOR.target_address
        );
    });

    /**
     * Confirming re-derives everything. If the chain moved while the dialog sat open,
     * the confirmation must not go through on the strength of the check that put the
     * dialog there.
     */
    it('re-checks the chain on confirmation rather than reusing the earlier check', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        // reached the synced state through the happy path and already sent once
        expect(wrapper.emitted('send')).toHaveLength(1);

        // now arm a pending send by hand and move the chain underneath it
        wrapper.vm.pendingSendParams = {
            amount: 1,
            useShieldInputs: false,
            memo: '',
            originalDomain: 'alexxiy.pivx',
        };
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });

        wrapper.vm.closeSyncModal(true);
        await vi.runOnlyPendingTimersAsync();

        // no second send: the roots no longer agree, so it is back to waiting
        expect(wrapper.emitted('send')).toHaveLength(1);
        expect(wrapper.vm.syncModalState).toBe('warning');
    });

    /**
     * The indexer picks the text of its own error messages, and alert bodies are
     * rendered with v-html. Anything it sends has to arrive as text, not as markup.
     */
    it('escapes indexer-supplied error text before it reaches an alert', async () => {
        const strPayload =
            '<img src=x onerror="window.__pwned=1">' +
            '<script>alert(1)</script>';
        routeFetch({
            resolve: { error: { error_message: strPayload } },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        const strAll = newAlerts().join(' ');
        expect(strAll).toContain('Resolve failed');
        // the payload is present, but only as text
        expect(strAll).not.toContain('<img');
        expect(strAll).not.toContain('<script');
        expect(strAll).toContain('&lt;img');
    });

    /**
     * Both of these used to read `translation.pinsCheckingSync` and
     * `translation.pinsSyncingWait`, which exist under ALERTS and nowhere else, so the
     * user was shown the word "undefined".
     */
    it('shows real strings on the retry path', async () => {
        routeFetch({
            resolve: { error: { error_message: 'Domain not found' } },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalState).toBe('not_found');

        await wrapper.vm.retrySyncModalResolution();
        await vi.runOnlyPendingTimersAsync();

        const arrMessages = newAlerts();
        expect(arrMessages.some((m) => m.includes('undefined'))).toBe(false);
        expect(arrMessages).toContain('Checking sync...');
    });

    /** Puts the component on the "name not found yet" dialog, where Retry lives. */
    async function mountOnNotFoundDialog() {
        routeFetch({
            resolve: { error: { error_message: 'Domain not found' } },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });
        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalState).toBe('not_found');
        return wrapper;
    }

    /**
     * Retry is a tick of the poller on demand, and the poller never spends. The button
     * says Retry, so a name that verifies on that click lands on the synced dialog and
     * waits for Send.
     */
    it('does not spend on Retry, even when the name now verifies', async () => {
        const wrapper = await mountOnNotFoundDialog();

        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });
        await wrapper.vm.retrySyncModalResolution();
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.emitted('send')).toBeUndefined();
        expect(wrapper.vm.syncModalState).toBe('synced');

        wrapper.vm.closeSyncModal(true);
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.emitted('send')?.[0]?.[0]?.address).toBe(
            LIVE_VECTOR.target_address
        );
    });

    /**
     * The indexer chooses its own error text. Wording that looks like an RPC fault, or
     * like a dropped connection, must not move the blame or keep the poller going.
     */
    it('does not let indexer error text pick the component to blame', async () => {
        for (const strMsg of [
            'EVM RPC endpoints disagree',
            'Failed to fetch',
            'NetworkError, timeout, connection reset',
        ]) {
            const wrapper = await mountOnNotFoundDialog();
            routeFetch({
                resolve: { error: { error_message: strMsg } },
                indexerRoot: LIVE_VECTOR.smt_root,
                evmRoot: LIVE_VECTOR.smt_root,
                rootValid: true,
            });
            await wrapper.vm.retrySyncModalResolution();
            await vi.runOnlyPendingTimersAsync();

            expect(wrapper.vm.syncModalTitle).toBe('Indexer Error');
            expect(wrapper.vm.syncModalIsPolling).toBe(false);
            expect(wrapper.vm.pendingSendParams).toBe(null);
            wrapper.unmount();
        }
    });

    it('waits out an indexer that cannot be reached at all', async () => {
        const wrapper = await mountOnNotFoundDialog();
        fetch.mockImplementation(async (url) => {
            if (String(url).includes('indexer.pivx.name')) {
                throw new TypeError('Failed to fetch');
            }
            return {
                ok: true,
                json: async () => ({ result: '0x' + OTHER_ROOT }),
            };
        });
        await wrapper.vm.retrySyncModalResolution();
        await vi.runOnlyPendingTimersAsync();

        // still the waiting dialog, with the failure reported rather than made fatal
        expect(wrapper.vm.syncModalState).toBe('not_found');
        expect(wrapper.vm.pendingSendParams).not.toBe(null);
        expect(newAlerts().some((m) => m.startsWith('Sync failed:'))).toBe(
            true
        );
    });

    // The field is attacker-sized as well as attacker-chosen, on both of its routes out:
    // the alert after a first attempt, and the dialog after a retry.
    it('caps the length of an indexer-supplied error, in alerts and in the dialog', async () => {
        const huge = {
            resolve: { error: { error_message: 'A'.repeat(5000) } },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        };
        routeFetch(huge);
        const first = mount(PiNS);
        await first.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        expect(newAlerts().join(' ').length).toBeLessThan(1000);

        const wrapper = await mountOnNotFoundDialog();
        routeFetch(huge);
        await wrapper.vm.retrySyncModalResolution();
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalTitle).toBe('Indexer Error');
        expect(wrapper.vm.syncModalText.length).toBeLessThan(1000);
    });

    /**
     * `send()` does not await the resolve and nothing closes the menu until it is over,
     * so a second click used to start a second resolution - and, once the first
     * transaction released its lock, a second payment.
     */
    it('ignores a second send while one is still resolving', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        const p1 = wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        const p2 = wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await Promise.all([p1, p2]);
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.emitted('send')).toHaveLength(1);
        // the second click is ignored outright - it never even reaches the indexer.
        // (Were it to run, the attempt counter would still let only one of the two pay.)
        const nResolves = fetch.mock.calls.filter((c) =>
            String(c[0]).includes('/v1.0/resolve/')
        ).length;
        expect(nResolves).toBe(1);

        // and a later, separate send is not blocked by the first
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        expect(wrapper.emitted('send')).toHaveLength(2);
    });

    it('does not pay for an attempt cancelled mid-resolve', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        const p = wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        wrapper.vm.cancel(); // the menu closed, or the wallet changed
        await p;
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.emitted('send')).toBeUndefined();
        expect(wrapper.vm.showSyncModal).toBe(false);
    });

    it('drops a waiting dialog on cancel, poller included', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalIsPolling).toBe(true);

        wrapper.vm.cancel();
        // the indexer catches up after the user has left
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });
        await vi.advanceTimersByTimeAsync(15000);
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.vm.showSyncModal).toBe(false);
        expect(wrapper.vm.syncModalIsPolling).toBe(false);
        expect(wrapper.emitted('send')).toBeUndefined();
    });

    /** Reaches the synced dialog the way a user does: wait, then the indexer catches up. */
    async function mountOnSyncedDialog() {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: OTHER_ROOT,
            rootValid: true,
        });
        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1.5, false, '');
        await vi.runOnlyPendingTimersAsync();
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });
        await vi.advanceTimersByTimeAsync(15000);
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.vm.syncModalState).toBe('synced');
        return wrapper;
    }

    it('shows the name, the verified address and the amount it is asking about', async () => {
        const wrapper = await mountOnSyncedDialog();
        const strText = wrapper.text();
        expect(strText).toContain('alexxiy.pivx');
        expect(strText).toContain(LIVE_VECTOR.target_address);
        expect(strText).toContain('1.5');
    });

    /**
     * What the user confirmed is what gets paid. If the record moved while the dialog
     * sat open, the new address is shown and confirmed again rather than paid unseen.
     */
    it('does not pay an address other than the one the dialog showed', async () => {
        const wrapper = await mountOnSyncedDialog();
        wrapper.vm.pendingSendParams = {
            ...wrapper.vm.pendingSendParams,
            strAddress: 'ps1-the-address-the-user-was-shown',
        };

        wrapper.vm.closeSyncModal(true);
        await vi.runOnlyPendingTimersAsync();

        expect(wrapper.emitted('send')).toBeUndefined();
        expect(wrapper.vm.syncModalState).toBe('synced');
        expect(wrapper.vm.pendingSendParams.strAddress).toBe(
            LIVE_VECTOR.target_address
        );
        expect(newAlerts()).toContain('alexxiy.pivx moved');

        // confirming what is now on screen goes through
        wrapper.vm.closeSyncModal(true);
        await vi.runOnlyPendingTimersAsync();
        expect(wrapper.emitted('send')?.[0]?.[0]?.address).toBe(
            LIVE_VECTOR.target_address
        );
    });

    it('never puts a malformed indexer root into contract calldata', async () => {
        routeFetch({
            resolve: {
                response: { ...LIVE_VECTOR, smt_root: 'zz'.repeat(40) },
            },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        const arrCalldata = fetch.mock.calls.map(
            (c) => JSON.parse(c[1]?.body || '{}')?.params?.[0]?.data || ''
        );
        expect(arrCalldata.some((d) => d.startsWith('0x30ef41b4'))).toBe(false);
        expect(newAlerts().join(' ')).toContain('malformed root');
        expect(wrapper.emitted('send')).toBeUndefined();
    });

    // The contract address must come from chain params, never from the settings row:
    // `setSettings` writes the whole object back, so a stored copy would outlive any
    // redeployment.
    it('reads the contract address from chain params, not from stored settings', async () => {
        routeFetch({
            resolve: { response: LIVE_VECTOR },
            indexerRoot: LIVE_VECTOR.smt_root,
            evmRoot: LIVE_VECTOR.smt_root,
            rootValid: true,
        });

        const wrapper = mount(PiNS);
        await wrapper.vm.resolveAndVerify('alexxiy.pivx', 1, false, '');
        await vi.runOnlyPendingTimersAsync();

        const strExpected = getEVMNetwork(56).contractAddress;
        const arrTargets = fetch.mock.calls
            .filter((c) => c[1]?.body?.includes('eth_call'))
            .map((c) => JSON.parse(c[1].body).params[0].to);
        expect(arrTargets.length).toBeGreaterThan(0);
        for (const strTo of arrTargets) expect(strTo).toBe(strExpected);
    });
});

describe('endpoint selection', () => {
    it('keeps a stored indexer only while chain params still declare it', () => {
        const strDeclared = 'https://indexer.pivx.name';
        expect(getNameResolverUrl(strDeclared)).toBe(strDeclared);
        // a row written before the indexer moved must not pin the old host forever
        expect(getNameResolverUrl('https://old-indexer.example')).toBe(
            strDeclared
        );
        expect(getNameResolverUrl(undefined)).toBe(strDeclared);
    });

    it('keeps the configured endpoint first while it is still declared', () => {
        const net = getEVMNetwork(56);
        const arrList = getEvmRpcList(net.rpcs[2], net);
        expect(arrList[0]).toBe(net.rpcs[2]);
        expect(arrList).toHaveLength(net.rpcs.length);
    });

    it('drops a stored endpoint that chain params no longer declare', () => {
        const net = getEVMNetwork(56);
        const arrList = getEvmRpcList('https://stale-rpc.example', net);
        expect(arrList).toEqual(net.rpcs);
    });

    // A stale chain id used to collapse the list to the single stored RPC, taking the
    // quorum down to one without saying anything.
    it('falls back to a configured network for an unknown chain id', () => {
        expect(getEVMNetwork(999999)).toBe(getEVMNetwork(56));
        expect(
            getEvmRpcList('https://stale-rpc.example', getEVMNetwork(999999))
        ).not.toHaveLength(0);
    });

    it('ships enough independent endpoints to reach the quorum', () => {
        const net = getEVMNetwork(56);
        expect(net.rpcs.length).toBeGreaterThanOrEqual(MIN_RPC_AGREEMENT);
        // distinct operators, not four spellings of one
        const arrHosts = net.rpcs.map((u) => {
            const strHost = new URL(u).hostname.split('.');
            return strHost.slice(-2).join('.');
        });
        expect(new Set(arrHosts).size).toBeGreaterThanOrEqual(
            MIN_RPC_AGREEMENT
        );
    });
});

/**
 * A single endpoint answering is failover, not agreement. These cover the part the
 * quorum exists for: one compromised or MITM'd endpoint, on its own, decides nothing.
 * Every call here runs at `evmCall`'s default, which is the quorum production uses.
 */
describe('EVM RPC quorum', () => {
    const RPCS = ['https://rpc-a', 'https://rpc-b', 'https://rpc-c'];
    const answer = (word) => ({
        ok: true,
        json: async () => ({ result: '0x' + word.padStart(64, '0') }),
    });

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns as soon as two endpoints say the same thing', async () => {
        fetch.mockResolvedValue(answer('1'));
        const res = await evmCall(RPCS, '0xcontract', '0xfdab463d');
        expect(res).toBe('0x' + '1'.padStart(64, '0'));
        expect(fetch).toHaveBeenCalledTimes(MIN_RPC_AGREEMENT);
    });

    it('a lone dissenting endpoint cannot decide the answer', async () => {
        // rpc-a is the hostile one: it invents a root, the honest two agree on another
        fetch
            .mockResolvedValueOnce(answer('dead'))
            .mockResolvedValueOnce(answer('beef'))
            .mockResolvedValueOnce(answer('beef'));
        const res = await evmCall(RPCS, '0xcontract', '0xfdab463d');
        expect(res).toBe('0x' + 'beef'.padStart(64, '0'));
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    // Public BSC endpoints rate limit and refuse in every way at once; none of it may
    // count as an answer, and none of it may stop the quorum being reached elsewhere.
    it('rotates past transport, HTTP, JSON-RPC and empty failures to reach the quorum', async () => {
        const arrRpcs = [1, 2, 3, 4, 5, 6, 7].map((n) => 'https://rpc-' + n);
        fetch
            .mockRejectedValueOnce(
                new Error('NetworkError when attempting to fetch')
            )
            .mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ error: { message: 'limit exceeded' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ result: '0x' }),
            })
            .mockResolvedValue(answer('1'));
        await expect(
            evmCall(arrRpcs, '0xcontract', '0xfdab463d')
        ).resolves.toBe('0x' + '1'.padStart(64, '0'));
        expect(fetch).toHaveBeenCalledTimes(7);
    });

    /**
     * An endpoint that accepts the request and never answers used to stall the resolve
     * for good. It now costs `FETCH_TIMEOUT_MS`, and rotation carries on past it.
     */
    it('gives up on an endpoint that never answers, and rotates past it', async () => {
        vi.useFakeTimers();
        try {
            fetch.mockImplementation((url, { signal }) =>
                url === 'https://rpc-a'
                    ? new Promise((_, reject) =>
                          signal.addEventListener('abort', () =>
                              reject(new DOMException('aborted', 'AbortError'))
                          )
                      )
                    : Promise.resolve(answer('1'))
            );
            const p = evmCall(RPCS, '0xcontract', '0xfdab463d');
            await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);
            await expect(p).resolves.toBe('0x' + '1'.padStart(64, '0'));
            expect(fetch.mock.calls.map((c) => c[0])).toEqual(RPCS);
        } finally {
            vi.useRealTimers();
        }
    });

    // The critical one. A zero word is isRootValid answering "no". Shopping around on
    // it would mean asking until some endpoint said yes - turning a security verdict
    // into a poll of whoever is reachable. Two endpoints agreeing on "no" settles it;
    // the third is never asked.
    it('does NOT keep asking when the contract legitimately answers false', async () => {
        fetch.mockResolvedValue(answer('0'));
        const valid = await verifyRootValidityOnContract(
            RPCS,
            '0xcontract',
            LIVE_VECTOR.smt_root
        );
        expect(valid).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(MIN_RPC_AGREEMENT);
    });

    // Callers decide from the error which component to blame and whether waiting can
    // help, so each failure below is checked for its type as well as its message.
    it('throws rather than picking a side when no answer reaches the quorum', async () => {
        fetch
            .mockResolvedValueOnce(answer('1'))
            .mockResolvedValueOnce(answer('2'))
            .mockResolvedValueOnce(answer('3'));
        const e = await evmCall(RPCS, '0xcontract', '0xfdab463d').catch(
            (e) => e
        );
        expect(e).toBeInstanceOf(RpcQuorumError);
        expect(e.message).toMatch(/disagree/);
        expect(e.isTransient).toBe(false);
    });

    it('throws, naming the last reason, when only one endpoint answers', async () => {
        fetch
            .mockResolvedValueOnce(answer('1'))
            .mockRejectedValue(new Error('down'));
        const e = await evmCall(RPCS, '0xcontract', '0xfdab463d').catch(
            (e) => e
        );
        expect(e).toBeInstanceOf(RpcQuorumError);
        expect(e.message).toMatch(
            /1 of 3 EVM RPC endpoint\(s\) answered, 2 must agree; last error: down/
        );
        // too few answers is the one failure worth waiting out
        expect(e.isTransient).toBe(true);
    });

    // Silently verifying on one endpoint because the list happened to be short is the
    // state an attacker wants, and it was reachable by accident. Refusing is the only
    // honest answer: the check cannot be made.
    it('refuses to run on fewer endpoints than the quorum needs', async () => {
        fetch.mockResolvedValue(answer('1'));
        const e = await evmCall(
            ['https://rpc-only'],
            '0xcontract',
            '0xfdab463d'
        ).catch((e) => e);
        expect(e).toBeInstanceOf(RpcQuorumError);
        expect(e.message).toMatch(/independent EVM RPC endpoints/);
        expect(e.isTransient).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });

    // An endpoint listed twice is still one endpoint: it must not agree with itself.
    it('counts a duplicated endpoint once', async () => {
        fetch.mockResolvedValue(answer('1'));
        await expect(
            evmCall(
                ['https://rpc-a', 'https://rpc-a'],
                '0xcontract',
                '0xfdab463d'
            )
        ).rejects.toThrow(/only 1 is configured/);
        expect(fetch).not.toHaveBeenCalled();
    });
});

/**
 * `createAlert` returns nothing, as it does on master. Plenty of callers
 * `return createAlert(...)` from functions whose own callers read any truthy result as
 * success: a failed `guiAddContactPrompt` would read as "added" to
 * `guiAddContactQRPrompt`, and `promptForContact` on an empty book would hand an Alert
 * object to the address field. Only the name service needs the alert back, and asks for
 * it by name.
 */
describe('alert return values', () => {
    it('createAlert returns nothing', () => {
        expect(createAlert('info', 'x', 1)).toBeUndefined();
    });

    it('createClosableAlert hands back an alert that can be closed', () => {
        const alert = createClosableAlert('info', 'closable', 1000);
        expect(alert.show).toBe(true);
        alert.close();
        expect(alert.show).toBe(false);
    });
});
