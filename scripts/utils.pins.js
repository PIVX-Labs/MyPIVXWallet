import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { bech32 } from 'bech32';
import { cChainParams } from './chain_params.js';

export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

export const PIVXNameTLDs = ['.pivx', '.secure', '.safe', '.private'];

/**
 * Domain separation tags for the compact Sparse Merkle Tree.
 *
 * In the old dense tree every leaf sat at depth 128, so a leaf hash could never
 * appear at an internal position and these tags were only defence in depth. In the
 * compact tree a leaf legitimately sits at an internal position, so the tags are the
 * only thing distinguishing "a leaf is here" from "a subtree is here". They are
 * mandatory - dropping either one makes forged proofs possible.
 */
const LEAF_TAG = 0x00;
const NODE_TAG = 0x01;

/** An empty subtree is 32 zero bytes at every depth; there is no per-height ladder. */
const EMPTY_NODE = Buffer.alloc(32);

/** A key is 128 bits, so a path can never be longer than that. */
export const MAX_PROOF_DEPTH = 128;

/** Decoded payload of a Sapling payment address: 11-byte diversifier + 32-byte pk_d. */
const SAPLING_PAYLOAD_LEN = 43;

/**
 * How many distinct EVM endpoints must return the same word before a contract read is
 * acted on.
 *
 * One endpoint answering is failover, not agreement: whoever controls that endpoint
 * controls the wallet's entire view of the chain, and paired with a hostile indexer
 * that is a fabricated tree which verifies clean. Requiring two independent providers
 * to be wrong in identical ways is a materially harder position to reach.
 *
 * When fewer endpoints than this are reachable the read fails rather than falling back
 * to one answer - a contract read is only consulted on paths where refusing to send is
 * the safe outcome. Nor does the quorum shrink to fit a short list: a network with
 * fewer endpoints configured than this is refused outright (see `evmCall`).
 */
export const MIN_RPC_AGREEMENT = 2;

/**
 * A contract read that could not be settled under quorum.
 *
 * A type rather than a message, because callers decide from it which component to
 * blame and whether waiting can help, and the message is not ours to rely on - the
 * reason it carries is an endpoint's own error text.
 *
 * `isTransient` is true when too few endpoints answered, which a later attempt may
 * well fix. It is false when they answered and disagreed, or when there are too few
 * configured for a quorum ever to be reached: waiting changes neither.
 */
export class RpcQuorumError extends Error {
    /**
     * @param {string} strMessage
     * @param {boolean} isTransient
     */
    constructor(strMessage, isTransient) {
        super(strMessage);
        this.name = 'RpcQuorumError';
        this.isTransient = isTransient;
    }
}

/**
 * The indexer gave no answer at all, as opposed to an answer saying something is wrong.
 *
 * Only this is worth waiting out. It is a type because the browser's own wording for it
 * differs per engine, and any wording matched on text could equally be produced by an
 * indexer choosing its error message to look like one.
 */
export class IndexerUnreachableError extends Error {
    constructor(strMessage) {
        super(strMessage);
        this.name = 'IndexerUnreachableError';
    }
}

/**
 * `fetch` against the indexer, with a failure to get any response turned into
 * `IndexerUnreachableError`. Everything after a response arrives is left to the caller.
 * @param {...any} args - exactly what `fetch` takes, passed through untouched
 * @returns {Promise<Response>}
 */
export async function fetchFromIndexer(...args) {
    try {
        return await fetch(...args);
    } catch (e) {
        throw new IndexerUnreachableError(
            `Could not reach the indexer: ${e?.message || e}`
        );
    }
}

/**
 * The EVM network configuration for a stored chain id.
 *
 * Falls back to the first configured network when the id matches nothing. A stored id
 * that no longer names a configured network is stale state, not a configuration: it is
 * how the endpoint list used to collapse to a single stored RPC - and the quorum with
 * it - long after chain params had moved on. Chain params are the authority here.
 *
 * @param {number} nChainId
 * @returns {object|null}
 */
