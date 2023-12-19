import { mount } from '@vue/test-utils';
import { beforeEach, expect } from 'vitest';
import GenKeyWarning from '../../scripts/dashboard/GenKeyWarning.vue';
import Modal from '../../scripts/Modal.vue';
import { vi, it, describe } from 'vitest';
import { nextTick } from 'vue';
import * as translation from '../../scripts/i18n.js';
import * as misc from '../../scripts/misc.js';
import { MIN_PASS_LENGTH } from '../../scripts/chain_params.js';
// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
    <div id="app"></div>
  </div>
`;

const checkEventsEmitted = (wrapper, nClose, nOnEncrypt, nOpen) => {
    if (nClose == 0) {
        expect(wrapper.emitted('close')).toBeUndefined();
    } else {
        expect(wrapper.emitted('close')).toHaveLength(nClose);
    }
    if (nOnEncrypt == 0) {
        expect(wrapper.emitted('onEncrypt')).toBeUndefined();
    } else {
        expect(wrapper.emitted('onEncrypt')).toHaveLength(nOnEncrypt);
    }
    if (nOpen == 0) {
        expect(wrapper.emitted('open')).toBeUndefined();
    } else {
        expect(wrapper.emitted('open')).toHaveLength(nOpen);
    }
};

const checkModalExistence = (wrapper, exist) => {
    expect(
        wrapper
            .findComponent(Modal)
            .findAll('[data-testid=currentPasswordModal]')
    ).toHaveLength(exist);
    expect(
        wrapper.findComponent(Modal).findAll('[data-testid=newPasswordModal]')
    ).toHaveLength(exist);
    expect(
        wrapper
            .findComponent(Modal)
            .findAll('[data-testid=confirmPasswordModal]')
    ).toHaveLength(exist);
    expect(
        wrapper.findComponent(Modal).findAll('[data-testid=submitBtn]')
    ).toHaveLength(exist);
    expect(
        wrapper.findComponent(Modal).findAll('[data-testid=closeBtn]')
    ).toHaveLength(exist);
};

describe('GenKeyWarning tests', () => {
    beforeEach(() => {
        // Mock translate and createAlert and the two translations used
        vi.spyOn(translation, 'tr').mockImplementation((message, variables) => {
            return message + variables[0].MIN_PASS_LENGTH;
        });
        vi.spyOn(misc, 'createAlert').mockImplementation(
            (type, message, timeout = 0) => {
                return message;
            }
        );
        vi.spyOn(translation, 'ALERTS', 'get').mockReturnValue({
            PASSWORD_TOO_SMALL: 'pass_too_small',
            PASSWORD_DOESNT_MATCH: 'pass_doesnt_match',
        });
    });
    afterEach(() => vi.clearAllMocks());
    it('GenKeyWarning (no box)', async () => {
        const wrapper = mount(GenKeyWarning, {
            props: {
                showModal: false,
                showBox: false,
                isEncrypt: false,
            },
            attachTo: document.getElementById('app'),
        });
        // No events emitted and nothing to see in this case!
        checkEventsEmitted(wrapper, 0, 0, 0);
        const encryptBox = wrapper.find('[data-testid=encryptBox]');
        expect(encryptBox.isVisible()).toBeFalsy();
        checkModalExistence(wrapper, 0);
    });
    it('GenKeyWarning (no modal)', async () => {
        const wrapper = mount(GenKeyWarning, {
            props: {
                showModal: false,
                showBox: true,
                isEncrypt: false,
            },
            attachTo: document.getElementById('app'),
        });
        checkEventsEmitted(wrapper, 0, 0, 0);
        const encryptBox = wrapper.find('[data-testid=encryptBox]');
        expect(encryptBox.isVisible()).toBeTruthy();
        // Modal does not exist
        checkModalExistence(wrapper, 0);

        // Click the encryptBox and the open event should be emitted
        await encryptBox.trigger('click');
        await nextTick();
        checkEventsEmitted(wrapper, 0, 0, 1);
    });
    it('GenKeyWarning (no encrypt)', async () => {
        const wrapper = mount(GenKeyWarning, {
            props: {
                showModal: true,
                showBox: true,
                isEncrypt: false,
            },
            attachTo: document.getElementById('app'),
        });
        checkEventsEmitted(wrapper, 0, 0, 0);
        const encryptBox = wrapper.find('[data-testid=encryptBox]');
        expect(encryptBox.isVisible()).toBeTruthy();
        // Modal exist
        checkModalExistence(wrapper, 1);

        const newPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=newPasswordModal]')[0];
        const confirmPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=confirmPasswordModal]')[0];
        const submitBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=submitBtn]')[0];
        const currentPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=currentPasswordModal]')[0];
        const closeBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=closeBtn]')[0];
        // Everything but currentPassword is visible
        expect(newPassword.isVisible()).toBeTruthy();
        expect(confirmPassword.isVisible()).toBeTruthy();
        expect(submitBtn.isVisible()).toBeTruthy();
        expect(currentPassword.isVisible()).toBeFalsy();
        expect(closeBtn.isVisible()).toBeTruthy();

        // Let's try to insert a password
        // Password match but it's too short!
        newPassword.element.value = 'p';
        newPassword.trigger('input');
        await nextTick();
        confirmPassword.element.value = 'p';
        confirmPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        // no event should have been emitted
        checkEventsEmitted(wrapper, 0, 0, 0);
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith(
            'pass_too_small' + MIN_PASS_LENGTH
        );

        // Ok now the length has been changed to the minimum allowed value but passwords dont match!
        const safePassword = new Array(MIN_PASS_LENGTH + 1).join('x');
        newPassword.element.value = safePassword;
        newPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        // no event should have been emitted
        checkEventsEmitted(wrapper, 0, 0, 0);
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith('pass_doesnt_match');
        // Finally passwords match
        confirmPassword.element.value = safePassword;
        confirmPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        checkEventsEmitted(wrapper, 1, 1, 0);
        expect(wrapper.emitted('onEncrypt')).toStrictEqual([
            [safePassword, ''],
        ]);
        expect(wrapper.emitted('close')).toStrictEqual([[]]);

        // Test the close button
        await closeBtn.trigger('click');
        await nextTick();
        checkEventsEmitted(wrapper, 2, 1, 0);
        expect(wrapper.emitted('close')).toStrictEqual([[], []]);
    });
    it('GenKeyWarning (with encrypt)', async () => {
        const wrapper = mount(GenKeyWarning, {
            props: {
                showModal: true,
                showBox: true,
                isEncrypt: true,
            },
            attachTo: document.getElementById('app'),
        });
        checkEventsEmitted(wrapper, 0, 0, 0);
        const encryptBox = wrapper.find('[data-testid=encryptBox]');
        expect(encryptBox.isVisible()).toBeTruthy();
        // Modal exist
        checkModalExistence(wrapper, 1);

        const newPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=newPasswordModal]')[0];
        const confirmPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=confirmPasswordModal]')[0];
        const submitBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=submitBtn]')[0];
        const currentPassword = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=currentPasswordModal]')[0];
        const closeBtn = wrapper
            .findComponent(Modal)
            .findAll('[data-testid=closeBtn]')[0];
        // Every input box/ button must be visible
        expect(newPassword.isVisible()).toBeTruthy();
        expect(confirmPassword.isVisible()).toBeTruthy();
        expect(submitBtn.isVisible()).toBeTruthy();
        expect(currentPassword.isVisible()).toBeTruthy();
        expect(closeBtn.isVisible()).toBeTruthy();

        // Let's try to insert a password
        // Password match but it's too short!
        newPassword.element.value = 'p';
        newPassword.trigger('input');
        await nextTick();
        confirmPassword.element.value = 'p';
        confirmPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        // no event should have been emitted
        checkEventsEmitted(wrapper, 0, 0, 0);
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith(
            'pass_too_small' + MIN_PASS_LENGTH
        );

        // Ok now the length has been changed to the minimum allowed value but passwords dont match!
        const safePassword = new Array(MIN_PASS_LENGTH + 1).join('x');
        newPassword.element.value = safePassword;
        newPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        // no event should have been emitted
        checkEventsEmitted(wrapper, 0, 0, 0);
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith('pass_doesnt_match');
        // Finally passwords matches and verify also current password
        currentPassword.element.value = 'panleon';
        currentPassword.trigger('input');
        await nextTick();
        confirmPassword.element.value = safePassword;
        confirmPassword.trigger('input');
        await nextTick();
        await submitBtn.trigger('click');
        await nextTick();
        checkEventsEmitted(wrapper, 1, 1, 0);
        expect(wrapper.emitted('onEncrypt')).toStrictEqual([
            [safePassword, 'panleon'],
        ]);
        expect(wrapper.emitted('close')).toStrictEqual([[]]);
        // Test the close button
        await closeBtn.trigger('click');
        await nextTick();
        checkEventsEmitted(wrapper, 2, 1, 0);
        expect(wrapper.emitted('close')).toStrictEqual([[], []]);
    });
});
