import { shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect } from 'vitest';
import Login from '../../scripts/dashboard/Login.vue';
import CreateWallet from '../../scripts/dashboard/CreateWallet.vue';
import VanityGen from '../../scripts/dashboard/VanityGen.vue';
import AccessWallet from '../../scripts/dashboard/AccessWallet.vue';
import { vi, it, describe } from 'vitest';

// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
    <div id="app"></div>
  </div>
`;

describe('Login tests', () => {
    afterEach(() => vi.clearAllMocks());
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
        });
        // We can just emit the event: CreateWallet has already been unit tested!
        createWalletComponent.vm.$emit('import-wallet', 'mySecret', '');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ password: '', secret: 'mySecret', type: 'hd' }],
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
        });
        // We can just emit the event: CreateWallet has already been unit tested!
        createWalletComponent.vm.$emit('import-wallet', 'mySecret', 'myPass');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ password: 'myPass', secret: 'mySecret', type: 'hd' }],
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
        vanityGenComponent.vm.$emit('import-wallet', 'mySecret');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ secret: 'mySecret', type: 'legacy' }],
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
        accessWalletComponent.vm.$emit('import-wallet', 'mySecret', '');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ secret: 'mySecret', type: 'hd', password: '' }],
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
        accessWalletComponent.vm.$emit('import-wallet', 'mySecret', 'myPass');
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ secret: 'mySecret', type: 'hd', password: 'myPass' }],
        ]);
    });
    test('HardwareWallet login', async () => {
        const wrapper = shallowMount(Login, {
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
        // Make sure the Login component relays the right event
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')).toStrictEqual([
            [{ type: 'hardware' }],
        ]);
    });
});