export function getEVMNetwork(nChainId) {
    const arrNetworks = cChainParams.current.EVMNetworks || [];
    return (
        arrNetworks.find((n) => n.chainId === nChainId) ||
        arrNetworks[0] ||
        null
    );
}

/**
 * The endpoints to try for a network, best first.
 *
 * The user's chosen endpoint leads, but only while it is still one the network declares.
 * The same chain params carry the contract address and the endpoints that are supposed
 * to serve it, so an endpoint that has dropped out of that list is not something to keep
 * asking first - it is a leftover.
 *
 * @param {string} strConfiguredRpc
 * @param {object} objNetwork - as returned by `getEVMNetwork`
 * @returns {string[]}
 */
export function getEvmRpcList(strConfiguredRpc, objNetwork) {
    const arrSpares = objNetwork?.rpcs || [];
    const arrOrdered = arrSpares.includes(strConfiguredRpc)
        ? [strConfiguredRpc, ...arrSpares]
        : [...arrSpares];
    return arrOrdered.filter((url, i, arr) => url && arr.indexOf(url) === i);
}

/**
 * Check if a domain string ends with one of the supported PIVX TLDs
 * @param {string} strDomain
 * @returns {boolean}
 */
export function isPIVXNameTLD(strDomain) {
    if (!strDomain) return false;
    const lower = strDomain.toLowerCase();
    return PIVXNameTLDs.some((tld) => lower.endsWith(tld));
}

/**
 * Check if a string is a valid PIVX domain name (PiNS format)
 * @param {string} strDomain
 * @returns {boolean}
 */
export function isPIVXName(strDomain) {
    if (!strDomain) return false;
    const lower = strDomain.toLowerCase();

    // Find matching TLD
    const matchedTld = PIVXNameTLDs.find((tld) => lower.endsWith(tld));
    if (!matchedTld) return false;

    // Extract label
    const label = lower.substring(0, lower.length - matchedTld.length);

    // Total domain length must be <= 64 characters
    if (strDomain.length > 64) return false;

    // Label length must be > 0
    if (label.length < 1) return false;

    // Check characters: lowercase alphanumeric + hyphens
    const regex = /^[a-z0-9-]+$/;
    if (!regex.test(label)) return false;

    // Hyphens: No leading, trailing, or consecutive
    if (label.startsWith('-') || label.endsWith('-') || label.includes('--'))
        return false;

    return true;
}

/**
 * The 128-bit tree key a domain's path is read from.
 * @param {string} strDomain - MUST already be lowercased.
 * @returns {Uint8Array} the first 16 bytes of SHA256(domain)
 */
function domainKey(strDomain) {
    return sha256(new TextEncoder().encode(strDomain)).slice(0, 16);
}

/**
 * Bit `i` of the path, most significant bit first within each byte.
 * Bit 0 selects the left child.
 */
function keyBit(key, i) {
    return (key[i >> 3] >> (7 - (i & 7))) & 1;
}

