import 'fake-indexeddb/auto';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect, describe, vi } from 'vitest';
import TransferMenu from '../../scripts/dashboard/TransferMenu.vue';

vi.mock('../../scripts/i18n.js');
const price = 0.4;
const mountTM = (amount = '123', address = '', extraProps = {}) => {
    const wrapper = mount(TransferMenu, {
        props: {
            show: true,
            price,
            currency: 'USD',
            amount,
            address,
            ...extraProps,

            'onUpdate:amount': (e) => wrapper.setProps({ amount: e }),
            publicMode: true,
        },
    });
    return wrapper;
};

describe('transfer menu tests', () => {
    beforeEach(async () => {
        // Reset indexedDB before each test
        vi.stubGlobal('indexedDB', new IDBFactory());
        return vi.unstubAllGlobals;
    });
    it('Updates inputs', async () => {
        const wrapper = mountTM();

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

    it('Closes correctly', async () => {
        const wrapper = mountTM();
        expect(wrapper.emitted('close')).toBeUndefined();
        wrapper.find('[data-testid=closeButton]').trigger('click');
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('Sends transaction correctly', async () => {
        const wrapper = mountTM('60', 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc');
        expect(wrapper.emitted('send')).toBeUndefined();
        await wrapper.find('[data-testid=sendButton]').trigger('submit');
        expect(wrapper.emitted('send')).toStrictEqual([
            ['DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc', '60', false, ''],
        ]);
    });

    it('Shows an inline error instead of sending with an empty address', async () => {
        const wrapper = mountTM('60', '');
        expect(wrapper.find('[data-testid=addressError]').exists()).toBe(false);
        await wrapper.find('[data-testid=sendButton]').trigger('submit');
        expect(wrapper.emitted('send')).toBeUndefined();
        expect(wrapper.find('[data-testid=addressError]').exists()).toBe(true);
    });

    it('Shows an inline error instead of sending with an empty amount', async () => {
        const wrapper = mountTM('', 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc');
        await wrapper.find('[data-testid=sendButton]').trigger('submit');
        expect(wrapper.emitted('send')).toBeUndefined();
        expect(wrapper.find('[data-testid=amountError]').exists()).toBe(true);
    });

    it('Renders errors passed in by the parent', async () => {
        const wrapper = mountTM('60', 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc', {
            errors: { address: 'Invalid PIVX address!' },
        });
        expect(wrapper.find('[data-testid=addressError]').text()).toBe(
            'Invalid PIVX address!'
        );
    });

    it('Locks the form while a transaction is sending', async () => {
        const wrapper = mountTM('60', 'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc', {
            sendState: 'sending',
        });
        const sendButton = wrapper.find('[data-testid=sendButton]');
        expect(sendButton.attributes('disabled')).toBeDefined();
        expect(
            wrapper.find('[data-testid=closeButton]').attributes('disabled')
        ).toBeDefined();
        await sendButton.trigger('submit');
        expect(wrapper.emitted('send')).toBeUndefined();
    });
});
