<script setup>
/**
 * Start a Masternode via a signed network broadcast
 * @param {boolean} fRestart - Whether this is a Restart or a first Start
 */
async function startMasternode(fRestart = false) {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(wallet.getMasterKey());
    if (cMasternode) {
        if (
            wallet.isViewOnly() &&
            !(await restoreWallet(translation.walletUnlockMNStart))
        )
            return;
        if (await cMasternode.start()) {
            const strMsg = fRestart ? ALERTS.MN_RESTARTED : ALERTS.MN_STARTED;
            createAlert('success', strMsg, 4000);
        } else {
            const strMsg = fRestart
                ? ALERTS.MN_RESTART_FAILED
                : ALERTS.MN_START_FAILED;
            createAlert('warning', strMsg, 4000);
        }
    }
}

async function destroyMasternode() {
    const database = await Database.getInstance();
    const cMasternode = await database.getMasternode(wallet.getMasterKey());
    if (cMasternode) {
        // Unlock the coin and update the balance
        wallet.unlockCoin(
            new COutpoint({
                txid: cMasternode.collateralTxId,
                n: cMasternode.outidx,
            })
        );

        database.removeMasternode(wallet.getMasterKey());
        createAlert('success', ALERTS.MN_DESTROYED, 5000);
        updateMasternodeTab();
    }
}

/**
 * Takes an ip address and adds the port.
 * If it's a tor address, ip.onion:port will be used (e.g. expyuzz4wqqyqhjn.onion:12345)
 * If it's an IPv4 address, ip:port will be used, (e.g. 127.0.0.1:12345)
 * If it's an IPv6 address, [ip]:port will be used, (e.g. [::1]:12345)
 * @param {String} ip - Ip address with or without port
 * @returns {String}
 */
function parseIpAddress(ip) {
    // IPv4 or tor without port
    if (ip.match(/\d+\.\d+\.\d+\.\d+/) || ip.match(/\w+\.onion/)) {
        return `${ip}:${cChainParams.current.MASTERNODE_PORT}`;
    }

    // IPv4 or tor with port
    if (ip.match(/\d+\.\d+\.\d+\.\d+:\d+/) || ip.match(/\w+\.onion:\d+/)) {
        return ip;
    }

    // IPv6 without port
    if (Address6.isValid(ip)) {
        return `[${ip}]:${cChainParams.current.MASTERNODE_PORT}`;
    }

    const groups = /\[(.*)\]:\d+/.exec(ip);
    if (groups !== null && groups.length > 1) {
        // IPv6 with port
        if (Address6.isValid(groups[1])) {
            return ip;
        }
    }

    // If we haven't returned yet, the address was invalid.
    return null;
}

