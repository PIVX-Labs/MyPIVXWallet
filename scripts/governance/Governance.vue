<script setup>
import { COIN, cChainParams } from '../chain_params';
import { watch, ref, computed } from 'vue';
import { cOracle } from '../prices';
import { ProposalValidator } from './status';
import { blockCount } from '../global';
import Masternode from '../masternode.js';
import ProposalsTable from './ProposalsTable.vue';
import Flipdown from './Flipdown.vue';

const strCurrency = 'usd';
const price = ref(0);
watch(
    strCurrency,
    async () => {
        price.value = await cOracle.getPrice(strCurrency);
    },
    { immediate: true }
);

const proposals = ref([]);
const contestedProposals = ref([]);
const nextSuperBlock = ref(0);
const masternodeCount = ref(1);
const allocatedBudget = computed(() => {
    const proposalValidator = new ProposalValidator(masternodeCount.value);
    return proposals.value.reduce(
        (acc, p) =>
            acc + p.Allotted * Number(proposalValidator.validate(p).passing),
        0
    );
});
const flipdownTimeStamp = ref(0);

function numberToCurrency(number, price) {
    return (number * price).toLocaleString('en-gb', ',', '.', {
        style: 'currency',
    });
}

async function fetchProposals() {
    const arrProposals = await Masternode.getProposals({
        fAllowFinished: false,
    });
    nextSuperBlock.value = await Masternode.getNextSuperblock();
    masternodeCount.value = (await Masternode.getMasternodeCount()).total;

    flipdownTimeStamp.value =
        Date.now() / 1000 + (nextSuperBlock.value - blockCount) * 60;
    proposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays < 100 || a.Ratio > 0.25
    );
    contestedProposals.value = arrProposals.filter(
        (a) => a.Yeas + a.Nays >= 100 && a.Ratio <= 0.25
    );
}
fetchProposals();

/**
 * @typedef {Object} ProposalCache
 * @property {number} nSubmissionHeight - The submission height of the proposal.
 * @property {string} txid - The transaction ID of the proposal (string).
 * @property {boolean} fFetching - Indicates whether the proposal is currently being fetched or not.
 */

/**
 * An array of Proposal Finalisation caches
 * @type {Array<ProposalCache>}
 */
const arrProposalFinalisationCache = [];

/**
 * Asynchronously wait for a Proposal Tx to confirm, then cache the height.
 *
 * Do NOT await unless you want to lock the thread for a long time.
 * @param {ProposalCache} cProposalCache - The proposal cache to wait for
 * @returns {Promise<boolean>} Returns `true` once the block height is cached
 */
async function waitForSubmissionBlockHeight(cProposalCache) {
    let nHeight = null;

    // Wait in a permanent throttled loop until we successfully fetch the block
    const cNet = getNetwork();
    while (true) {
        // If a proposal is already fetching, then consequtive calls will be rejected
        cProposalCache.fFetching = true;

        // Attempt to fetch the submission Tx (may not exist yet!)
        let cTx = null;
        try {
            cTx = await cNet.getTxInfo(cProposalCache.txid);
        } catch (_) {}

        if (!cTx || !cTx.blockHeight) {
            // Didn't get the TX, throttle the thread by sleeping for a bit, then try again.
            await sleep(30000);
        } else {
            nHeight = cTx.blockHeight;
            break;
        }
    }

    // Update the proposal finalisation cache
    cProposalCache.nSubmissionHeight = nHeight;

    return true;
}

/**
 * Create a Status String for a proposal's finalisation status
 * @param {ProposalCache} cPropCache - The proposal cache to check
 * @returns {string} The string status, for display purposes
 */
function getProposalFinalisationStatus(cPropCache) {
    // Confirmations left until finalisation, by network consensus
    const nConfsLeft =
        cPropCache.nSubmissionHeight +
        cChainParams.current.proposalFeeConfirmRequirement -
        blockCount;

    if (cPropCache.nSubmissionHeight === 0 || blockCount === 0) {
        return translation.proposalFinalisationConfirming;
    } else if (nConfsLeft > 0) {
        return (
            nConfsLeft +
            ' block' +
            (nConfsLeft === 1 ? '' : 's') +
            ' ' +
            translation.proposalFinalisationRemaining
        );
    } else if (Math.abs(nConfsLeft) >= cChainParams.current.budgetCycleBlocks) {
        return translation.proposalFinalisationExpired;
    } else {
        return translation.proposalFinalisationReady;
    }
}

/**
 *
 * @param {Object} cProposal - A local proposal to add to the cache tracker
 * @returns {ProposalCache} - The finalisation cache object pointer of the local proposal
 */
function addProposalToFinalisationCache(cProposal) {
    // If it exists, return the existing cache
    /** @type ProposalCache */
    let cPropCache = arrProposalFinalisationCache.find(
        (a) => a.txid === cProposal.mpw.txid
    );
    if (cPropCache) return cPropCache;

    // Create a new cache
    cPropCache = {
        nSubmissionHeight: 0,
        txid: cProposal.mpw.txid,
        fFetching: false,
    };
    arrProposalFinalisationCache.push(cPropCache);

    // Return the object 'pointer' in the array for further updating
    return cPropCache;
}

