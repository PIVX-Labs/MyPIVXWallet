import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as misc from '../../scripts/misc.js';
import { nextTick } from 'vue';
import { mount as vueMount } from '@vue/test-utils';
import StakeBalance from '../../scripts/stake/StakeBalance.vue';
import Modal from '../../scripts/Modal.vue';
describe('stake balance tests', () => {
    beforeAll(() => {
        vi.spyOn(misc, 'createAlert').mockImplementation(
            (type, message, timeout = 0) => {
                return message;
            }
        );
        return vi.clearAllMocks();
    });
    function mount(props) {
        return vueMount(StakeBalance, {
            props,
            attachTo: document.getElementById('app'),
        });
    }
    it('shows correct balance', async () => {
        const wrapper = mount({
            coldBalance: 3.5 * 10 ** 8,
            price: 3.1,
            currency: 'DOGE',
            displayDecimals: 2,
        });

        const balance = wrapper.find('[data-testid=coldBalance]');
        expect(balance.text()).toBe('3.50');

        const value = wrapper.find('[data-testid=coldBalanceValue]');
        expect(value.text()).toBe(`$${3.5 * 3.1}`);

        const currency = wrapper.find('[data-testid=coldBalanceCurrency]');
        expect(currency.text()).toBe('DOGE');
    });

    it('emits stake and unstake events', async () => {
        const wrapper = mount({
            coldBalance: 3.5 * 10 ** 8,
            price: 3.1,
            currency: 'DOGE',
            displayDecimals: 2,
        });
        await wrapper.find('[data-testid=showStakeButton]').trigger('click');
        expect(wrapper.emitted('showStake')).toStrictEqual([[]]);
        await wrapper.find('[data-testid=showUnstakeButton]').trigger('click');
        expect(wrapper.emitted('showUnstake')).toStrictEqual([[]]);
    });
    it('updates cold stake address', async () => {
        const wrapper = mount({
            coldBalance: 3.5 * 10 ** 8,
            price: 3.1,
            currency: 'DOGE',
            displayDecimals: 2,
            coldStakingAddress: 'oldcsaddr',
            'onUpdate:coldStakingAddress': (e) =>
                wrapper.setProps({ coldStakingAddress: e }),
        });
        await wrapper.find('[data-testid=setColdStakeButton]').trigger('click');
        const csaddrInput = wrapper
            .findComponent(Modal)
            .find('[data-testid=csAddrInput]');
        // Test that it is in focus
        expect(csaddrInput.element).toBe(document.activeElement);
        expect(csaddrInput.isVisible()).toBeTruthy();
        const newCsAddr = 'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy';
        csaddrInput.element.value = newCsAddr;
        csaddrInput.trigger('input');
        const confirmButton = wrapper
            .findComponent(Modal)
            .find('[data-testid=csAddrSubmit]');
        await confirmButton.trigger('click');
        expect(wrapper.props().coldStakingAddress).toBe(newCsAddr);
    });
    it('cancels stake address without updating', async () => {
        const wrapper = mount({
            coldBalance: 3.5 * 10 ** 8,
            price: 3.1,
            currency: 'DOGE',
            displayDecimals: 2,
            coldStakingAddress: 'oldcsaddr',
            'onUpdate:coldStakingAddress': (e) =>
                wrapper.setProps({ coldStakingAddress: e }),
        });
        await wrapper.find('[data-testid=setColdStakeButton]').trigger('click');
        const csaddrInput = wrapper
            .findComponent(Modal)
            .find('[data-testid=csAddrInput]');
        expect(csaddrInput.isVisible()).toBeTruthy();
        const newCsAddr = 'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy';
        csaddrInput.element.value = newCsAddr;
        csaddrInput.trigger('input');
        const cancelButton = wrapper
            .findComponent(Modal)
            .find('[data-testid=csAddrCancel]');
        await cancelButton.trigger('click');
        expect(wrapper.props().coldStakingAddress).toBe('oldcsaddr');
    });
});