async function importMasternode() {
    const mnPrivKey = doms.domMnPrivateKey.value;
    const address = parseIpAddress(doms.domMnIP.value);
    if (!address) {
        createAlert('warning', ALERTS.MN_BAD_IP, 5000);
        return;
    }
    if (!mnPrivKey) {
        createAlert('warning', ALERTS.MN_BAD_PRIVKEY, 5000);
        return;
    }

    let collateralTxId;
    let outidx;
    let collateralPrivKeyPath;
    doms.domMnIP.value = '';
    doms.domMnPrivateKey.value = '';

    if (!wallet.isHD()) {
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = wallet.getMasternodeUTXOs()[0];
        const balance = wallet.balance;
        // If there's no valid UTXO, exit with a contextual message
        if (!cCollaUTXO) {
            if (balance < cChainParams.current.collateralInSats) {
                // Not enough balance to create an MN UTXO
                const amount =
                    (cChainParams.current.collateralInSats - balance) / COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_NOT_ENOUGH_COLLAT, [
                        { amount: amount },
                        { ticker: ticker },
                    ]),
                    10000
                );
            } else {
                // Balance is capable of a masternode, just needs to be created
                // TODO: this UX flow is weird, is it even possible? perhaps we can re-design this entire function accordingly
                const amount = cChainParams.current.collateralInSats / COIN;
                const ticker = cChainParams.current.TICKER;
                createAlert(
                    'warning',
                    tr(ALERTS.MN_ENOUGH_BUT_NO_COLLAT, [
                        { amount },
                        { ticker },
                    ]),
                    10000
                );
            }
            return;
        }

        collateralTxId = cCollaUTXO.outpoint.txid;
        outidx = cCollaUTXO.outpoint.n;
        collateralPrivKeyPath = 'legacy';
    } else {
        const path = doms.domMnTxId.value;
        let masterUtxo;
        const utxos = wallet.getMasternodeUTXOs();
        for (const u of utxos) {
            if (
                u.value === cChainParams.current.collateralInSats &&
                wallet.getPath(u.script) === path
            ) {
                masterUtxo = u;
            }
        }

        // sanity check:
        if (masterUtxo.value !== cChainParams.current.collateralInSats) {
            return createAlert('warning', ALERTS.MN_COLLAT_NOT_SUITABLE, 10000);
        }
        collateralTxId = masterUtxo.outpoint.txid;
        outidx = masterUtxo.outpoint.n;
        collateralPrivKeyPath = path;
    }
    doms.domMnTxId.value = '';

    const cMasternode = new Masternode({
        walletPrivateKeyPath: collateralPrivKeyPath,
        mnPrivateKey: mnPrivKey,
        collateralTxId: collateralTxId,
        outidx: outidx,
        addr: address,
    });

    await refreshMasternodeData(cMasternode, true);
    await updateMasternodeTab();
}
function isMasternodeUTXO(cUTXO, cMasternode) {
    if (cMasternode?.collateralTxId) {
        const { collateralTxId, outidx } = cMasternode;
        return collateralTxId === cUTXO.id && cUTXO.vout === outidx;
    } else {
        return false;
    }
}

async function updateMasternodeTab() {
    //TODO: IN A FUTURE ADD MULTI-MASTERNODE SUPPORT BY SAVING MNs with which you logged in the past.
    // Ensure a wallet is loaded
    doms.domMnTextErrors.innerHTML = '';
    doms.domAccessMasternode.style.display = 'none';
    doms.domCreateMasternode.style.display = 'none';
    doms.domMnDashboard.style.display = 'none';

    if (!wallet.isLoaded()) {
        doms.domMnTextErrors.innerHTML =
            'Please ' +
            ((await hasEncryptedWallet()) ? 'unlock' : 'import') +
            ' your <b>COLLATERAL WALLET</b> first.';
        return;
    }

    if (!wallet.isSynced) {
        doms.domMnTextErrors.innerHTML =
            'Your wallet is empty or still loading, re-open the tab in a few seconds!';
        return;
    }

    const database = await Database.getInstance();

    let cMasternode = await database.getMasternode();
    // If the collateral is missing (spent, or switched wallet) then remove the current MN
    if (cMasternode) {
        if (
            !wallet.isCoinLocked(
                new COutpoint({
                    txid: cMasternode.collateralTxId,
                    n: cMasternode.outidx,
                })
            )
        ) {
            database.removeMasternode();
            cMasternode = null;
        }
    }

    doms.domControlMasternode.style.display = cMasternode ? 'block' : 'none';

    // first case: the wallet is not HD and it is not hardware, so in case the wallet has collateral the user can check its status and do simple stuff like voting
    if (!wallet.isHD()) {
        doms.domMnAccessMasternodeText.innerHTML =
            doms.masternodeLegacyAccessText;
        doms.domMnTxId.style.display = 'none';
        // Find the first UTXO matching the expected collateral size
        const cCollaUTXO = wallet.getMasternodeUTXOs()[0];

        const balance = wallet.balance;
        if (cMasternode) {
            await refreshMasternodeData(cMasternode);
            doms.domMnDashboard.style.display = '';
        } else if (cCollaUTXO) {
            doms.domMnTxId.style.display = 'none';
            doms.domAccessMasternode.style.display = 'block';
        } else if (balance < cChainParams.current.collateralInSats) {
            // The user needs more funds
            doms.domMnTextErrors.innerHTML =
                'You need <b>' +
                (cChainParams.current.collateralInSats - balance) / COIN +
                ' more ' +
                cChainParams.current.TICKER +
                '</b> to create a Masternode!';
        } else {
            // The user has the funds, but not an exact collateral, prompt for them to create one
            doms.domCreateMasternode.style.display = 'flex';
            doms.domMnTxId.style.display = 'none';
            doms.domMnTxId.innerHTML = '';
        }
    } else {
        doms.domMnTxId.style.display = 'none';
        doms.domMnTxId.innerHTML = '';
        doms.domMnAccessMasternodeText.innerHTML = doms.masternodeHDAccessText;

        // First UTXO for each address in HD
        const mapCollateralPath = new Map();

        // Aggregate all valid Masternode collaterals into a map of Path <--> Collateral
        for (const cUTXO of wallet.getMasternodeUTXOs()) {
            mapCollateralPath.set(wallet.getPath(cUTXO.script), cUTXO);
        }
        const fHasCollateral = mapCollateralPath.size > 0;
        // If there's no loaded MN, but valid collaterals, display the configuration screen
        if (!cMasternode && fHasCollateral) {
            doms.domMnTxId.style.display = 'block';
            doms.domAccessMasternode.style.display = 'block';

            for (const [key] of mapCollateralPath) {
                const option = document.createElement('option');
                option.value = key;
                option.innerText = wallet.getAddressFromPath(key);
                doms.domMnTxId.appendChild(option);
            }
        }

        // If there's no collateral found, display the creation UI
        if (!fHasCollateral && !cMasternode)
            doms.domCreateMasternode.style.display = 'flex';

        // If we a loaded Masternode, display the Dashboard
        if (cMasternode) {
            // Refresh the display
            refreshMasternodeData(cMasternode);
            doms.domMnDashboard.style.display = '';
        }
    }
}