/** u64 little-endian. Takes a BigInt so a price near 2^53 cannot lose precision. */
function u64LE(value) {
    const buf = Buffer.alloc(8);
    let v = BigInt(value);
    if (v < 0n || v > 0xffffffffffffffffn) {
        throw new Error('value out of u64 range');
    }
    for (let i = 0; i < 8; i++) {
        buf[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return buf;
}

/**
 * Strict Sapling address check, mirroring pins_core::is_address_valid.
 *
 * `isShieldAddress` in misc.js asks only whether the string bech32 decodes under the
 * right prefix, which is the right question for an address a user typed. Here the
 * string is one field of a leaf preimage handed over by a remote party, so it is
 * checked the way the circuit checks it: canonical lowercase, the exact prefix and
 * character count for this network, and a payload of exactly 43 bytes. Character count
 * and payload length are not the same condition - bech32 pads to 5-bit groups, so
 * payloads of different byte lengths can share a character count.
 *
 * Pinning the length is also what keeps the leaf preimage rigid; see `verifySmtProof`.
 *
 * @param {string} strAddress
 * @returns {boolean}
 */
export function isStrictShieldAddress(strAddress) {
    if (typeof strAddress !== 'string') return false;
    const strPrefix = cChainParams.current.SHIELD_PREFIX;
    // 43 bytes is ceil(43*8/5) = 69 data characters, plus 6 of checksum and the
    // separator - so the address is always the prefix plus 76.
    if (strAddress.length !== strPrefix.length + 76) return false;
    // Bech32's checksum is case insensitive, so the uppercase spelling decodes to the
    // same payload. One address with two spellings is two different leaves.
    if (strAddress !== strAddress.toLowerCase()) return false;
    try {
        const { prefix, words } = bech32.decode(strAddress);
        if (prefix !== strPrefix) return false;
        return bech32.fromWords(words).length === SAPLING_PAYLOAD_LEN;
    } catch (e) {
        return false;
    }
}

/**
 * `price` and `nonce` are u64 in the leaf. The indexer sends them as JSON numbers, or
 * as decimal strings once they outgrow what a double holds exactly, and both spellings
 * have to hash alike - so anything that is not an exact non-negative integer inside the
 * u64 range is refused before it reaches the hash.
 */
function isU64(value) {
    if (typeof value === 'bigint') {
        return value >= 0n && value <= 0xffffffffffffffffn;
    }
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0;
    }
    if (typeof value === 'string') {
        if (!/^[0-9]{1,20}$/.test(value)) return false;
        return BigInt(value) <= 0xffffffffffffffffn;
    }
    return false;
}

/**
 * hash_leaf - must match pins_core::hash_leaf byte for byte.
 * @param {string} strDomain - lowercased domain
 * @param {string} strPubkeyHex - 32-byte owner pubkey, hex
 * @param {string} strTargetAddress - the shield address the name points at
 * @param {bigint|number|string} price
 * @param {bigint|number|string} nonce
 */
function hashLeaf(strDomain, strPubkeyHex, strTargetAddress, price, nonce) {
    return sha256(
        Buffer.concat([
            Buffer.from([LEAF_TAG]),
            Buffer.from(strDomain, 'utf8'),
            Buffer.from(strPubkeyHex, 'hex'),
            Buffer.from(strTargetAddress, 'utf8'),
            u64LE(price),
            u64LE(nonce),
        ])
    );
}

/** hash_node - must match pins_core::hash_node byte for byte. */
function hashNode(left, right) {
    return sha256(
        Buffer.concat([
            Buffer.from([NODE_TAG]),
            Buffer.from(left),
            Buffer.from(right),
        ])
    );
}

/**
 * Fold a proof from its terminal depth up to the root.
 *
 * `siblings` is ordered deepest first, so step `i` consumes the sibling at depth
 * `d - i` and turns on path bit `d - 1 - i`.
 */
function fold(key, startHash, arrSiblings) {
    let h = startHash;
    for (let i = 0; i < arrSiblings.length; i++) {
        const sibling = arrSiblings[i];
        h = keyBit(key, arrSiblings.length - 1 - i)
            ? hashNode(sibling, h)
            : hashNode(h, sibling);
    }
    return h;
}

/**
 * Verify a compact SMT inclusion proof for a resolved name, against a root the caller
 * has already established as trustworthy.
 *
 * `strTrustedRoot` is mandatory and must come from the anchor contract - never from the
 * response being checked. Folding to the root the same response declared would only
 * prove that the response agrees with itself: a depth 0 proof whose `smt_root` is its
 * own leaf hash satisfies that trivially. Taking the root as an argument makes the
 * binding to the chain part of this function's contract instead of a rule every caller
 * has to remember.
 *
 * Every field of the leaf preimage is checked to an exact shape before it is hashed.
 * The preimage is a plain concatenation with no length prefixes - it has to be, the
 * layout is fixed by pins_core and the circuit - so the way to keep its boundaries
 * rigid is to pin the lengths instead: `price` and `nonce` are 8 bytes each,
 * `owner_pubkey` is exactly 32, and a target address is exactly one length for the
 * network. With all of those fixed, the domain's length is fixed too, and no byte can
 * move from one field into its neighbour while still describing a well formed response.
 *
 * The proof is variable depth: `proof_depth` levels of siblings, with a terminal
 * saying what sits at the bottom. A resolve always answers with `Occupied` - the
 * name's own leaf - because the indexer returns "Domain not found" rather than an
 * absence proof, so `Vacant` and `Blocked` are rejected here as malformed.
 *
 * The depth is self authenticating: folding the wrong number of times yields a
 * different root, so a shortened or padded proof cannot reproduce the trusted root.
 *
 * @param {object} objResolve - the `response` object from /v1.0/resolve
 * @param {string} strDomain - the name the user asked for (any case)
 * @param {string} strTrustedRoot - the root to fold against, read from the contract
 * @returns {boolean} true only if the proof folds to `strTrustedRoot`
 */
export function verifySmtProof(objResolve, strDomain, strTrustedRoot) {
    if (!objResolve || !strDomain) return false;

    // A root that came from outside this response, or nothing to check against.
    if (typeof strTrustedRoot !== 'string') return false;
    const strCleanTrusted = strTrustedRoot.replace(/^0x/, '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(strCleanTrusted)) return false;

    const {
        target_address: strTargetAddress,
        owner_pubkey: strOwnerPubkey,
        price,
        nonce,
        smt_root: strExpectedRoot,
        merkle_proof: arrProof,
        proof_depth: nDepth,
        proof_terminal: strTerminal,
        domain_name: strAnsweredDomain,
    } = objResolve;

    if (
        !strTargetAddress ||
        !strOwnerPubkey ||
        price === undefined ||
        price === null ||
        nonce === undefined ||
        nonce === null ||
        !strExpectedRoot ||
        !Array.isArray(arrProof)
    ) {
        return false;
    }

    // One normalisation, used for both the key and the leaf preimage. Deriving them
    // from differently cased strings would break every proof.
    const strLower = strDomain.toLowerCase();

    // Only a name the registry could actually hold is worth hashing. The registry's own
    // rules make valid names prefix free - exactly one dot, and the part after it must
    // be a whole zone - so no valid name is a byte prefix of another, and the domain
    // boundary in the preimage cannot slide even before the length checks below.
    if (!isPIVXName(strLower)) return false;

    // Exactly 32 bytes of hex, nothing more. Buffer.from(..., 'hex') stops at the first
    // character it cannot decode and silently keeps what it had, so without this the
    // pubkey could carry trailing junk - or the leading bytes of the target address,
    // moving a field boundary while the hash stays put.
    if (!/^[0-9a-fA-F]{64}$/.test(strOwnerPubkey)) return false;

    // Checked here and not only at the call site: the address is part of the preimage,
    // and fixing its length is what stops the pubkey/target boundary from sliding.
    if (!isStrictShieldAddress(strTargetAddress)) return false;

    if (!isU64(price) || !isU64(nonce)) return false;

    // If the response names the domain it answered for, it must be the one asked about.
    if (
        strAnsweredDomain !== undefined &&
        String(strAnsweredDomain).toLowerCase() !== strLower
    ) {
        return false;
    }

    // A resolve is an inclusion proof or it is nothing.
    if (strTerminal !== 'Occupied') return false;

    // The sibling count IS the depth; a mismatch means a malformed or doctored proof.
    if (!Number.isInteger(nDepth) || nDepth !== arrProof.length) return false;
    if (nDepth > MAX_PROOF_DEPTH) return false;

    // The indexer publishes the root it folded to. It has to be the one the chain
    // vouched for, or the two are talking about different trees.
    if (
        String(strExpectedRoot).replace(/^0x/, '').toLowerCase() !==
        strCleanTrusted
    ) {
        return false;
    }

    let current;
    let arrSiblings;
    try {
        current = hashLeaf(
            strLower,
            strOwnerPubkey,
            strTargetAddress,
            price,
            nonce
        );
        arrSiblings = arrProof.map((s) => {
            const buf = Buffer.from(s, 'hex');
            if (buf.length !== 32) throw new Error('bad sibling length');
            return buf;
        });
    } catch (e) {
        return false;
    }

    const root = fold(domainKey(strLower), current, arrSiblings);
    return bytesToHex(root) === strCleanTrusted;
}

/**
 * The root of an empty registry, for callers that need to recognise it.
 * Exported so tests and callers do not re-derive the constant.
 */
export const EMPTY_ROOT = bytesToHex(EMPTY_NODE);

/**
 * Perform one eth_call, and do not believe it until `nMinAgree` endpoints have said
 * the same thing.
 *
 * Every contract read is done client side on purpose: the indexer would otherwise
 * have to make this call for every user from one IP and wear the rate limit alone.
 * That only helps if a single unlucky endpoint cannot take the feature down for a
 * user, hence the rotation - public BSC endpoints rate limit on per-second
 * concurrency and some answer 403 outright.
 *
 * Rotation happens on transport errors, non-2xx replies, JSON-RPC error objects and
 * empty results. It deliberately does NOT happen on a successful call that returns
 * a zero word: `0x000...0` is a legitimate `false` from isRootValid, and retrying
 * other endpoints until one disagreed would turn "this root is invalid" into "keep
 * asking until somebody says yes".
 *
 * With `nMinAgree` above 1 the rotation becomes a quorum: identical answers are tallied
 * and the first answer to reach the threshold is returned, so a single endpoint - the
 * one a MITM happens to hold - can no longer decide on its own what the chain says.
 * Endpoints that disagree are not a reason to keep asking until the desired answer
 * turns up: if nothing reaches the threshold the call throws, and every caller treats
 * a throw as "do not send".
 *
 * @param {string|string[]} rpcUrls - endpoints to try, in order
 * @param {string} contractAddress
 * @param {string} strData - abi-encoded calldata, 0x-prefixed
 * @param {number} nMinAgree - endpoints that must return the same word; the call throws
 *                             rather than proceeding if fewer are configured
 * @returns {Promise<string>} the raw result word(s), 0x-prefixed
 */
export async function evmCall(
    rpcUrls,
    contractAddress,
    strData,
    nMinAgree = 1
) {
    const arrRpcs = (Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls]).filter(
        (url, i, arr) => url && arr.indexOf(url) === i
    );
    if (!arrRpcs.length) {
        throw new RpcQuorumError('No EVM RPC endpoint configured', false);
    }

    // Refuse rather than quietly drop to whatever is available. Silently verifying on
    // one endpoint because the list happened to be short is exactly the state an
    // attacker wants, and it is reachable by accident - a stale stored chain id used to
    // collapse the list to a single RPC. If there are not enough independent endpoints
    // to ask, the honest answer is that the check cannot be made.
    if (arrRpcs.length < nMinAgree) {
        throw new RpcQuorumError(
            `Name resolving needs ${nMinAgree} independent EVM RPC endpoints to agree, but only ${arrRpcs.length} is configured for this network`,
            false
        );
    }
    const nQuorum = nMinAgree;

    const payload = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
            {
                to: contractAddress,
                data: strData,
            },
            'latest',
        ],
        id: 1,
    };

    let lastError = null;
    const mapAnswers = new Map();
    for (const rpcUrl of arrRpcs) {
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch from EVM RPC: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(`EVM RPC error: ${data.error.message}`);
            }

            const hexResult = data.result;
            if (!hexResult || hexResult === '0x') {
                throw new Error('EVM RPC returned empty result');
            }

            const strKey = hexResult.toLowerCase();
            const nSeen = (mapAnswers.get(strKey) || 0) + 1;
            mapAnswers.set(strKey, nSeen);
            if (nSeen >= nQuorum) return hexResult;
        } catch (e) {
            // Keep the reason, try the next endpoint. Only if the quorum cannot be
            // reached does the caller hear about it.
            lastError = e;
        }
    }

    if (mapAnswers.size > 1) {
        throw new RpcQuorumError(
            `EVM RPC endpoints disagree: ${mapAnswers.size} different answers, none reached ${nQuorum}`,
            false
        );
    }

    // Not necessarily a total outage: some endpoints may have answered, just too few to
    // count. Say how many, so nobody goes looking for a dead network that is not dead.
    let nAnswered = 0;
    for (const nSeen of mapAnswers.values()) nAnswered += nSeen;
    throw new RpcQuorumError(
        `${nAnswered} of ${
            arrRpcs.length
        } EVM RPC endpoint(s) answered, ${nQuorum} must agree; last error: ${
            lastError?.message || lastError
        }`,
        true
    );
}

