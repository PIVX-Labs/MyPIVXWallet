<script setup>
import { ref, onUnmounted } from 'vue';
import { Database } from '../database.js';
import { createAlert } from '../alerts/alert.js';
import { isShieldAddress, sanitizeHTML } from '../misc.js';
import {
    fetchEVMRoot,
    fetchFromIndexer,
    fetchIndexerRoot,
    getEVMNetwork,
    getEvmRpcList,
    IndexerUnreachableError,
    RpcQuorumError,
    verifyRootValidityOnContract,
    verifySmtProof,
} from '../utils.pins.js';
import { ALERTS, translation, tr } from '../i18n.js';
import { debugError, DebugTopics } from '../debug.js';

// Events we can emit
const emit = defineEmits(['send']);

// Reactive States
const showSyncModal = ref(false);
const syncModalState = ref('warning');
const syncModalTitle = ref('');
const syncModalText = ref('');
const syncModalConfirmText = ref('');
const syncModalCancelText = ref('');
const syncModalIsPolling = ref(false);
const pendingSendParams = ref(null);

let syncModalInterval = null;

/** How long an untrusted string may be before it is cut short for display. */
const MAX_ERROR_CHARS = 200;

/** How often the sync modal asks whether the indexer has caught up. */
const SYNC_POLL_MS = 15000;

/**
 * Everything the resolver needs, resolved fresh from settings and chain params.
 *
 * The contract address deliberately comes from chain params and never from the stored
 * settings row. It is a protocol constant with no UI behind it, and `setSettings`
 * writes back the whole settings object, so a row written once would outrank the
 * shipped value for good - including after a contract redeployment, which is precisely
 * when the shipped value is the one that matters. Ignoring the stored copy is also the
 * migration: nothing has to be rewritten in IndexedDB for a new address to take effect.
 */
async function loadResolverConfig() {
    const database = await Database.getInstance();
    const { nameResolvingApi, evmRpc, evmNetworkId } =
        await database.getSettings();

    const objNetwork = getEVMNetwork(evmNetworkId);
    if (!objNetwork) {
        throw new Error('No EVM network is configured for name resolving');
    }

    return {
        apiEndpoint: nameResolvingApi || 'https://indexer.pivx.name',
        evmRpcList: getEvmRpcList(evmRpc, objNetwork),
        evmContractAddress: objNetwork.contractAddress,
    };
}

/**
 * Untrusted text on its way to an alert.
 *
 * Alert bodies are rendered with `v-html` (see `Alert.vue`), so anything an indexer put
 * in an error field would otherwise be markup running in the wallet's own origin. The
 * length cap is part of the same job: the field is attacker-sized as well as
 * attacker-chosen.
 */
function safeErrMsg(e) {
    return sanitizeHTML(capErrMsg(e));
}

/**
 * Untrusted text cut to a displayable length, for places that escape it themselves -
 * the sync modal is `{{ }}` throughout, so escaping here as well would show entities.
 */
function capErrMsg(e) {
    const strMsg = typeof e === 'string' ? e : e?.message || String(e);
    return strMsg.length > MAX_ERROR_CHARS
        ? `${strMsg.slice(0, MAX_ERROR_CHARS)}...`
        : strMsg;
}