async function refreshMasternodeData(cMasternode, fAlert = false) {
    const cMasternodeData = await cMasternode.getFullData();

    debugLog(DebugTopics.GLOBAL, ' ---- NEW MASTERNODE DATA (Debug Mode) ----');
    debugLog(DebugTopics.GLOBAL, cMasternodeData);
    debugLog(DebugTopics.GLOBAL, '---- END MASTERNODE DATA (Debug Mode) ----');

    // If we have MN data available, update the dashboard
    if (cMasternodeData && cMasternodeData.status !== 'MISSING') {
        doms.domMnTextErrors.innerHTML = '';
        doms.domMnProtocol.innerText = `(${sanitizeHTML(
            cMasternodeData.version
        )})`;
        doms.domMnStatus.innerText = sanitizeHTML(cMasternodeData.status);
        doms.domMnNetType.innerText = sanitizeHTML(
            cMasternodeData.network.toUpperCase()
        );
        doms.domMnNetIP.innerText = cMasternode.addr;
        doms.domMnLastSeen.innerText = new Date(
            cMasternodeData.lastseen * 1000
        ).toLocaleTimeString();
    }

    if (cMasternodeData.status === 'MISSING') {
        doms.domMnTextErrors.innerHTML =
            'Masternode is currently <b>OFFLINE</b>';
        if (
            !wallet.isViewOnly() ||
            (await restoreWallet(translation.walletUnlockCreateMN))
        ) {
            createAlert('warning', ALERTS.MN_OFFLINE_STARTING, 6000);
            // try to start the masternode
            const started = await cMasternode.start();
            if (started) {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_STARTED;
                createAlert('success', ALERTS.MN_STARTED_ONLINE_SOON, 6000);
                const database = await Database.getInstance();
                await database.addMasternode(cMasternode);
                wallet.lockCoin(
                    new COutpoint({
                        txid: cMasternode.collateralTxId,
                        n: cMasternode.outidx,
                    })
                );
            } else {
                doms.domMnTextErrors.innerHTML = ALERTS.MN_START_FAILED;
                createAlert('warning', ALERTS.MN_START_FAILED, 6000);
            }
        }
    } else if (
        cMasternodeData.status === 'ENABLED' ||
        cMasternodeData.status === 'PRE_ENABLED'
    ) {
        if (fAlert)
            createAlert(
                'success',
                `${ALERTS.MN_STATUS_IS} <b> ${sanitizeHTML(
                    cMasternodeData.status
                )} </b>`,
                6000
            );
        const database = await Database.getInstance();
        await database.addMasternode(cMasternode);
        wallet.lockCoin(
            new COutpoint({
                txid: cMasternode.collateralTxId,
                n: cMasternode.outidx,
            })
        );
    } else if (cMasternodeData.status === 'REMOVED') {
        const state = cMasternodeData.status;
        doms.domMnTextErrors.innerHTML = tr(ALERTS.MN_STATE, [
            { state: state },
        ]);
        if (fAlert)
            createAlert(
                'warning',
                tr(ALERTS.MN_STATE, [{ state: state }]),
                6000
            );
    } else {
        // connection problem
        doms.domMnTextErrors.innerHTML = ALERTS.MN_CANT_CONNECT;
        if (fAlert) createAlert('warning', ALERTS.MN_CANT_CONNECT, 6000);
    }

    // Return the data in case the caller needs additional context
    return cMasternodeData;
}
</script>

