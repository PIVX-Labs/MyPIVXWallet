<script setup>
import { translation } from '../i18n.js';
const emit = defineEmits(['vote']);
</script>

<template>
    <div class="row pb-2">
        <div class="col-5 fs-13 fw-600">
            <div class="governMobDot"></div>
            {{ translation.govTableVote }}
        </div>
        <div class="col-7">
            <div
                class="pivx-button-outline pivx-button-outline-small govNoBtnMob"
                style="width: fit-content"
                @click="emit('vote', false)"
            >
                <span>No</span>
            </div>
            <button
                class="pivx-button-small govYesBtnMob"
                @click="emit('vote', true)"
            >
                Yes
            </button>
        </div>
    </div>
</template>
