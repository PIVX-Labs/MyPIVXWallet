import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect } from 'vitest';
import AccessWallet from '../../scripts/dashboard/AccessWallet.vue';
import { vi, it, describe } from 'vitest';

// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
    <div id="app"></div>
  </div>
`;

describe('access wallet tests', () => {
    afterEach(() => vi.clearAllMocks());
    it('Access wallet (no advanced)', async () => {
        const wrapper = mount(AccessWallet, {
            props: {
                advancedMode: false,
            },
            attachTo: document.getElementById('app'),
        });

        const accWalletButton = wrapper.find('[data-testid=accWalletButton]');
        const passwordInp = wrapper.find('[data-testid=passwordInp]');
        const secretInp = wrapper.find('[data-testid=secretInp]');
        const importWalletButton = wrapper.find(
            '[data-testid=importWalletButton]'
        );

        // before clicking the button,
        // all input texts + import wallet button are hidden
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        expect(accWalletButton.isVisible()).toBeTruthy();
        expect(passwordInp.isVisible()).toBeFalsy();
        expect(secretInp.isVisible()).toBeFalsy();
        expect(importWalletButton.isVisible()).toBeFalsy();

        //click the access Wallet button
        await accWalletButton.trigger('click');
        expect(accWalletButton.isVisible()).toBeFalsy();
        // button clicked, so now everything should be visible apart the passwordInp
        expect(passwordInp.isVisible()).toBeFalsy();
        expect(secretInp.isVisible()).toBeTruthy();
        expect(importWalletButton.isVisible()).toBeTruthy();

        // secretInput type should become visible!
        expect(secretInp.attributes('type')).toBe('password');
        expect(secretInp.element.value).toBe('');
        expect(passwordInp.element.value).toBe('');

        // Insert a secret
        secretInp.element.value = 'dog';
        secretInp.trigger('input');
        await nextTick();
        // No spaces! attribute is still a password
        expect(secretInp.attributes('type')).toBe('password');
        expect(passwordInp.isVisible()).toBeFalsy();

        secretInp.element.value = 'dog pig';
        secretInp.trigger('input');
        await nextTick();
        // bip 39 (there is a space), secret is now visible
        expect(secretInp.attributes('type')).toBe('text');
        // + no advanced mode, so passwordInp is still invisible
        expect(passwordInp.isVisible()).toBeFalsy();

        // Finally press the import button and verify that the event is emitted
        await importWalletButton.trigger('click');
        // first of all this must empty the two input box
        expect(secretInp.element.value).toBe('');
        expect(passwordInp.element.value).toBe('');
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            ['dog pig', ''],
        ]);
    });
    it('Access wallet (advanced)', async () => {
        const wrapper = mount(AccessWallet, {
            props: {
                advancedMode: true,
            },
            attachTo: document.getElementById('app'),
        });

        const accWalletButton = wrapper.find('[data-testid=accWalletButton]');
        const passwordInp = wrapper.find('[data-testid=passwordInp]');
        const secretInp = wrapper.find('[data-testid=secretInp]');
        const importWalletButton = wrapper.find(
            '[data-testid=importWalletButton]'
        );

        // before clicking the button,
        // all input texts + import wallet button are hidden
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        expect(accWalletButton.isVisible()).toBeTruthy();
        expect(passwordInp.isVisible()).toBeFalsy();
        expect(secretInp.isVisible()).toBeFalsy();
        expect(importWalletButton.isVisible()).toBeFalsy();

        //click the access Wallet button
        await accWalletButton.trigger('click');
        expect(accWalletButton.isVisible()).toBeFalsy();
        // button clicked, so now everything should be visible apart the passwordInp
        expect(passwordInp.isVisible()).toBeFalsy();
        expect(secretInp.isVisible()).toBeTruthy();
        expect(importWalletButton.isVisible()).toBeTruthy();

        // Insert a pseudo bip39 seedphrase (i.e. something with a space)
        // secretInput type should become visible!
        expect(secretInp.attributes('type')).toBe('password');
        expect(secretInp.element.value).toBe('');
        expect(passwordInp.element.value).toBe('');
        secretInp.element.value = 'dog';
        secretInp.trigger('input');
        await nextTick();
        expect(secretInp.attributes('type')).toBe('password');
        // no spaces! so passwordInp is still invisible
        expect(passwordInp.isVisible()).toBeFalsy();

        // the users inserts the second word
        secretInp.element.value = 'dog pig';
        secretInp.trigger('input');
        await nextTick();
        expect(secretInp.attributes('type')).toBe('text');
        // Finally the password field appeared!
        expect(passwordInp.isVisible()).toBeTruthy();
        passwordInp.element.value = 'myPass';
        passwordInp.trigger('input');

        // Finally press the import button and verify that the event is emitted
        await importWalletButton.trigger('click');
        // first of all this must empty the two input box
        expect(secretInp.element.value).toBe('');
        expect(passwordInp.element.value).toBe('');
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            ['dog pig', 'myPass'],
        ]);

        // Round 2, this time the user  wants to insert his private key
        // but the user by mistake begins inserting the seedphrase
        secretInp.element.value = 'dog pig';
        secretInp.trigger('input');
        await nextTick();
        expect(secretInp.attributes('type')).toBe('text');
        expect(passwordInp.isVisible()).toBeTruthy();
        passwordInp.element.value = 'myPass';
        passwordInp.trigger('input');
        await nextTick();

        // Oops I inserted the bip39! let me change
        secretInp.element.value = 'xprivkey';
        secretInp.trigger('input');
        await nextTick();
        expect(secretInp.attributes('type')).toBe('password');
        // Password field must be cleared and invisible
        expect(passwordInp.isVisible()).toBeFalsy();
        expect(passwordInp.element.value).toBe('');
        await nextTick();

        await importWalletButton.trigger('click');
        expect(secretInp.element.value).toBe('');
        expect(passwordInp.element.value).toBe('');
        expect(wrapper.emitted('import-wallet')).toHaveLength(2);
        expect(wrapper.emitted('import-wallet')[1]).toStrictEqual([
            'xprivkey',
            '',
        ]);
    });
});
