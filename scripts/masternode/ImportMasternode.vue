<script setup></script>
<template>
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
                        ><i class="fas fa-file-upload fa-tiny-margin"></i
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
</template>