/**
 * Read the anchor contract's current root, straight from the user's browser.
 *
 * This is the root every proof is ultimately folded against, so it is read under
 * quorum: one endpoint's word for what the current root is would otherwise be enough
 * to point the whole verification at a tree of somebody else's choosing.
 *
 * @param {string|string[]} rpcUrls
 * @param {string} contractAddress
 * @param {number} nMinAgree
 * @returns {Promise<string>} the root, lowercase hex, no 0x prefix
 */
export async function fetchEVMRoot(
    rpcUrls,
    contractAddress,
    nMinAgree = MIN_RPC_AGREEMENT
) {
    // 0xfdab463d is the selector for currentRoot()
    const hexResult = await evmCall(
        rpcUrls,
        contractAddress,
        '0xfdab463d',
        nMinAgree
    );
    return hexResult.replace(/^0x/, '').toLowerCase();
}

/**
 * Read the indexer's own SMT root.
 *
 * Deliberately /v1.0/getRoot and not /v1.0/info: `info` makes the indexer call the
 * anchor contract server side to fill in `anchored_smt_root`, funnelling every
 * user's request through the indexer's IP. `getRoot` is served from local storage
 * with no EVM call at all, and the chain side is read by the browser instead.
 *
 * @param {string} apiEndpoint
 * @returns {Promise<string>} the root, lowercase hex, no 0x prefix
 */
