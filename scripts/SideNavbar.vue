<script setup>
import { computed, watch } from 'vue';
import { useSettings } from './composables/use_settings';

const settings = useSettings();

const show = computed(() => {
    return settings.isTestnet.value || settings.debug.value;
});
watch(settings.debug, () => {
    console.log(settings.debug.value);
});
</script>

<template>
    <div class="form-inline my-2 my-lg-0" v-show="show">
        <ul class="navbar-nav mr-auto small-dark-bg navBarActions">
            <li class="nav-item">
                <span
                    class="nav-link ptr"
                    id="Debug"
                    @click="settings.debug.value = !settings.debug.value"
                    v-show="settings.debug.value"
                    data-toggle="tooltip"
                    data-html="true"
                    data-placement="bottom"
                    title="<b>Debug Mode</b><br>You're in debug mode, which is logging additional verbose data in the console"
                    ><i class="fa-solid fa-bug"></i
                ></span>
            </li>
            <li class="nav-item">
                <span
                    class="nav-link ptr"
                    id="Testnet"
                    @click="
                        settings.isTestnet.value = !settings.isTestnet.value
                    "
                    v-show="settings.isTestnet.value"
                    data-toggle="tooltip"
                    data-html="true"
                    data-placement="bottom"
                    title="<b>Testnet Mode</b><br>You're currently using MPW on the Testnet Network"
                    ><i class="fa-solid fa-network-wired"></i
                ></span>
            </li>
        </ul>
    </div>
</template>
