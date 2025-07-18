import { mount, shallowMount } from '@vue/test-utils';
import { beforeEach, expect } from 'vitest';
import Login from '../../scripts/dashboard/Login.vue';
import CreateWallet from '../../scripts/dashboard/CreateWallet.vue';
import VanityGen from '../../scripts/dashboard/VanityGen.vue';
import AccessWallet from '../../scripts/dashboard/AccessWallet.vue';
import { vi, describe } from 'vitest';
import Modal from '../../scripts/Modal.vue';
import ImportLedgerModal from '../../scripts/dashboard/import_modals/ImportLedgerModal.vue';
import { nextTick } from 'vue';

describe('Login tests', () => {
    beforeEach(() => {
        vi.mock('../../scripts/i18n.js');
        navigator.usb = {};
        return vi.clearAllMocks;
    });
    test('Create wallet login (no advanced)', async () => {
        const wrapper = shallowMount(Login, {
            props: {
                advancedMode: false,
            },
            attachTo: document.getElementById('app'),
        });
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const createWalletComponent = wrapper.findComponent(CreateWallet);
        // Create Wallet component must be visible
        expect(createWalletComponent.isVisible()).toBeTruthy();
        expect(createWalletComponent.props()).toStrictEqual({
            advancedMode: false,
            importLock: undefined,
        });
        // We can just emit the event: CreateWallet has already been unit tested!
        createWalletComponent.vm.$emit(
            'import-wallet',
            'mySecret',
            '',
            'mywallet'
        );
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [
                {
                    password: '',
                    secret: 'mySecret',
                    type: 'hd',
                    label: 'mywallet',
                    blockCount: undefined,
                },
            ],
        ]);
    });
    test('Create wallet login (advanced)', async () => {
        const wrapper = shallowMount(Login, {
            props: {
                advancedMode: true,
            },
            attachTo: document.getElementById('app'),
        });
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const createWalletComponent = wrapper.findComponent(CreateWallet);
        // Create Wallet component must be visible
        expect(createWalletComponent.isVisible()).toBeTruthy();
        expect(createWalletComponent.props()).toStrictEqual({
            advancedMode: true,
            importLock: undefined,
        });
        // We can just emit the event: CreateWallet has already been unit tested!
        createWalletComponent.vm.$emit(
            'import-wallet',
            'mySecret',
            'myPass',
            'mywallet'
        );
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [
                {
                    password: 'myPass',
                    secret: 'mySecret',
                    type: 'hd',
                    label: 'mywallet',
                    blockCount: undefined,
                },
            ],
        ]);
    });
    test('Vanity gen login', async () => {
        const wrapper = shallowMount(Login, {
            props: {
                advancedMode: false,
            },
            attachTo: document.getElementById('app'),
        });
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const vanityGenComponent = wrapper.findComponent(VanityGen);
        // Create Wallet component must be visible
        expect(vanityGenComponent.isVisible()).toBeTruthy();
        // Vanity gen is easy: it has no props
        expect(vanityGenComponent.props()).toStrictEqual({});
        // We can just emit a complete random event: VanityGen has already been unit tested!
        vanityGenComponent.vm.$emit('import-wallet', 'mySecret', 'mywallet');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ secret: 'mySecret', type: 'legacy', label: 'mywallet' }],
        ]);
    });
    test('Access wallet login (no advanced)', async () => {
        const wrapper = shallowMount(Login, {
            props: {
                advancedMode: false,
            },
            attachTo: document.getElementById('app'),
        });
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const accessWalletComponent = wrapper.findComponent(AccessWallet);
        // Make sure that access Wallet Component has been created with the correct props
        expect(accessWalletComponent.props()).toStrictEqual({
            advancedMode: false,
        });
        // We can just emit a complete random event: AccessWallet has already been unit tested!
        accessWalletComponent.vm.$emit(
            'import-wallet',
            'mySecret',
            '',
            'mywallet'
        );
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [
                {
                    secret: 'mySecret',
                    type: 'hd',
                    password: '',
                    label: 'mywallet',
                },
            ],
        ]);
    });
    test('Access wallet login (advanced)', async () => {
        const wrapper = shallowMount(Login, {
            props: {
                advancedMode: true,
            },
            attachTo: document.getElementById('app'),
        });
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const accessWalletComponent = wrapper.findComponent(AccessWallet);
        // Make sure that access Wallet Component has been created with the correct props
        expect(accessWalletComponent.props()).toStrictEqual({
            advancedMode: true,
        });
        // We can just emit a complete random event: AccessWallet has already been unit tested!
        accessWalletComponent.vm.$emit(
            'import-wallet',
            'mySecret',
            'myPass',
            'mywallet'
        );
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [
                {
                    secret: 'mySecret',
                    type: 'hd',
                    password: 'myPass',
                    label: 'mywallet',
                },
            ],
        ]);
    });
    test('HardwareWallet login', async () => {
        const wrapper = mount(Login, {
            props: {
                advancedMode: false,
            },
            attachTo: document.getElementById('app'),
        });
        const hardwareWalletBtn = wrapper.find(
            '[data-testid=hardwareWalletBtn]'
        );
        // Make sure it's visible and click it
        expect(hardwareWalletBtn.isVisible()).toBeTruthy();
        await hardwareWalletBtn.trigger('click');

        const labelInput = wrapper
            .findComponent(ImportLedgerModal)
            .findComponent(Modal)
            .find('[data-testid="label"]');
        const submitButton = wrapper
            .findComponent(ImportLedgerModal)
            .findComponent(Modal)
            .find('[data-testid="accessHardwareWallet"]');

        labelInput.element.value = 'mywallet';
        await labelInput.trigger('input');
        await submitButton.trigger('click');
        await nextTick();

        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ type: 'hardware', label: 'mywallet' }],
        ]);
    });
});