export async function fetchIndexerRoot(apiEndpoint) {
    const res = await fetchFromIndexer(
        `${apiEndpoint.replace(/\/$/, '')}/v1.0/getRoot`
    );
    if (!res.ok) {
        throw new Error(`Indexer getRoot responded with status ${res.status}`);
    }
    const data = await res.json();
    // getRoot answers with the root as a bare string, not an object.
    if (!data || typeof data.response !== 'string' || !data.response) {
        throw new Error('Invalid response from indexer getRoot');
    }
    return data.response.toLowerCase();
}

/**
 * Ask the anchor contract whether a root is one it accepted and still stands behind.
 *
 * The indexer can only ever be BEHIND the chain, never ahead: it applies commands up
 * to a checkpoint and refuses to commit unless its own computed root equals that
 * checkpoint's root, and checkpoints come from the contract. So every root an honest
 * indexer can serve is in the contract's history, including the genesis root, which
 * the constructor seeds.
 *
 * A `false` here therefore means the root was never accepted, or was repudiated by a
 * rollback - both of which make any proof folding to it worthless. There is no benign
 * reading of it.
 *
 * Uses isRootValid(bytes32) rather than the public rootHistory(bytes32) getter: that
 * getter now returns a (uint32 blockHeight, bool isValid) struct, so a caller reading
 * the whole return as one number would answer "valid" for any root with a recorded
 * block height, whatever the flag says.
 *
 * @param {string|string[]} rpcUrls
 * @param {string} contractAddress
 * @param {string} smtRoot
 * @param {number} nMinAgree
 * @returns {Promise<boolean>}
 */
export async function verifyRootValidityOnContract(
    rpcUrls,
    contractAddress,
    smtRoot,
    nMinAgree = MIN_RPC_AGREEMENT
) {
    if (!smtRoot) return false;
    // 30ef41b4 is the selector for isRootValid(bytes32)
    const cleanRoot = smtRoot.replace(/^0x/, '').toLowerCase();
    const hexResult = await evmCall(
        rpcUrls,
        contractAddress,
        `0x30ef41b4${cleanRoot.padStart(64, '0')}`,
        nMinAgree
    );

    // isRootValid returns a single ABI word: 0 for false, 1 for true. A zero here is
    // a real answer from a healthy endpoint, never a reason to ask a different one.
    return BigInt(hexResult) !== 0n;
}
