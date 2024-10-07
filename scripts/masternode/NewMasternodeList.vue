<script setup>
// New masternode list for multi-masternode.
// Currently unused. It will be implemented in a subsequent PR
</script>

<template>
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
                                <th scope="col" style="width: 400px">Status</th>
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
                                    <span class="masternodeBadges enabledBadge"
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
                                    <span class="masternodeBadges missingBadge"
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
</template>
