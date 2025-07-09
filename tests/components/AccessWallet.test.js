import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect } from 'vitest';
import AccessWallet from '../../scripts/dashboard/AccessWallet.vue';
import { vi, it, describe } from 'vitest';
import Modal from '../../scripts/Modal.vue';

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

        const passwordInp = () =>
            wrapper.findComponent(Modal).find('[data-testid=passwordInp]');
        const secretInp = () =>
            wrapper.findComponent(Modal).find('[data-testid=secretInp]');
        const importWalletButton = () =>
            wrapper
                .findComponent(Modal)
                .find('[data-testid=importWalletButton]');
        const labelInput = () =>
            wrapper.findComponent(Modal).find('[data-testid="labelInput"]');
        // before clicking the button,
        // all input texts + import wallet button are hidden
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        expect(wrapper.findComponent(Modal).isVisible()).toBe(false);

        // click the access Wallet button
        await accWalletButton.trigger('click');
        // button clicked, so now everything should be visible apart the passwordInp
        expect(passwordInp().exists()).toBeFalsy();
        expect(secretInp().isVisible()).toBeTruthy();

        // secretInput type should become visible!
        expect(secretInp().attributes('type')).toBe('password');

        // Insert a secret
        secretInp().element.value = 'dog';
        await secretInp().trigger('input');
        await nextTick();
        // No spaces! attribute is still a password
        expect(secretInp().attributes('type')).toBe('password');
        expect(passwordInp().exists()).toBeFalsy();

        secretInp().element.value = 'dog pig';
        await secretInp().trigger('input');
        await nextTick();
        // bip 39 (there is a space), secret is now visible
        expect(secretInp().attributes('type')).toBe('text');
        // + no advanced mode, so passwordInp is still invisible
        expect(passwordInp().exists()).toBeFalsy();
        // Input a label
        labelInput().element.value = 'mywallet';
        await labelInput().trigger('input');
        await nextTick();

        // Finally press the import button and verify that the event is emitted
        await importWalletButton().trigger('click');
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            ['dog pig', '', 'mywallet'],
        ]);
        // Try to open the modal again and assert that the inputs have been cleared
        await accWalletButton.trigger('click');
        expect(secretInp().element.value).toBe('');
        expect(passwordInp().exists()).toBe(false);
    });
    it('Access wallet (advanced)', async () => {
        const wrapper = mount(AccessWallet, {
            props: {
                advancedMode: true,
            },
            attachTo: document.getElementById('app'),
        });

        const accWalletButton = wrapper.find('[data-testid=accWalletButton]');

        const passwordInp = () =>
            wrapper.findComponent(Modal).find('[data-testid=passwordInp]');
        const secretInp = () =>
            wrapper.findComponent(Modal).find('[data-testid=secretInp]');
        const importWalletButton = () =>
            wrapper
                .findComponent(Modal)
                .find('[data-testid=importWalletButton]');
        const labelInput = () =>
            wrapper.findComponent(Modal).find('[data-testid="labelInput"]');

        // before clicking the button,
        // all input texts + import wallet button are hidden
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        expect(accWalletButton.isVisible()).toBeTruthy();
        expect(passwordInp().exists()).toBeFalsy();
        expect(secretInp().exists()).toBeFalsy();
        expect(importWalletButton().exists()).toBeFalsy();

        //click the access Wallet button
        await accWalletButton.trigger('click');
        expect(accWalletButton.isVisible()).toBeTruthy();
        // button clicked, so now everything should be visible apart the passwordInp
        expect(passwordInp().exists()).toBeFalsy();
        expect(secretInp().isVisible()).toBeTruthy();
        expect(importWalletButton().isVisible()).toBeTruthy();

        // Insert a pseudo bip39 seedphrase (i.e. something with a space)
        // secretInput type should become visible!
        expect(secretInp().attributes('type')).toBe('password');
        expect(secretInp().element.value).toBe('');
        secretInp().element.value = 'dog';
        await secretInp().trigger('input');
        await nextTick();
        expect(secretInp().attributes('type')).toBe('password');
        // no spaces! so passwordInp is still invisible
        expect(passwordInp().exists()).toBeFalsy();

        // the users inserts the second word
        secretInp().element.value = 'dog pig';
        await secretInp().trigger('input');
        await nextTick();
        expect(secretInp().attributes('type')).toBe('text');
        // Finally the password field appeared!
        expect(passwordInp().isVisible()).toBeTruthy();
        passwordInp().element.value = 'myPass';
        passwordInp().trigger('input');
        labelInput().element.value = 'mywallet';
        await labelInput().trigger('input');

        // Finally press the import button and verify that the event is emitted
        await importWalletButton().trigger('click');
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            ['dog pig', 'myPass', 'mywallet'],
        ]);

        await accWalletButton.trigger('click');
        // Round 2, this time the user  wants to insert his private key
        // but the user by mistake begins inserting the seedphrase
        secretInp().element.value = 'dog pig';
        await secretInp().trigger('input');
        await nextTick();
        expect(secretInp().attributes('type')).toBe('text');
        expect(passwordInp().isVisible()).toBeTruthy();
        passwordInp().element.value = 'myPass';
        await passwordInp().trigger('input');
        await nextTick();

        // Oops I inserted the bip39! let me change
        secretInp().element.value = 'xprivkey';
        secretInp().trigger('input');
        await nextTick();
        expect(secretInp().attributes('type')).toBe('password');
        // Password field must be cleared and invisible
        expect(passwordInp().exists()).toBeFalsy();
        await nextTick();

        await importWalletButton().trigger('click');
        expect(wrapper.emitted('import-wallet')).toHaveLength(2);
        expect(wrapper.emitted('import-wallet')[1]).toStrictEqual([
            'xprivkey',
            '',
            '',
        ]);
    });
});
