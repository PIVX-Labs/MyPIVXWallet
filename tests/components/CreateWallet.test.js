import { flushPromises, mount } from '@vue/test-utils';
import { expect } from 'vitest';
import CreateWallet from '../../scripts/dashboard/CreateWallet.vue';
import Modal from '../../scripts/Modal.vue';
import { vi, it, describe } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('../../scripts/network/network_manager.js');
vi.stubGlobal('indexedDB', new IDBFactory());

describe('create wallet tests', () => {
    it('Generates wallet', async () => {
        const wrapper = mount(CreateWallet, {
            props: {
                advancedMode: false,
            },
        });
        expect(wrapper.emitted('importWallet')).toBeUndefined();
        // Modal with seedphrase is still hidden
        expect(
            wrapper
                .findComponent(Modal)
                .findAll('[data-testid=seedphraseModal]')
        ).toHaveLength(0);
        const genWalletButton = wrapper.find('[data-testid=generateWallet]');
        expect(genWalletButton.isVisible()).toBeTruthy();
        await genWalletButton.trigger('click');

        // The click generated a seedphrase modal
        const seedphraseModals = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=seedphraseModal]');
        // But there is no passphrase
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=passPhrase]')
        ).toHaveLength(0);
        expect(seedphraseModals).toHaveLength(1);
        // Remove digits since they aren't part of the seedphrase
        const seedphrase = wrapper
            .findComponent(Modal)
            .text()
            .replace(/\d/g, '')
            .trim();
        // We must have 12 words in the seedphrase
        expect(seedphrase.split(' ')).toHaveLength(12);
        const labelInput = wrapper
            .findComponent(Modal)
            .find('[data-testid="labelInput"]');
        // Fill label input
        labelInput.element.value = 'mywallet';
        await labelInput.trigger('input');

        await wrapper
            .findComponent(Modal)
            .find('[data-testid="wroteSeedphraseDown"]')
            .trigger('click');
        // Which now disappeared again
        expect(
            wrapper
                .findComponent(Modal)
                .findAll('[data-testid=seedphraseModal]')
        ).toHaveLength(0);
        await flushPromises();
        // Ok We emitted exactly one event importWallet
        expect(wrapper.emitted('importWallet')).toHaveLength(1);
        // We emitted exactly the seedphrase with empty passphrase
        expect(wrapper.emitted('importWallet')).toStrictEqual([
            [seedphrase, '', 'mywallet', 1504903],
        ]);
    });
    it('Generates wallet advanced mode', async () => {
        const wrapper = mount(CreateWallet, {
            props: {
                advancedMode: true,
            },
        });
        expect(wrapper.emitted('importWallet')).toBeUndefined();
        // Modal with seedphrase and passphrase is still hidden
        expect(
            wrapper
                .findComponent(Modal)
                .findAll('[data-testid=seedphraseModal]')
        ).toHaveLength(0);
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=passPhrase]')
        ).toHaveLength(0);
        const genWalletButton = wrapper.find('[data-testid=generateWallet]');
        expect(genWalletButton.isVisible).toBeTruthy();
        await genWalletButton.trigger('click');

        // The click generated a modal with seedphrase and passphrase
        const seedphraseModals = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=seedphraseModal]');
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=passPhrase]')
        ).toHaveLength(1);
        expect(seedphraseModals).toHaveLength(1);
        const seedphrase = wrapper
            .findComponent(Modal)
            .text()
            .replace(/\d/g, '')
            .trim();
        // We must have 12 words in the seedphrase
        expect(seedphrase.split(' ')).toHaveLength(12);
        // Select a pass phrase
        const passPhrase = wrapper
            .findComponent(Modal)
            .find('[data-testid=passPhrase]');
        expect(passPhrase.element.value).toBe('');
        passPhrase.element.value = 'panleone';
        passPhrase.trigger('input');
        await wrapper
            .findComponent(Modal)
            .find('[data-testid="wroteSeedphraseDown"]')
            .trigger('click');
        // Which now disappeared again
        expect(
            wrapper
                .findComponent(Modal)
                .findAll('[data-testid=seedphraseModal]')
        ).toHaveLength(0);

        await flushPromises();
        // Ok We emitted exactly one event importWallet
        expect(wrapper.emitted('importWallet')).toHaveLength(1);
        // We emitted exactly the seedphrase with empty passphrase
        expect(wrapper.emitted('importWallet')).toStrictEqual([
            [seedphrase, 'panleone', '', 1504903],
        ]);
    });
});
