import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { expect } from 'vitest';
import TransferMenu from '../../scripts/dashboard/TransferMenu.vue';
const price = 0.4;
const mountTM = (amount = '123', address = '') => {
    const wrapper = mount(TransferMenu, {
        props: {
            show: true,
            price,
            currency: 'USD',
            amount,
            address,

            'onUpdate:amount': (e) => wrapper.setProps({ amount: e }),
        },
    });
    return wrapper;
};

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
    wrapper.find('[data-testid=sendButton]').trigger('click');
    expect(wrapper.emitted('send')).toStrictEqual([
        ['DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bc', '60'],
    ]);
});