async function createProposal() {
    // Must have a wallet
    if (!wallet.isLoaded()) {
        return createAlert('warning', ALERTS.PROPOSAL_IMPORT_FIRST, 4500);
    }
    // Wallet must be encrypted
    if (!(await hasEncryptedWallet())) {
        return createAlert(
            'warning',
            tr(translation.popupProposalEncryptFirst, [
                { button: translation.secureYourWallet },
            ]),
            4500
        );
    }
    // Wallet must be unlocked
    if (
        wallet.isViewOnly() &&
        !(await restoreWallet(translation.walletUnlockProposal))
    ) {
        return;
    }
    // Must have enough funds
    if (wallet.balance * COIN < cChainParams.current.proposalFee) {
        return createAlert('warning', ALERTS.PROPOSAL_NOT_ENOUGH_FUNDS, 4500);
    }

    // Create the popup, wait for the user to confirm or cancel
    const fConfirmed = await confirmPopup({
        title: `<h4>${translation.popupCreateProposal}</h4>
        <span style="color: #af9cc6; font-size: 1rem; margin-bottom: 23px; display: block;">${
            translation.popupCreateProposalCost
        } <b>${cChainParams.current.proposalFee / COIN} ${
            cChainParams.current.TICKER
        }</b></span>`,
        html: `<div style="padding-left: 10px; padding-right: 10px;">
            <p style="margin-bottom: 12px; color: #af9cc6; font-size: 1rem; font-weight: 500;">Proposal name</p>
            <input id="proposalTitle" maxlength="20" placeholder="${
                translation.popupProposalName
            }" style="text-align: start; margin-bottom: 25px;"><br>
            
            <p style="margin-bottom: 12px; color: #af9cc6; font-size: 1rem; font-weight: 500;">URL</p>
            <input id="proposalUrl" maxlength="64" placeholder="https://forum.pivx.org/..." style=" margin-bottom: 25px; text-align: start;"><br>
            
            <p style="margin-bottom: 12px; color: #af9cc6; font-size: 1rem; font-weight: 500;">Duration in cycles</p>
            <input type="number" id="proposalCycles" min="1" max="${
                cChainParams.current.maxPaymentCycles
            }" placeholder="${
            translation.popupProposalDuration
        }" style=" margin-bottom: 25px; text-align: start;"><br>
            
            <p style="margin-bottom: 12px; color: #af9cc6; font-size: 1rem; font-weight: 500;">${
                cChainParams.current.TICKER
            } per cycle</p>
            <input type="number" id="proposalPayment" min="10" max="${
                cChainParams.current.maxPayment / COIN
            }" placeholder="${cChainParams.current.TICKER} ${
            translation.popupProposalPerCycle
        }" style=" margin-bottom: 25px; text-align: start;">${
            !fAdvancedMode ? '<br>' : ''
        }
            
            <p style="margin-bottom: 12px; color: #af9cc6; font-size: 1rem; font-weight: 500; ${
                !fAdvancedMode ? 'display: none' : ''
            }">Proposal Address</p>
            <input id="proposalAddress" maxlength="34" placeholder="${
                translation.popupProposalAddress
            }" style=" margin-bottom: 25px; text-align: start; ${
            !fAdvancedMode ? 'display: none' : ''
        }">
        </div>`,
        wideModal: true,
    });

    // If the user cancelled, then we return
    if (!fConfirmed) return;

    const strTitle = document.getElementById('proposalTitle').value.trim();
    const strUrl = document.getElementById('proposalUrl').value.trim();
    const numCycles = parseInt(
        document.getElementById('proposalCycles').value.trim()
    );
    const numPayment = parseInt(
        document.getElementById('proposalPayment').value.trim()
    );

    // If Advanced Mode is enabled and an address is given, use the provided address, otherwise, generate a new one
    const strAddress =
        document.getElementById('proposalAddress').value.trim() ||
        wallet.getNewAddress(1)[0];
    const nextSuperblock = await Masternode.getNextSuperblock();
    const proposal = {
        name: strTitle,
        url: strUrl,
        nPayments: numCycles,
        start: nextSuperblock,
        address: strAddress,
        monthlyPayment: numPayment * COIN,
    };

    const isValid = Masternode.isValidProposal(proposal);
    if (!isValid.ok) {
        createAlert(
            'warning',
            `${ALERTS.PROPOSAL_INVALID_ERROR} ${isValid.err}`,
            7500
        );
        return;
    }

    const hash = Masternode.createProposalHash(proposal);
    const { ok, txid } = await createAndSendTransaction({
        address: hash,
        amount: cChainParams.current.proposalFee,
        isProposal: true,
    });
    if (ok) {
        proposal.txid = txid;
        const database = await Database.getInstance();

        // Fetch our Account, add the proposal to it
        const account = await database.getAccount();
        account.localProposals.push(proposal);

        // Update the DB
        await database.updateAccount(account);
        createAlert('success', translation.PROPOSAL_CREATED, 10000);
        updateGovernanceTab();
    }
}
</script>

