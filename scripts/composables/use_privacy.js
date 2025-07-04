import { defineStore } from 'pinia';
import { fPublicMode, togglePublicMode } from '../settings.js';
import { ref, watch } from 'vue';
import { doms } from '../global.js';

export const usePrivacy = defineStore('privacy', () => {
    const publicMode = ref(fPublicMode);
    watch(publicMode, (publicMode) => {
        doms.domNavbar.classList.toggle('active', !publicMode);
        doms.domLightBackground.style.opacity = publicMode ? '1' : '0';

        // Save the mode state to DB
        togglePublicMode(publicMode);
    });
    return { publicMode };
});
