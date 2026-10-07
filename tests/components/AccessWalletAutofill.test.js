import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect, it, describe } from 'vitest';
import AccessWallet from '../../scripts/dashboard/AccessWallet.vue';
import Modal from '../../scripts/Modal.vue';

/**
 * Covers masking and the autofill opt-out on the Access Wallet secret input.
 *
 * The field holds a BIP39 mnemonic or a private key, so it must stay masked by
 * default and must not be eligible for browser autofill, form history or
 * spellcheck.
 */

// Canonical BIP39 all-zero-entropy test vector
const MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('secret input masking and autofill opt-out', () => {
    const setup = async () => {
        const wrapper = mount(AccessWallet, {
            props: { advancedMode: false },
            attachTo: document.getElementById('app'),
        });
        await wrapper.find('[data-testid=accWalletButton]').trigger('click');
        return {
            wrapper,
            secretInp: () =>
                wrapper.findComponent(Modal).find('[data-testid=secretInp]'),
            revealBtn: () =>
                wrapper
                    .findComponent(Modal)
                    .find('[data-testid=revealSecretBtn]'),
        };
    };

    const typeMnemonic = async (secretInp) => {
        secretInp().element.value = MNEMONIC;
        await secretInp().trigger('input');
        await nextTick();
    };

    it('stays masked when the value contains spaces', async () => {
        const { secretInp } = await setup();

        expect(secretInp().attributes('type')).toBe('password');
        await typeMnemonic(secretInp);
        // Spaces must not flip the field to cleartext
        expect(secretInp().attributes('type')).toBe('password');
    });

    it('carries the autofill, history and spellcheck opt-outs', async () => {
        const { secretInp } = await setup();
        await typeMnemonic(secretInp);

        const attrs = secretInp().attributes();
        // `nope` does not disable form history in Firefox
        expect(attrs.autocomplete).toBe('off');
        expect(attrs.spellcheck).toBe('false');
        expect(attrs.autocorrect).toBe('off');
        expect(attrs.autocapitalize).toBe('off');
        // Password-manager capture opt-outs
        expect(attrs['data-lpignore']).toBe('true');
        expect(attrs['data-bwignore']).toBe('true');
        expect(attrs['data-form-type']).toBe('other');
        expect(attrs).toHaveProperty('data-1p-ignore');
    });

    it('has no duplicate static type attribute overriding the binding', async () => {
        const { secretInp } = await setup();
        await typeMnemonic(secretInp);
        // outerHTML would contain two `type=` attributes if the stray static
        // type="text" were still present
        const types = secretInp().element.outerHTML.match(/\stype=/g) || [];
        expect(types).toHaveLength(1);
    });

    it('reveals only on explicit opt-in and re-masks on close', async () => {
        const { wrapper, secretInp, revealBtn } = await setup();
        await typeMnemonic(secretInp);

        expect(revealBtn().exists()).toBe(true);
        await revealBtn().trigger('click');
        // Revealed only because the user asked, e.g. to check for typos
        expect(secretInp().attributes('type')).toBe('text');

        await revealBtn().trigger('click');
        expect(secretInp().attributes('type')).toBe('password');

        // Reveal must not persist across modal open/close
        await revealBtn().trigger('click');
        expect(secretInp().attributes('type')).toBe('text');
        await wrapper
            .findComponent(Modal)
            .find('[data-testid=closeBtn]')
            .trigger('click');
        await nextTick();
        await wrapper.find('[data-testid=accWalletButton]').trigger('click');
        expect(secretInp().attributes('type')).toBe('password');
    });

    it('applies the opt-outs to the label field', async () => {
        const { wrapper } = await setup();
        const labelInput = wrapper
            .findComponent(Modal)
            .find('[data-testid=labelInput]');
        expect(labelInput.attributes('autocomplete')).toBe('off');
        expect(labelInput.attributes('spellcheck')).toBe('false');
    });
});