<template>
    <div>
        <div class="col-md-12 title-section float-left rm-pd">
            <span
                style="
                    font: 23px 'Montserrat Regular';
                    text-align: center;
                    display: block;
                    font-weight: 300;
                "
                >Vote on Governance</span
            >
            <h3 data-i18n="navGovernance" class="pivx-bold-title center-text">
                Proposals
            </h3>
            <p data-i18n="govSubtext" class="center-text">
                From this tab you can check the proposals and, if you have a
                masternode, be a part of the <b>DAO</b> and vote!
            </p>
        </div>

        <div class="row mb-5">
            <div class="col-6 col-lg-3 text-center governBudgetCard">
                <span
                    data-i18n="govMonthlyBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Monthly Budget</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span>
                            {{
                                (
                                    cChainParams.current.maxPayment / COIN
                                ).toLocaleString('en-gb', ',', '.')
                            }}
                            {{ ' ' }}
                        </span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >{{ cChainParams.current.TICKER }}</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span>
                            {{
                                numberToCurrency(
                                    cChainParams.current.maxPayment / COIN,
                                    price
                                )
                            }}
                            {{ ' ' }}
                        </span>
                        <span style="color: #7c1dea"
                            >{{ strCurrency.toUpperCase() }}
                        </span>
                    </span>
                </div>
            </div>
            <div class="col-6 col-lg-3 text-center governBudgetCard for-mobile">
                <span
                    data-i18n="govAllocBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Budget Allocated</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span id="allocatedGovernanceBudget"> </span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >PIV</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span>{{ allocatedBudget }} {{ 'hi' }}</span>
                    </span>
                </div>
            </div>
            <div
                class="col-12 col-lg-6 text-center governPayoutTime for-desktopTime"
            >
                <span
                    data-i18n="govNextPayout"
                    style="font-weight: 400; color: #e9deff; font-size: 20px"
                    >Next Treasury Payout</span
                >
                <Flipdown :timeStamp="flipdownTimeStamp" />
            </div>
            <div
                class="col-12 col-lg-3 text-center governBudgetCard for-desktop"
            >
                <span
                    data-i18n="govAllocBudget"
                    style="font-weight: 400; color: #e9deff; font-size: 18px"
                    >Budget Allocated</span
                >

                <div
                    style="
                        width: 180px;
                        background-color: #3b1170;
                        margin-top: 11px;
                        border-radius: 9px;
                        padding-left: 13px;
                        padding-right: 13px;
                        padding-bottom: 6px;
                        padding-top: 4px;
                    "
                >
                    <span style="font-size: 19px; color: #e9deff"
                        ><span id="allocatedGovernanceBudget2">{{
                            allocatedBudget.toLocaleString('en-gb', ',', '.') +
                            ' '
                        }}</span>
                        <span
                            style="
                                color: #9131ea;
                                font-size: 16px;
                                position: relative;
                                top: 1px;
                            "
                            >PIV</span
                        ></span
                    >
                    <hr
                        style="
                            border-top-width: 2px;
                            background-color: #201431;
                            margin-top: 5px;
                            margin-bottom: -2px;
                            margin-left: -13px;
                            margin-right: -13px;
                        "
                    />
                    <span style="font-size: 12px; color: #af9cc6"
                        ><span id="allocatedGovernanceBudgetValue2">{{
                            numberToCurrency(allocatedBudget, price)
                        }}</span>
                        {{ ' ' }}
                        <span style="color: #7c1dea"
                            >{{ strCurrency.toUpperCase() }}
                        </span>
                    </span>
                </div>
            </div>
        </div>

        <div class="pivx-button-small governAdd" onclick="MPW.createProposal()">
            <i class="fas fa-plus"></i>
        </div>

        <div class="dcWallet-activity" style="padding: 16px">
            <ProposalsTable
                :proposals="proposals"
                :masternodeCount="masternodeCount"
                :strCurrency="strCurrency"
                :price="price"
            />
        </div>

        <hr />
        <br />
        <h3
            data-i18n="contestedProposalsTitle"
            style="width: 100%; text-align: center"
        >
            Contested Proposals
        </h3>
        <p
            data-i18n="contestedProposalsDesc"
            style="width: 100%; text-align: center"
        >
            These are proposals that received an overwhelming amount of
            downvotes, making it likely spam or a highly contestable proposal.
        </p>
        <br />
        <ProposalsTable
            :proposals="contestedProposals"
            :masternodeCount="masternodeCount"
            :strCurrency="strCurrency"
            :price="price"
        />
    </div>
</template>
