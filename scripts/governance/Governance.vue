<script setup>
import { COIN, cChainParams } from '../chain_params';
import { watch, ref } from 'vue';
import ProposalsTable from './ProposalsTable.vue';
import Masternode from '../masternode.js';
/** A lock to prevent rendering the Governance Dashboard multiple times */
let fRenderingGovernance = false;
watch(cChainParams.current.isTestnet, () => {
    if (cChainParams.current.isTestnet) {
        // Reset flipdown
        governanceFlipdown = null;
        doms.domFlipdown.innerHTML = '';
    }
});
const proposals = ref([]);
const contestedProposals = ref([]);
const nextSuperBlock = ref(0);
const masternodeCount = ref(1);

async function fetchProposals() {
    const arrProposals = await Masternode.getProposals({
        fAllowFinished: true,
    });
    const nSuperblock = await Masternode.getNextSuperblock();
    // The estimated time to the superblock (using the block target and remaining blocks)
    /*const nTimestamp =
         Date.now() / 1000 + (nSuperblock - blockCount) * 60;
     governanceFlipdown = new FlipDown(nTimestamp).start();*/
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

/**
 * Render Governance proposal objects to a given Proposal category
 * @param {Array<object>} arrProposals - The proposals to render
 * @param {boolean} fContested - The proposal category
 */
async function renderProposals(arrProposals, fContested) {
    // Update tota budget in user's currency
    const nPrice = cOracle.getCachedPrice(strCurrency);
    const nCurrencyValue = (cChainParams.current.maxPayment / COIN) * nPrice;
    const { nValue, cLocale } = optimiseCurrencyLocale(nCurrencyValue);
    doms.domTotalGovernanceBudgetValue.innerHTML =
        nValue.toLocaleString('en-gb', cLocale) +
        ' <span style="color:#7C1DEA;">' +
        strCurrency.toUpperCase() +
        '</span>';

    // Select the table based on the proposal category
    const domTable = fContested
        ? doms.domGovProposalsContestedTableBody
        : doms.domGovProposalsTableBody;

    // Render the proposals in the relevent table
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode();

    if (!fContested) {
        const localProposals =
            (await database.getAccount())?.localProposals?.map((p) => {
                return {
                    Name: p.name,
                    URL: p.url,
                    PaymentAddress: p.address,
                    MonthlyPayment: p.monthlyPayment / COIN,
                    RemainingPaymentCount: p.nPayments,
                    TotalPayment: p.nPayments * (p.monthlyPayment / COIN),
                    Yeas: 0,
                    Nays: 0,
                    local: true,
                    Ratio: 0,
                    IsEstablished: false,
                    mpw: p,
                };
            }) || [];
        arrProposals = localProposals.concat(arrProposals);
    }
    arrProposals = await Promise.all(
        arrProposals.map(async (p) => {
            return {
                YourVote:
                    cMasternode && p.Hash
                        ? await cMasternode.getVote(p.Name, p.Hash)
                        : null,
                ...p,
            };
        })
    );

    // Fetch the Masternode count for proposal status calculations
    const cMasternodes = await Masternode.getMasternodeCount();

    let totalAllocatedAmount = 0;

    // Wipe the current table and start rendering proposals
    let i = 0;
    domTable.innerHTML = '';
    for (const cProposal of arrProposals) {
        const domRow = domTable.insertRow();

        const domStatus = domRow.insertCell();
        domStatus.classList.add('governStatusCol');
        if (!fContested) {
            domStatus.setAttribute(
                'onclick',
                `if(document.getElementById('governMob${i}').classList.contains('d-none')) { document.getElementById('governMob${i}').classList.remove('d-none'); } else { document.getElementById('governMob${i}').classList.add('d-none'); }`
            );
        } else {
            domStatus.setAttribute(
                'onclick',
                `if(document.getElementById('governMobCon${i}').classList.contains('d-none')) { document.getElementById('governMobCon${i}').classList.remove('d-none'); } else { document.getElementById('governMobCon${i}').classList.add('d-none'); }`
            );
        }

        // Add border radius to last row
        if (arrProposals.length - 1 == i) {
            domStatus.classList.add('bblr-7p');
        }

        // Net Yes calculation
        const { Yeas, Nays } = cProposal;
        const nNetYes = Yeas - Nays;
        const nNetYesPercent = (nNetYes / cMasternodes.enabled) * 100;

        // Proposal Status calculation
        const nRequiredVotes = cMasternodes.enabled / 10;
        const nMonthlyPayment = parseInt(cProposal.MonthlyPayment);

        // Initial state is assumed to be "Not enough votes"
        let strStatus = translation.proposalFailing;
        let strFundingStatus = translation.proposalNotFunded;
        let strColourClass = 'No';

        // Proposal Status calculations
        if (nNetYes < nRequiredVotes) {
            // Scenario 1: Not enough votes, default scenario
        } else if (!cProposal.IsEstablished) {
            // Scenario 2: Enough votes, but not established
            strFundingStatus = translation.proposalTooYoung;
        } else if (
            nMonthlyPayment + totalAllocatedAmount >
            cChainParams.current.maxPayment / COIN
        ) {
            // Scenario 3: Enough votes, and established, but over-allocating the budget
            strStatus = translation.proposalPassing;
            strFundingStatus = translation.proposalOverBudget;
            strColourClass = 'OverAllocated';
        } else {
            // Scenario 4: Enough votes, and established
            strStatus = translation.proposalPassing;
            strFundingStatus = translation.proposalFunded;
            strColourClass = 'Yes';

            // Allocate this with the budget
            totalAllocatedAmount += nMonthlyPayment;
        }

        // Funding Status and allocation calculations
        if (cProposal.local) {
            // Check the finalisation cache
            const cPropCache = addProposalToFinalisationCache(cProposal);
            if (!cPropCache.fFetching) {
                waitForSubmissionBlockHeight(cPropCache).then(
                    updateGovernanceTab
                );
            }
            const strLocalStatus = getProposalFinalisationStatus(cPropCache);
            const finalizeButton = document.createElement('button');
            finalizeButton.className = 'pivx-button-small ';
            finalizeButton.innerHTML = '<i class="fas fa-check"></i>';

            if (
                strLocalStatus === translation.proposalFinalisationReady ||
                strLocalStatus === translation.proposalFinalisationExpired
            ) {
                finalizeButton.addEventListener('click', async () => {
                    const result = await Masternode.finalizeProposal(
                        cProposal.mpw
                    );

                    const deleteProposal = async () => {
                        // Fetch Account
                        const account = await database.getAccount();

                        // Find index of Account local proposal to remove
                        const nProposalIndex = account.localProposals.findIndex(
                            (p) => p.txid === cProposal.mpw.txid
                        );

                        // If found, remove the proposal and update the account with the modified localProposals array
                        if (nProposalIndex > -1) {
                            // Remove our proposal from it
                            account.localProposals.splice(nProposalIndex, 1);

                            // Update the DB
                            await database.updateAccount(account, true);
                        }
                    };

                    if (result.ok) {
                        deleteProposal();
                        // Create a prompt showing the finalisation success, vote hash, and further details
                        confirmPopup({
                            title: translation.PROPOSAL_FINALISED + ' 🚀',
                            html: `<p><span style="opacity: 0.65; margin: 10px;">${
                                translation.popupProposalFinalisedNote
                            }</span><br><br>${
                                translation.popupProposalVoteHash
                            }<br><span class="mono" style="font-size: small;">${sanitizeHTML(
                                result.hash
                            )}</span><br><br>${
                                translation.popupProposalFinalisedSignoff
                            } 👋</p>`,
                            hideConfirm: true,
                        });
                        updateGovernanceTab();
                    } else {
                        if (result.err === 'unconfirmed') {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_UNCONFIRMED,
                                5000
                            );
                        } else if (result.err === 'invalid') {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_EXPIRED,
                                5000
                            );
                            deleteProposal();
                            updateGovernanceTab();
                        } else {
                            createAlert(
                                'warning',
                                ALERTS.PROPOSAL_FINALISE_FAIL
                            );
                        }
                    }
                });
            } else {
                finalizeButton.style.opacity = 0.5;
                finalizeButton.style.cursor = 'default';
            }

            domStatus.innerHTML = `
            <span style="font-size:12px; line-height: 15px; display: block; margin-bottom:15px;">
                <span style="color:#fff; font-weight:700;">${strLocalStatus}</span><br>
            </span>
            <span class="governArrow for-mobile ptr">
                <i class="fa-solid fa-angle-down"></i>
            </span>`;
            domStatus.appendChild(finalizeButton);
        } else {
            domStatus.innerHTML = `
`;
        }

        // Name, Payment Address and URL hyperlink
        const domNameAndURL = domRow.insertCell();
        domNameAndURL.style = 'vertical-align: middle;';

        // IMPORTANT: Sanitise all of our HTML or a rogue server or malicious proposal could perform a cross-site scripting attack
        domNameAndURL.innerHTML = `<a class="governLink" style="color: white" href="${sanitizeHTML(
            cProposal.URL
        )}" target="_blank" rel="noopener noreferrer"><b>${sanitizeHTML(
            cProposal.Name
        )} <span class="governLinkIco"><i class="fa-solid fa-arrow-up-right-from-square"></i></b></a></span><br>
        <a class="governLink" style="border-radius: 8px; background-color:#1A122D; padding: 6px 9px; font-size: 14px; color:#861ff7;" onclick="MPW.openExplorer('${
            cProposal.PaymentAddress
        }')"><i class="fa-solid fa-user-large" style="margin-right: 5px"></i><b>${sanitizeHTML(
            cProposal.PaymentAddress.slice(0, 10) + '...'
        )}`;

        // Convert proposal amount to user's currency
        const nProposalValue = nMonthlyPayment * nPrice;
        const { nValue } = optimiseCurrencyLocale(nProposalValue);
        const strProposalCurrency = nValue.toLocaleString('en-gb', cLocale);

        // Payment Schedule and Amounts
        const domPayments = domRow.insertCell();
        domPayments.classList.add('for-desktop');
        domPayments.style = 'vertical-align: middle;';
        domPayments.innerHTML = `<span class="governValues"><b>${sanitizeHTML(
            nMonthlyPayment.toLocaleString('en-gb', ',', '.')
        )}</b> <span class="governMarked">${
            cChainParams.current.TICKER
        }</span> <br>
        <b class="governFiatSize">${strProposalCurrency} <span style="color:#7C1DEA;">${strCurrency.toUpperCase()}</span></b></span>

        <span class="governInstallments"> ${sanitizeHTML(
            cProposal['RemainingPaymentCount']
        )} ${
            translation.proposalPaymentsRemaining
        } <span style="font-weight:500;">${sanitizeHTML(
            parseInt(cProposal.TotalPayment).toLocaleString('en-gb', ',', '.')
        )} ${cChainParams.current.TICKER}</span> ${
            translation.proposalPaymentTotal
        }</span>`;

        // Vote Counts and Consensus Percentages
        const domVoteCounters = domRow.insertCell();
        domVoteCounters.classList.add('for-desktop');
        domVoteCounters.style = 'vertical-align: middle;';

        const nLocalPercent = cProposal.Ratio * 100;
        domVoteCounters.innerHTML = `<b>${parseFloat(
            nLocalPercent
        ).toLocaleString(
            'en-gb',
            { minimumFractionDigits: 0, maximumFractionDigits: 1 },
            ',',
            '.'
        )}%</b> <br>
        <small class="votesBg"> <b><div class="votesYes" style="display:inline;"> ${sanitizeHTML(
            Yeas
        )} </div></b> /
        <b><div class="votesNo" style="display:inline;"> ${sanitizeHTML(
            Nays
        )} </div></b></small>
        `;

        // Voting Buttons for Masternode owners (MNOs)
        let voteBtn;
        if (cProposal.local) {
            const domVoteBtns = domRow.insertCell();
            domVoteBtns.classList.add('for-desktop');
            domVoteBtns.style = 'vertical-align: middle;';
            voteBtn = '';
        } else {
            let btnYesClass = 'pivx-button-small govYesBtnMob';
            let btnNoClass =
                'pivx-button-outline pivx-button-outline-small govNoBtnMob';
            if (cProposal.YourVote) {
                if (cProposal.YourVote === 1) {
                    btnYesClass += ' pivx-button-big-yes-gov';
                } else {
                    btnNoClass += ' pivx-button-big-no-gov';
                }
            }

            /*

            <div></div>
            */

            const domVoteBtns = domRow.insertCell();
            domVoteBtns.style =
                'padding-top: 30px; vertical-align: middle; display: flex; justify-content: center; align-items: center;';
            const domNoBtn = document.createElement('div');
            domNoBtn.className = btnNoClass;
            domNoBtn.style.width = 'fit-content';
            domNoBtn.innerHTML = `<span>${translation.no}</span>`;
            domNoBtn.onclick = () => govVote(cProposal.Hash, 2);

            const domYesBtn = document.createElement('button');
            domYesBtn.className = btnYesClass;
            domYesBtn.innerText = translation.yes;
            domYesBtn.onclick = () => govVote(cProposal.Hash, 1);

            // Add border radius to last row
            if (arrProposals.length - 1 == i) {
                domVoteBtns.classList.add('bbrr-7p');
            }

            domVoteBtns.classList.add('for-desktop');
            domVoteBtns.appendChild(domNoBtn);
            domVoteBtns.appendChild(domYesBtn);

            domNoBtn.setAttribute(
                'onclick',
                `MPW.govVote('${cProposal.Hash}', 2)`
            );
            domYesBtn.setAttribute(
                'onclick',
                `MPW.govVote('${cProposal.Hash}', 1);`
            );
            voteBtn = domNoBtn.outerHTML + domYesBtn.outerHTML;
        }

        // Create extended row for mobile
        const mobileDomRow = domTable.insertRow();
        const mobileExtended = mobileDomRow.insertCell();
        mobileExtended.style = 'vertical-align: middle;';
        if (!fContested) {
            mobileExtended.id = `governMob${i}`;
        } else {
            mobileExtended.id = `governMobCon${i}`;
        }
        mobileExtended.colSpan = '2';
        mobileExtended.classList.add('text-left');
        mobileExtended.classList.add('d-none');
        mobileExtended.classList.add('for-mobile');
        mobileExtended.innerHTML = `
        <div class="row pt-2">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTablePayment}
            </div>
            <div class="col-7">
                <span class="governValues"><b>${sanitizeHTML(
                    nMonthlyPayment.toLocaleString('en-gb', ',', '.')
                )}</b> <span class="governMarked">${
            cChainParams.current.TICKER
        }</span> <span style="margin-left:10px; margin-right: 2px;" class="governMarked governFiatSize">${strProposalCurrency}</span></b></span>
        
                <span class="governInstallments"> ${sanitizeHTML(
                    cProposal['RemainingPaymentCount']
                )} ${translation.proposalPaymentsRemaining} <b>${sanitizeHTML(
            parseInt(cProposal.TotalPayment).toLocaleString('en-gb', ',', '.')
        )} ${cChainParams.current.TICKER}</b> ${
            translation.proposalPaymentTotal
        }</span>
            </div>
        </div>
        <hr class="governHr">
        <div class="row">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTableVotes}
            </div>
            <div class="col-7">
                <b>${parseFloat(nLocalPercent).toLocaleString(
                    'en-gb',
                    { minimumFractionDigits: 0, maximumFractionDigits: 1 },
                    ',',
                    '.'
                )}%</b>
                <small class="votesBg"> <b><div class="votesYes" style="display:inline;"> ${sanitizeHTML(
                    Yeas
                )} </div></b> /
                <b><div class="votesNo" style="display:inline;"> ${sanitizeHTML(
                    Nays
                )} </div></b></small>
            </div>
        </div>
        <hr class="governHr">
        <div class="row pb-2">
            <div class="col-5 fs-13 fw-600">
                <div class="governMobDot"></div> ${translation.govTableVote}
            </div>
            <div class="col-7">
                ${voteBtn}
            </div>
        </div>`;

        i++;
    }

    // Show allocated budget
    if (!fContested) {
        const strAlloc = sanitizeHTML(
            totalAllocatedAmount.toLocaleString('en-gb')
        );
        doms.domAllocatedGovernanceBudget.innerHTML = strAlloc;
        doms.domAllocatedGovernanceBudget2.innerHTML = strAlloc;

        // Update allocated budget in user's currency
        const nCurrencyValue = totalAllocatedAmount * nPrice;
        const { nValue } = optimiseCurrencyLocale(nCurrencyValue);
        const strAllocCurrency =
            nValue.toLocaleString('en-gb', cLocale) +
            ' <span style="color:#7C1DEA;">' +
            strCurrency.toUpperCase() +
            '</span>';
        doms.domAllocatedGovernanceBudgetValue.innerHTML = strAllocCurrency;
        doms.domAllocatedGovernanceBudgetValue2.innerHTML = strAllocCurrency;
    }
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
                        ><span>-</span>
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
                            {{ cChainParams.current.maxPayment / COIN }}
                        </span></span
                    >
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
                        ><span id="allocatedGovernanceBudget">-</span>
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
                        ><span id="allocatedGovernanceBudgetValue">-</span>
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
                <div id="flipdown" class="flipdown"></div>
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
                        ><span id="allocatedGovernanceBudget2">-</span>
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
                        ><span id="allocatedGovernanceBudgetValue2">-</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="pivx-button-small governAdd" onclick="MPW.createProposal()">
            <i class="fas fa-plus"></i>
        </div>

        <div class="dcWallet-activity" style="padding: 16px">
            <ProposalsTable :proposals="proposals" />
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
        <ProposalsTable :proposals="contestedProposals" />
    </div>
</template>
