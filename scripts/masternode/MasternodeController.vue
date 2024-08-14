<script setup>
import { toRefs, ref } from 'vue';
import Masternode from '../masternode';

const props = defineProps({ masternode: Masternode });
const emit = defineEmits(['start']);
const { masternode } = toRefs(props);
const status = ref();
const lastSeen = ref();
async function updateMasternodeData() {
    const data = await masternode.value.getFullData();
    const lastSeen = new Date(data.lastseen).toLocaleTimeString();
    status.value = await masternode.value.getStatus();
}
updateMasternodeData();
</script>

<template>
    <div>
        <div class="">
            <!-- IMPORT MASTERNODE -->
            <!-- // IMPORT MASTERNODE -->
            <br />

            <div id="mnDashboard" class="staking-banner-bottom">
                <div class="stake-box large-box col-md-4">
                    <h4
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                    >
                        Status
                        <small id="mnProtocol" style="opacity: 0.5">
                            {{ status }}
                        </small>
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
