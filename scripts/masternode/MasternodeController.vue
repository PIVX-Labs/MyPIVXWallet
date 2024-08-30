<script setup>
import { toRefs, ref, watch } from 'vue';
import Masternode from '../masternode';
import { createAlert } from '../misc';
import { ALERTS } from '../i18n';

const props = defineProps({ masternode: Masternode });
const emit = defineEmits(['start', 'destroy']);
const { masternode } = toRefs(props);
const status = ref();
watch(status, (status) => {
    if (status === 'MISSING') {
        createAlert('warning', ALERTS.MN_OFFLINE_STARTING, 6000);
        emit('start', { restart: false });
    }
});
const lastSeen = ref();
const protocol = ref();
const netType = ref();
const ip = ref();
async function updateMasternodeData() {
    const data = await masternode.value.getFullData();
    lastSeen.value = new Date(data.lastseen).toLocaleTimeString() || 'Unknown';
    status.value = await masternode.value.getStatus();
    protocol.value = data.version;
    netType.value = data?.network?.toUpperCase() || 'Unknown';
    ip.value = masternode.value.addr;
}
watch(masternode, updateMasternodeData, { immediate: true });
</script>

<template>
    <div>
        <div class="">
            <br />

            <div id="mnDashboard" class="staking-banner-bottom">
                <div class="stake-box large-box col-md-4">
                    <h4
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                    >
                        Status
                        <small
                            id="mnProtocol"
                            style="opacity: 0.5"
                            data-testid="mnProtocol"
                        >
                            {{ protocol }}
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
                        data-testid="mnStatus"
                    >
                        {{ status }}
                    </h2>
                </div>
                <div class="stake-box large-box col-md-4">
                    <h4
                        class="stake-balances"
                        style="background-color: #2c0044; border-radius: 10px"
                        data-testid="mnNetType"
                    >
                        {{ netType }}
                    </h4>
                    <h2
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
                        data-testid="mnIp"
                    >
                        {{ ip }}
                    </h2>
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
                        data-testid="mnLastSeen"
                    >
                        {{ lastSeen }}
                    </h2>
                </div>
            </div>

            <br />

            <center>
                <button
                    class="pivx-button-big"
                    @click="emit('destroy')"
                    style="margin: 20px; font-weight: 550 !important"
                    data-testid="destroyButton"
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
                    @click="emit('start', { restart: true })"
                    style="margin: 20px; font-weight: 550 !important"
                    data-testid="restartButton"
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
