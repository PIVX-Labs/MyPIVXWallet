<script setup>
import { cChainParams } from './chain_params.js';
import { ref, computed } from 'vue';

const balance = ref(0);
const ticker = computed(() => cChainParams.current.TICKER);

function reload() {}

</script>

<template>
    <div class="col-12 p-0 mb-5">
        <center>
            <div class="dcWallet-balances mb-4">
                <div class="row lessBot p-0">
                    <div
                        class="col-6 d-flex dcWallet-topLeftMenu"
                        style="justify-content: flex-start"
                    >
                        <h3 class="noselect balance-title">
                            <span
                                class="reload noselect"
                                onclick="MPW.refreshChainData()"
                                ><i
                                    id="balanceReload"
                                    class="fa-solid fa-rotate-right"
                                ></i
                            ></span>
                        </h3>
                    </div>

                    <div
                        class="col-6 d-flex dcWallet-topRightMenu"
                        style="justify-content: flex-end"
                    >
                        <div class="btn-group dropleft">
                            <i
                                class="fa-solid fa-ellipsis-vertical"
                                style="width: 20px"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                            ></i>
                            <div class="dropdown">
                                <div class="dropdown-move">
                                    <div
                                        class="dropdown-menu"
                                        aria-labelledby="dropdownMenuButton"
                                    >
                                        <a
                                            class="dropdown-item ptr"
                                            onclick="MPW.renderWalletBreakdown()"
                                            data-toggle="modal"
                                            data-target="#walletBreakdownModal"
                                        >
                                            <i
                                                class="fa-solid fa-chart-pie"
                                            ></i>
                                            <span data-i18n="balanceBreakdown"
                                                >Balance Breakdown</span
                                            >
                                        </a>
                                        <a
                                            class="dropdown-item ptr"
                                            onclick="MPW.openExplorer()"
                                        >
                                            <i
                                                class="fa-solid fa-magnifying-glass"
                                            ></i>
                                            <span data-i18n="viewOnExplorer"
                                                >View on Explorer</span
                                            >
                                        </a>
                                        <a
                                            class="dropdown-item ptr"
                                            onclick="MPW.guiRenderContacts()"
                                            data-toggle="modal"
                                            data-target="#contactsModal"
                                        >
                                            <i
                                                class="fa-solid fa-address-book"
                                            ></i>
                                            <span data-i18n="contactsBook"
                                                >Contacts</span
                                            >
                                        </a>
                                        <a
                                            id="guiExportWalletItem"
                                            class="dropdown-item ptr"
                                            data-toggle="modal"
                                            data-target="#exportPrivateKeysModal"
                                            data-backdrop="static"
                                            data-keyboard="false"
                                            onclick="MPW.toggleExportUI()"
                                        >
                                            <i class="fas fa-key"></i>
                                            <span data-i18n="export"
                                                >Export</span
                                            >
                                        </a>
                                        <a
                                            class="dropdown-item ptr"
                                            id="guiNewAddress"
                                            data-toggle="modal"
                                            data-target="#qrModal"
                                            onclick="MPW.wallet.getNewAddress({updateGUI: true, verify: true});"
                                        >
                                            <i class="fas fa-sync-alt"></i>
                                            <span data-i18n="refreshAddress"
                                                >Refresh address</span
                                            >
                                        </a>
                                        <a
                                            class="dropdown-item ptr"
                                            data-toggle="modal"
                                            data-target="#redeemCodeModal"
                                        >
                                            <i class="fa-solid fa-gift"></i>
                                            <span data-i18n="redeemOrCreateCode"
                                                >Redeem or Create Code</span
                                            >
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <canvas
                    id="identicon"
                    class="innerShadow"
                    style="width: 65px; height: 65px"
                    data-jdenticon-value=""
                ></canvas
                ><br />
                <span
                    class="ptr"
                    onclick="MPW.renderWalletBreakdown()"
                    data-toggle="modal"
                    data-target="#walletBreakdownModal"
                >
                    <span class="dcWallet-pivxBalance" id="guiBalance"></span>
                    <span id="guiBalanceTicker" class="dcWallet-pivxTicker"
                        >PIV</span
                    >
                    <i
                        class="fa-solid fa-plus"
                        style="opacity: 0.5; position: relative; left: 2px"
                    ></i>
                </span>
                <br />
                <div class="dcWallet-usdBalance">
                    <span id="guiBalanceValue" class="dcWallet-usdValue"
                        >$-</span
                    >
                    <span id="guiBalanceValueCurrency" class="dcWallet-usdValue"
                        >USD</span
                    >
                </div>

                <div class="row lessTop p-0">
                    <div
                        class="col-6 d-flex"
                        style="justify-content: flex-start"
                    >
                        <div
                            class="dcWallet-btn-left"
                            data-i18n="send"
                            onclick="MPW.toggleBottomMenu('transferMenu', 'transferAnimation')"
                        >
                            Send
                        </div>
                    </div>

                    <div class="col-6 d-flex" style="justify-content: flex-end">
                        <div
                            class="dcWallet-btn-right"
                            data-i18n="receive"
                            onclick="MPW.guiRenderCurrentReceiveModal()"
                            data-toggle="modal"
                            data-target="#qrModal"
                        >
                            Receive
                        </div>
                    </div>
                </div>
            </div>
        </center>
    </div>
</template>
