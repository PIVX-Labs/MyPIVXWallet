<script setup>
import { toRef } from 'vue';
const props = defineProps({
    proposal: Object,
});
const proposal = toRef(props, 'proposal');
</script>
<template>
    <div style="vertical-align: middle">
        <a
            class="governLink"
            style="color: white"
            :href="proposal.URL"
            target="_blank"
            rel="noopener noreferrer"
            ><b
                >{{ proposal.Name }}
                <span class="governLinkIco"
                    ><i
                        class="fa-solid fa-arrow-up-right-from-square"
                    ></i></span></b></a
        ><br />
        <a
            class="governLink"
            style="
                border-radius: 8px;
                background-color: #1a122d;
                padding: 6px 9px;
                font-size: 14px;
                color: #861ff7;
            "
            onclick="MPW.openExplorer('${
            cProposal.PaymentAddress
        }')"
            ><i class="fa-solid fa-user-large" style="margin-right: 5px"></i
            ><b>{{ proposal.PaymentAddress.slice(0, 10) }}...</b>
        </a>
    </div>
</template>