async function resolveDomainName(apiEndpoint, domain) {
    const res = await fetchFromIndexer(
        `${apiEndpoint.replace(/\/$/, '')}/v1.0/resolve/${domain}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        }
    );

    let json = null;
    try {
        json = await res.json();
    } catch (e) {
        // Not a JSON response
    }

    if (json && json.error) {
        const errMsg = json.error.error_message;
        if (errMsg === 'Domain not found') {
            return { isNotFound: true, resolveData: null };
        }
        throw new Error(errMsg);
    }

    if (!res.ok) {
        throw new Error(`Indexer responded with status ${res.status}`);
    }

    if (json && json.response) {
        return { isNotFound: false, resolveData: json.response };
    }

    throw new Error('Invalid response format from indexer');
}

/**
 * The two roots, read together: what the indexer says the tree is, and what the chain
 * attests to.
 *
 * The chain read is kicked off first so it overlaps the resolve rather than following
 * it. The catch is attached immediately: an unhandled rejection here would surface as a
 * global error before the await below ever saw it.
 */
async function fetchRootsAndResolve(objConfig, strDomain) {
    const evmRootPromise = fetchEVMRoot(
        objConfig.evmRpcList,
        objConfig.evmContractAddress
    );
    evmRootPromise.catch(() => {});

    let resolveData = null;
    let isNotFound = false;
    let strIndexerRoot = null;

    try {
        const res = await resolveDomainName(objConfig.apiEndpoint, strDomain);
        isNotFound = res.isNotFound;
        if (!isNotFound) {
            resolveData = res.resolveData;
            strIndexerRoot = String(resolveData.smt_root || '').toLowerCase();
        }
    } catch (e) {
        if (e.message === 'Domain not found') {
            isNotFound = true;
        } else {
            throw e;
        }
    }

    const strChainRoot = await evmRootPromise;

    // Only needed when the name is missing: with no resolve response there is no root
    // to compare, and "the indexer is behind" still has to be told apart from "this
    // name genuinely does not exist".
    if (isNotFound) {
        strIndexerRoot = await fetchIndexerRoot(objConfig.apiEndpoint);
    }

    return { strIndexerRoot, strChainRoot, isNotFound, resolveData };
}

/**
 * Last gate before a send: the response must be complete, and its proof must fold to
 * the root the chain attests to right now.
 *
 * `strTrustedRoot` is always the anchor contract's current root. It is never the root
 * the indexer declared alongside the proof, and never a historical root either - see
 * the note on `armSyncDelay` for why an older anchored root is no longer good enough.
 */
function verifyResolvedDetails(strDomain, resolveData, strTrustedRoot) {
    if (!resolveData) return false;
    const resolvedAddress = resolveData.target_address;

    // The proof carries its own depth and terminal now, so completeness is checked
    // where the proof is parsed rather than by listing fields twice.
    if (
        !resolvedAddress ||
        !resolveData.owner_pubkey ||
        resolveData.price === undefined ||
        resolveData.nonce === undefined ||
        !resolveData.smt_root ||
        !Array.isArray(resolveData.merkle_proof) ||
        resolveData.proof_depth === undefined ||
        !resolveData.proof_terminal
    ) {
        createAlert(
            'warning',
            tr(ALERTS.PINS_INCOMPLETE_METADATA, [{ strDomain }]),
            5000
        );
        return false;
    }

    if (!verifySmtProof(resolveData, strDomain, strTrustedRoot)) {
        createAlert('warning', ALERTS.PINS_INVALID_PROOF, 5000);
        return false;
    }

    if (!isShieldAddress(resolvedAddress)) {
        createAlert('warning', ALERTS.PINS_INVALID_SHIELD, 5000);
        return false;
    }

    if (resolveData.domain_name !== strDomain) {
        createAlert('warning', ALERTS.PINS_NAME_MISMATCH, 5000);
        return false;
    }

    return true;
}

/**
 * The indexer is serving a tree the contract has never accepted. Nothing about that has
 * a benign reading, so there is no way forward from this modal.
 */
function showUnanchoredRootWall() {
    stopSyncModalPolling();
    pendingSendParams.value = null; // Clear to prevent any send
    showSyncModal.value = true;
    syncModalState.value = 'invalid_root';
    syncModalTitle.value = translation.pinsTitleSecurityWarning;
    syncModalText.value = translation.pinsTextSecurityWarning;
    syncModalCancelText.value = translation.pinsBtnClose;
}

/**
 * The indexer is behind: it is serving a root the contract did accept, just not the one
 * it currently attests to.
 *
 * There is no "send anyway" here. An earlier revision bounded how far behind the root
 * could be and let the user override inside that bound, but the two heights involved
 * are checkpoint heights, so the lag is not a clock - it is 0 while the two agree and a
 * whole checkpoint stride the moment they do not. Any bound expressed in blocks is
 * therefore a bet on how often batches get proved, and it fails closed on the registry
 * rather than on an attacker. Waiting for the indexer to catch up costs a few minutes
 * and needs no such bet, so that is what this does.
 */
function armSyncDelay(objConfig, strDomain, params, fNotFound) {
    pendingSendParams.value = params;
    showSyncModal.value = true;

    if (fNotFound) {
        syncModalState.value = 'not_found';
        syncModalTitle.value = translation.pinsTitleSyncDelayNotFound;
        syncModalText.value = translation.pinsTextSyncDelayNotFound;
    } else {
        syncModalState.value = 'warning';
        syncModalTitle.value = translation.pinsTitleSyncDelay;
        syncModalText.value = translation.pinsTextSyncDelayWait;
    }
    syncModalCancelText.value = translation.pinsBtnCancel;

    startSyncModalPolling(objConfig, strDomain);
}

function handleCriticalError(e, isRetry = false) {
    const errMsg = capErrMsg(e);

    // Decided by type, never by the text. Much of that text is the indexer's or an
    // endpoint's own, and matching on it would let the untrusted side choose which
    // component takes the blame and whether the poller keeps going.
    //
    // A quorum that cannot be reached is not the indexer's doing, and saying so points
    // people at the wrong component. Endpoints that answered and disagreed are fatal to
    // the attempt: without agreeing endpoints there is no chain state to verify against.
    const isRpcQuorumError = e instanceof RpcQuorumError;
    const isTransient =
        e instanceof IndexerUnreachableError ||
        (isRpcQuorumError && e.isTransient);

    if (!isTransient) {
        stopSyncModalPolling();
        pendingSendParams.value = null;
        showSyncModal.value = true;
        syncModalState.value = 'invalid_root';
        syncModalTitle.value = isRpcQuorumError
            ? translation.pinsTitleRpcError
            : translation.pinsTitleIndexerError;
        syncModalText.value = tr(
            isRpcQuorumError
                ? translation.pinsTextRpcError
                : translation.pinsTextIndexerError,
            [{ errMsg }]
        );
        syncModalCancelText.value = translation.pinsBtnClose;
        return true;
    }

    if (isRetry) {
        createAlert(
            'warning',
            tr(ALERTS.PINS_SYNC_FAILED, [{ errMsg: safeErrMsg(e) }]),
            3000
        );
    }
    return false;
}

/**
 * While the modal is up, ask one cheap question on a timer: have the two roots met?
 *
 * Only the two roots. The resolve and the contract's validity read are not repeated
 * here - they decided which modal to show, and they will be run again in full the
 * moment the answer changes or the user acts. A tick costs one indexer request and one
 * quorum'd contract read.
 */
function startSyncModalPolling(objConfig, strDomain) {
    stopSyncModalPolling();
    syncModalIsPolling.value = true;

    syncModalInterval = setInterval(async () => {
        try {
            const [strIndexerRoot, strChainRoot] = await Promise.all([
                fetchIndexerRoot(objConfig.apiEndpoint),
                fetchEVMRoot(
                    objConfig.evmRpcList,
                    objConfig.evmContractAddress
                ),
            ]);
            if (strIndexerRoot !== strChainRoot) return;

            stopSyncModalPolling();
            // Caught up. Run the whole thing again, this time to completion, so the
            // "resolved" the modal is about to claim is one that actually verified.
            const params = pendingSendParams.value;
            if (!params) return;
            await runResolution(
                params.originalDomain,
                params.amount,
                params.useShieldInputs,
                params.memo,
                false
            );
        } catch (e) {
            debugError(
                DebugTopics.NET,
                'Sync modal background check error:',
                e
            );
            handleCriticalError(e);
        }
    }, SYNC_POLL_MS);
}

function stopSyncModalPolling() {
    syncModalIsPolling.value = false;
    if (syncModalInterval) {
        clearInterval(syncModalInterval);
        syncModalInterval = null;
    }
}

// Dashboard mounts this once and never tears it down today, but a timer that outlives
// its component is the kind of thing that only becomes a bug once somebody moves it.
onUnmounted(stopSyncModalPolling);

/**
 * The one path that can spend.
 *
 * Every entry point goes through here - the first attempt, Retry, the confirmation, and
 * the poller - so the decision to send is made in exactly one place, always from state
 * read in that same pass. Nothing is carried over from when a modal was put on screen:
 * a dialog can sit open for hours, and the chain does not wait.
 *
 * @param {boolean} fEmit - true when the user has asked to send; false when the point
 *                          is only to confirm the name resolves cleanly and let them
 *                          press Send themselves.
 */
async function runResolution(strDomain, amount, useShieldInputs, memo, fEmit) {
    const objConfig = await loadResolverConfig();
    const { strIndexerRoot, strChainRoot, isNotFound, resolveData } =
        await fetchRootsAndResolve(objConfig, strDomain);

    if (!strChainRoot)
        throw new Error('Could not read the anchor contract root');

    if (strIndexerRoot !== strChainRoot) {
        // Is this an indexer that is behind, or one describing a tree that never
        // existed? Only the contract can say.
        const fAnchored = await verifyRootValidityOnContract(
            objConfig.evmRpcList,
            objConfig.evmContractAddress,
            strIndexerRoot
        );
        if (!fAnchored) {
            showUnanchoredRootWall();
            return;
        }
        armSyncDelay(
            objConfig,
            strDomain,
            {
                amount,
                useShieldInputs,
                memo,
                originalDomain: strDomain,
            },
            isNotFound || !resolveData
        );
        return;
    }

    // Roots agree, so the chain's current root is the one to verify against.
    if (isNotFound || !resolveData || !resolveData.target_address) {
        stopSyncModalPolling();
        showSyncModal.value = false;
        pendingSendParams.value = null;
        createAlert(
            'warning',
            tr(ALERTS.PINS_NOT_FOUND, [{ strDomain }]),
            5000
        );
        return;
    }

    if (!verifyResolvedDetails(strDomain, resolveData, strChainRoot)) {
        stopSyncModalPolling();
        showSyncModal.value = false;
        pendingSendParams.value = null;
        return;
    }

    if (!fEmit) {
        // Verified, but the user is not here - they chose to wait. Hand them a button
        // rather than spending on their behalf.
        pendingSendParams.value = {
            amount,
            useShieldInputs,
            memo,
            originalDomain: strDomain,
        };
        showSyncModal.value = true;
        syncModalState.value = 'synced';
        syncModalTitle.value = translation.pinsTitleSynced;
        syncModalText.value = translation.pinsTextSynced;
        syncModalConfirmText.value = translation.pinsBtnSend;
        syncModalCancelText.value = translation.pinsBtnCancel;
        return;
    }

    stopSyncModalPolling();
    showSyncModal.value = false;
    pendingSendParams.value = null;
    // Send to the address the verified leaf commits to, never to a field carried
    // alongside it.
    emit('send', {
        address: resolveData.target_address,
        amount,
        useShieldInputs,
        memo,
    });
}

/**
 * A tick of the poller, on demand - and like the poller it never spends. The button
 * says Retry, not Send, so a name that verifies on this attempt lands on the synced
 * dialog and its Send button rather than paying on the click that asked to look again.
 */
async function retrySyncModalResolution() {
    if (!showSyncModal.value || syncModalState.value !== 'not_found') return;
    const params = pendingSendParams.value;
    if (!params) return;

    stopSyncModalPolling();
    const checkingAlert = createAlert('info', ALERTS.PINS_CHECKING_SYNC, 5000);
    try {
        await runResolution(
            params.originalDomain,
            params.amount,
            params.useShieldInputs,
            params.memo,
            false
        );
        if (checkingAlert) checkingAlert.close();
        if (syncModalState.value === 'not_found' && showSyncModal.value) {
            createAlert('warning', ALERTS.PINS_SYNCING_WAIT, 3000);
        }
    } catch (e) {
        if (checkingAlert) checkingAlert.close();
        handleCriticalError(e, true);
    }
}

function closeSyncModal(confirm) {
    stopSyncModalPolling();
    showSyncModal.value = false;

    if (!confirm || !pendingSendParams.value) {
        pendingSendParams.value = null;
        return;
    }

    // Confirming is a decision taken now, so everything is re-derived now.
    confirmPendingSend();
}

async function confirmPendingSend() {
    const params = pendingSendParams.value;
    pendingSendParams.value = null;
    if (!params) return;

    try {
        await runResolution(
            params.originalDomain,
            params.amount,
            params.useShieldInputs,
            params.memo,
            true
        );
    } catch (e) {
        debugError(DebugTopics.NET, 'Name service confirmation error:', e);
        createAlert(
            'warning',
            tr(ALERTS.PINS_RESOLVE_FAILED, [{ errMsg: safeErrMsg(e) }]),
            5000
        );
    }
}

async function resolveAndVerify(domain, amount, useShieldInputs, memo) {
    const strDomain = domain.toLowerCase();
    const resolvingAlert = createAlert(
        'info',
        tr(ALERTS.PINS_RESOLVING_DOMAIN, [{ strDomain }]),
        10000
    );

    try {
        await runResolution(strDomain, amount, useShieldInputs, memo, true);
        if (resolvingAlert) resolvingAlert.close();
    } catch (e) {
        if (resolvingAlert) resolvingAlert.close();
        debugError(DebugTopics.NET, 'Name service resolution error:', e);
        createAlert(
            'warning',
            tr(ALERTS.PINS_RESOLVE_FAILED, [{ errMsg: safeErrMsg(e) }]),
            5000
        );
    }
}

// Expose public API
defineExpose({
    resolveAndVerify,
});
</script>

<template>
    <!-- Sync Warning Modal -->
    <div
        v-if="showSyncModal"
        class="modal fade show"
        style="
            display: block;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1050;
            overflow-y: auto;
        "
        tabindex="-1"
        role="dialog"
    >
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div
                class="modal-content text-center"
                style="
                    background: #1e1233;
                    color: #fff;
                    border: 1px solid #4e327a;
                    border-radius: 10px;
                    padding: 20px;
                "
            >
                <div
                    class="modal-header border-0 justify-content-center"
                    style="padding-bottom: 0"
                >
                    <h5
                        class="modal-title font-weight-bold"
                        style="color: #d5adff; font-size: 1.35rem"
                    >
                        {{ syncModalTitle }}
                    </h5>
                </div>
                <div
                    class="modal-body border-0"
                    style="
                        font-size: 0.95rem;
                        line-height: 1.5;
                        color: #e1d5f5;
                        padding-top: 15px;
                        padding-bottom: 15px;
                    "
                >
                    <p>{{ syncModalText }}</p>
                    <div
                        v-if="syncModalIsPolling"
                        class="mt-3 d-flex align-items-center justify-content-center"
                        style="color: #d5adff; font-size: 0.85rem; gap: 8px"
                    >
                        <span
                            class="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                            style="
                                width: 1rem;
                                height: 1rem;
                                border-width: 0.15em;
                            "
                        ></span>
                        {{ translation.pinsPolling }}
                    </div>
                </div>
                <div
                    class="modal-footer border-0 justify-content-center"
                    style="padding-top: 0; display: flex; gap: 10px"
                >
                    <button
                        v-if="syncModalState === 'synced'"
                        type="button"
                        class="pivx-button-big"
                        style="width: 150px; margin: 0"
                        @click="closeSyncModal(true)"
                    >
                        {{ syncModalConfirmText }}
                    </button>
                    <button
                        v-if="syncModalState === 'not_found'"
                        type="button"
                        class="pivx-button-big"
                        style="width: 150px; margin: 0"
                        @click="retrySyncModalResolution"
                    >
                        {{ translation.pinsBtnRetry }}
                    </button>
                    <button
                        type="button"
                        class="pivx-button-big-cancel"
                        style="width: 150px; margin: 0"
                        @click="closeSyncModal(false)"
                    >
                        {{ syncModalCancelText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