<template>
    <!-- Create Masternode -->
    <div
        class="modal fade"
        id="createMasternodeModal"
        tabindex="-1"
        aria-labelledby="createMasternodeModalLabel"
        role="dialog"
        aria-hidden="true"
    >
        <div
            class="modal-mask black-text"
            style="z-index: 2000; background-color: rgba(32, 20, 54, 0.86)"
        >
            <div
                class="modal-dialog masternodeModalDialog modal-dialog-centered"
                role="document"
            >
                <div class="modal-content exportKeysModalColor">
                    <div class="modal-header" style="z-index: 101">
                        <button
                            type="button"
                            class="close"
                            data-dismiss="modal"
                            aria-label="Close"
                        >
                            <i class="fa-solid fa-xmark closeCross"></i>
                        </button>
                    </div>
                    <div
                        class="modal-body center-text"
                        style="
                            z-index: 100;
                            margin-top: -35px;
                            padding-bottom: 35px;
                        "
                    >
                        <div class="container">
                            <h4>Create a masternode</h4>
                            <span
                                style="
                                    color: #af9cc6;
                                    margin-bottom: 23px;
                                    display: block;
                                "
                                >This action requires <b>10,000 PIV</b> in
                                collateral.</span
                            >
                            <input class="hide-element" type="text" />
                            <div style="display: block; text-align: left">
                                <p style="margin-bottom: 6px; color: #af9cc6">
                                    Choose your Masternode type
                                </p>
                                <select
                                    id="mnCreateType"
                                    style="display: block; text-align: left"
                                    placeholder="Masternode collateral tx"
                                    class="form-control"
                                >
                                    <option value="VPS">
                                        Self-hosted (a masternode server ran by
                                        you)
                                    </option>
                                    <option value="Third Party">
                                        Third Party (a masternode server ran by
                                        someone else)
                                    </option>
                                </select>
                                <br />
                                <br />
                            </div>

                            <button
                                onclick="MPW.createMasternode()"
                                class="pivx-button-small"
                                style="height: 42px; width: 228px"
                            >
                                <span class="buttoni-text">
                                    <span
                                        id="plus-icon2"
                                        class="plus-icon"
                                    ></span>
                                    Create Masternode</span
                                >
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div>
        <!-- New Masternode list -->
        <div class="d-none">
            <div class="dcWallet-activity">
                <h4 class="mnTopConfigured">4 Masternodes Configured</h4>

                <div class="scrollTable">
                    <div>
                        <table
                            class="table table-responsive table-sm stakingTx masternodeTable table-mobile-scroll"
                        >
                            <thead>
                                <tr>
                                    <th scope="col" style="width: 400px">
                                        Status
                                    </th>
                                    <th scope="col" style="width: 400px">
                                        IP Address
                                    </th>
                                    <th scope="col" style="width: 400px">
                                        Last Seen
                                    </th>
                                    <th scope="col" style="width: 400px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <span
                                            class="masternodeBadges enabledBadge"
                                            >ENABLED</span
                                        >
                                    </td>
                                    <td>
                                        <code
                                            class="wallet-code text-center active ptr"
                                            style="padding: 4px 9px"
                                            >127.0.0.1:12345</code
                                        >
                                    </td>
                                    <td>
                                        <span class="mnLastSeen">27/02/24</span>
                                    </td>
                                    <td
                                        class="text-right"
                                        style="padding: 0px; padding-top: 11px"
                                    >
                                        <button
                                            class="pivx-button-small"
                                            style="
                                                height: 43px;
                                                width: 43px;
                                                padding-left: 13px;
                                            "
                                        >
                                            <span class="buttoni-text">
                                                <span class="plus-icon">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 32 32"
                                                    >
                                                        <path
                                                            d="M32,15.8c0.1,8.5-6.5,15.7-15,16.2c-0.3,0-0.7,0-1,0c-3.4,0-6.8-1.1-9.6-3.2l-1.9,2.1
                                          c-0.2,0.3-0.7,0.3-0.9,0.1c-0.1-0.1-0.2-0.2-0.2-0.3l-2-8.1c-0.1-0.4,0.1-0.7,0.5-0.8c0.1,0,0.2,0,0.2,0l8.2,1
                                          c0.4,0,0.6,0.4,0.6,0.7c0,0.1-0.1,0.3-0.2,0.4l-1.8,2c5.4,3.8,12.9,2.5,16.7-2.9c1.5-2.1,2.3-4.6,2.2-7.2c0-0.4,0.1-0.8,0.4-1.1
                                          c0.3-0.3,0.7-0.4,1.1-0.3l1.3,0.2c0.3,0,0.6,0.2,0.8,0.4C31.9,15.1,32,15.4,32,15.8z M3.6,17.4C3.9,17.1,4,16.7,4,16.3
                                          C3.9,9.6,9.1,4.2,15.7,4c2.6-0.1,5.1,0.7,7.2,2.2l-1.8,2c-0.2,0.3-0.2,0.7,0.1,0.9c0.1,0.1,0.2,0.1,0.4,0.2l8.2,1
                                          c0.4,0,0.7-0.2,0.7-0.6c0-0.1,0-0.2,0-0.2l-2-8.1c-0.1-0.4-0.4-0.6-0.8-0.5c-0.1,0-0.3,0.1-0.3,0.2l-1.9,2.1C22.8,1.1,19.5,0,16,0
                                          c-0.3,0-0.6,0-1,0C6.5,0.5-0.1,7.7,0,16.2c0,0.3,0.1,0.7,0.3,0.9c0.2,0.2,0.5,0.4,0.8,0.4l1.3,0.2C2.9,17.8,3.3,17.6,3.6,17.4z"
                                                        />
                                                    </svg>
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            class="pivx-button-small"
                                            style="
                                                height: 43px;
                                                width: 43px;
                                                padding-left: 13px;
                                            "
                                        >
                                            <span class="buttoni-text">
                                                <span class="plus-icon">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 32 32"
                                                    >
                                                        <path
                                                            d="M4.5,29.4C4.5,30.9,5.6,32,7,32H25c1.4,0,2.6-1.1,2.6-2.6V9h-23V29.4z M21.1,14.1c0-0.7,0.6-1.3,1.3-1.3
                                          c0.7,0,1.3,0.6,1.3,1.3v12.8c0,0.7-0.6,1.3-1.3,1.3c-0.7,0-1.3-0.6-1.3-1.3V14.1z M14.7,14.1c0-0.7,0.6-1.3,1.3-1.3
                                          c0.7,0,1.3,0.6,1.3,1.3v12.8c0,0.7-0.6,1.3-1.3,1.3c-0.7,0-1.3-0.6-1.3-1.3V14.1z M8.3,14.1c0-0.7,0.6-1.3,1.3-1.3
                                          c0.7,0,1.3,0.6,1.3,1.3v12.8c0,0.7-0.6,1.3-1.3,1.3c-0.7,0-1.3-0.6-1.3-1.3V14.1z M28.8,3.8v2.6H3.2V3.8c0-0.7,0.6-1.3,1.3-1.3h7.7
                                          V1.3c0-0.7,0.6-1.3,1.3-1.3h5.1c0.7,0,1.3,0.6,1.3,1.3v1.3h7.7C28.2,2.6,28.8,3.1,28.8,3.8z"
                                                        />
                                                    </svg>
                                                </span>
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <span
                                            class="masternodeBadges missingBadge"
                                            >MISSING</span
                                        >
                                    </td>
                                    <td>
                                        <code
                                            class="wallet-code text-center active ptr"
                                            style="padding: 4px 9px"
                                            >127.0.0.1:12345</code
                                        >
                                    </td>
                                    <td>
                                        <span class="mnLastSeen">27/02/24</span>
                                    </td>
                                    <td>Btns</td>
                                </tr>
                                <tr>
                                    <td>
                                        <span
                                            class="masternodeBadges preEnabledBadge"
                                            >PRE_ENABLED</span
                                        >
                                    </td>
                                    <td>
                                        <code
                                            class="wallet-code text-center active ptr"
                                            style="padding: 4px 9px"
                                            >127.0.0.1:12345</code
                                        >
                                    </td>
                                    <td>
                                        <span class="mnLastSeen">27/02/24</span>
                                    </td>
                                    <td>Btns</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div
                style="
                    display: flex;
                    justify-content: center;
                    width: 100%;
                    margin-top: 25px;
                    margin-bottom: 50px;
                "
            >
                <button
                    class="pivx-button-small"
                    style="height: 42px; width: 228px"
                    data-toggle="modal"
                    data-target="#createMasternodeModal"
                >
                    <span class="buttoni-text">
                        <span id="plus-icon3" class="plus-icon"></span>
                        Add Masternode</span
                    >
                </button>
            </div>

            <div class="dcWallet-activity">
                <span
                    style="
                        color: rgb(233, 222, 255);
                        display: flex;
                        justify-content: center;
                        margin-bottom: 24px;
                        margin-top: 20px;
                    "
                >
                    <span data-i18n="rewardHistory" style="font-size: 24px"
                        >Reward History</span
                    >
                    <span class="rewardsBadge" style="font-size: 20px">
                        0<span style="opacity: 0.55; font-size: 15px">.00</span>
                        <span style="font-size: 15px; opacity: 0.55">tPIV</span>
                    </span>
                </span>
                <div class="scrollTable">
                    <table
                        class="table table-responsive table-sm stakingTx table-mobile-scroll"
                    >
                        <thead>
                            <tr>
                                <th scope="col" class="tx1">Time</th>
                                <th scope="col" class="tx2">ID</th>
                                <th scope="col" class="tx3">Amount</th>
                                <th scope="col" class="tx4"></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="">
            <div
                class="col-md-12 title-section float-left rm-pd center-text"
                style="padding-bottom: 0px"
            >
                <h3 style="margin-bottom: -2px">
                    <span data-i18n="mnControlYour" style="font-weight: 300"
                        >Control your</span
                    >
                </h3>
                <h3 data-i18n="navMasternode" class="pivx-bold-title">
                    Masternode
                </h3>
                <p data-i18n="mnSubtext" style="color: #beaed0">
                    From this tab you can create and access one or more
                    masternodes
                </p>
            </div>

            <div style="display: block">
                <br />
                <p id="mnTextErrors" class="center-text"></p>
            </div>

            <!-- IMPORT MASTERNODE -->
            <div
                id="accessMasternode"
                class="dashboard-item"
                style="display: none; width: 100%"
            >
                <div class="container">
                    <div id="accessMasternodeText"></div>
                    <br />
                    <input class="hide-element" type="text" />
                    <div style="display: block">
                        <input
                            type="password"
                            id="mnPrivateKey"
                            placeholder="Masternode Private Key"
                        />
                        <input
                            type="text"
                            id="mnIP"
                            placeholder="Masternode ip address"
                        />
                        <select
                            id="mnTxId"
                            style="display: block"
                            placeholder="Masternode collateral tx"
                            class="form-control"
                        ></select>
                        <button
                            class="pivx-button-big"
                            onclick="MPW.importMasternode()"
                        >
                            <span class="buttoni-icon"
                                ><i
                                    class="fas fa-file-upload fa-tiny-margin"
                                ></i
                            ></span>
                            <span class="buttoni-text" id="importMnText"
                                >Access Masternode</span
                            >
                            <span class="buttoni-arrow">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 32 32"
                                >
                                    <path
                                        d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"
                                    ></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <!-- // IMPORT MASTERNODE -->
            <br />

            <div
                id="createMasternode"
                style="display: flex; justify-content: center; width: 100%"
            >
                <button
                    class="pivx-button-small"
                    style="height: 42px; width: 228px"
                    data-toggle="modal"
                    data-target="#createMasternodeModal"
                >
                    <span class="buttoni-text">
                        <span id="plus-icon" class="plus-icon"></span>
                        Create Masternode</span
                    >
                </button>
            </div>

            <div id="mnDashboard" class="staking-banner-bottom">
                <div class="stake-box large-box col-md-4">
                    <h4
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                    >
                        Status
                        <small id="mnProtocol" style="opacity: 0.5"></small>
                    </h4>
                    <h2
                        id="mnStatus"
                        class="stake-balances"
                        style="
                            overflow-wrap: anywhere;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            position: absolute;
                            width: 100%;
                            padding: 10px;
                        "
                    ></h2>
                </div>
                <div class="stake-box large-box col-md-4">
                    <h4
                        id="mnNetType"
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                    ></h4>
                    <h2
                        id="mnNetIP"
                        class="stake-balances"
                        style="
                            overflow-wrap: anywhere;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            position: absolute;
                            width: 100%;
                            padding: 10px;
                            font-family: mono !important;
                            font-size: x-large;
                        "
                    ></h2>
                </div>
                <div class="stake-box large-box col-md-4">
                    <h4
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                    >
                        Last Seen
                    </h4>
                    <h2
                        id="mnLastSeen"
                        class="stake-balances"
                        style="
                            overflow-wrap: anywhere;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            position: absolute;
                            width: 100%;
                            padding: 10px;
                            font-size: xx-large;
                        "
                    ></h2>
                </div>
            </div>

            <br />

            <center id="controlMasternode" style="display: none; width: 100%">
                <button
                    class="pivx-button-big"
                    onclick="MPW.destroyMasternode()"
                    style="margin: 20px; font-weight: 550 !important"
                >
                    <span class="buttoni-icon"
                        ><i class="fas fa-burn fa-tiny-margin"></i
                    ></span>
                    <span class="buttoni-text" id="importMnText"
                        >Destroy Masternode</span
                    >
                </button>

                <button
                    class="pivx-button-big"
                    onclick="MPW.startMasternode(true)"
                    style="margin: 20px; font-weight: 550 !important"
                >
                    <span class="buttoni-icon"
                        ><i class="fas fa-redo-alt fa-tiny-margin"></i
                    ></span>
                    <span class="buttoni-text" id="importMnText"
                        >Restart Masternode</span
                    >
                </button>
            </center>
        </div>
    </div>
</template>
