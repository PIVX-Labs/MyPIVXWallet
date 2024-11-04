import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as alert from '../../scripts/alerts/alert.js';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import StakeInput from '../../scripts/stake/StakeInput.vue';
import Modal from '../../scripts/Modal.vue';
const price = 0.4;
const mountSI = (amount = '123', unstake = false) => {
    const wrapper = mount(StakeInput, {
        props: {
            unstake,
            price,
            show: true,
            amount,
            'onUpdate:amount': (e) => wrapper.setProps({ amount: e }),
        },
    });
    return wrapper;
};

describe('stake balance tests', () => {
    it('updates inputs', async () => {
        const wrapper = mountSI();

        const amount = wrapper.find('[data-testid=amount]');
        const currency = wrapper.find('[data-testid=amountCurrency]');

        amount.trigger('input');
        await nextTick();
        await nextTick();

        // Test that amount -> currency updates
        expect(amount.element.value).toBe('123');
        expect(currency.element.value).toBe(`${123 * price}`);
        // Test that currency -> amount updates
        currency.element.value = '49';
        currency.trigger('input');
        await nextTick();

        expect(amount.element.value).toBe(`${49 / price}`);
        expect(currency.element.value).toBe(`49`);

        // Test that setting one as empty clears the other
        currency.element.value = '';
        currency.trigger('input');
        await nextTick();

        expect(amount.element.value).toBe('');
        expect(currency.element.value).toBe('');
    });
    it('closes correctly', async () => {
        const wrapper = mountSI();
        expect(wrapper.emitted('close')).toBeUndefined();
        wrapper.find('[data-testid=closeButton]').trigger('click');
        expect(wrapper.emitted('close')).toHaveLength(1);
    });
    it('Unstakes correctly', async () => {
        const wrapper = mountSI('60');
        expect(wrapper.emitted('submit')).toBeUndefined();
        await wrapper.find('[data-testid=sendButton]').trigger('click');
        expect(wrapper.emitted('submit')).toStrictEqual([[60 * 10 ** 8, '']]);
    });
});
