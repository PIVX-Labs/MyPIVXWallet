import { mount } from '@vue/test-utils';
import { expect } from 'vitest';
import ExportPrivKey from '../../scripts/dashboard/ExportPrivKey.vue';
import Modal from '../../scripts/Modal.vue';
import { vi, it, describe } from 'vitest';

describe('Export private key tests', () => {
    afterEach(() => vi.clearAllMocks());
    it('Export Private key (showed)', async () => {
        const wrapper = mount(ExportPrivKey, {
            props: {
                privateKey: 'MyPrivateSecretKey',
                show: true,
            },
        });
        expect(wrapper.emitted('close')).toBeUndefined();
        // show = true, i.e. both privateKeyText, blurButton and close button are visible
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=privateKeyText]')
        ).toHaveLength(1);
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=blurBtn]')
        ).toHaveLength(1);
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=closeBtn]')
        ).toHaveLength(1);

        const privKeyText = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=privateKeyText]')[0];
        const blurBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=blurBtn]')[0];
        const closeBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=closeBtn]')[0];

        // Private key must be blurred
        expect(privKeyText.attributes()['class']).toBe('blurred');
        expect(privKeyText.text()).toBe('MyPrivateSecretKey');
        // Click the button and privateKey should unblur
        await blurBtn.trigger('click');
        expect(privKeyText.attributes()['class']).toBe('');
        expect(privKeyText.text()).toBe('MyPrivateSecretKey');
        // Click it again and it should blur again
        await blurBtn.trigger('click');
        expect(privKeyText.attributes()['class']).toBe('blurred');
        expect(privKeyText.text()).toBe('MyPrivateSecretKey');
        // Finally unblur and close it
        await blurBtn.trigger('click');
        await closeBtn.trigger('click');
        // on closing the privateKey must be blurred
        expect(privKeyText.attributes()['class']).toBe('blurred');
        expect(privKeyText.text()).toBe('MyPrivateSecretKey');
        // The event close must have been emitted
        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(wrapper.emitted('close')).toStrictEqual([[]]);
    });
    it('Export Private key (closed)', async () => {
        const wrapper = mount(ExportPrivKey, {
            props: {
                privateKey: 'MyPrivateSecretKey',
                show: false,
            },
        });
        expect(wrapper.emitted('close')).toBeUndefined();
        // show = false, i.e. nothing is there
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=privateKeyText]')
        ).toHaveLength(0);
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=blurBtn]')
        ).toHaveLength(0);
        expect(
            wrapper.findComponent(Modal).findAll('[data-testid=closeBtn]')
        ).toHaveLength(0);
    });
});
