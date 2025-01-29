import { mount } from '@vue/test-utils';
import MasternodeModal from '../../scripts/masternode/CreateMasternodeModal.vue';
import { AlertController } from '../../scripts/alerts/alert.js';

describe('MasternodeModal.vue', () => {
    let wrapper;

    const createWrapper = (props = {}) => {
        return mount(MasternodeModal, {
            props: {
                synced: true,
                balance: 10000000000,
                possibleUTXOs: [],
                show: true,
                ...props,
            },
            global: {
                stubs: {
                    Teleport: {
                        template: '<div> <slot /> </div>',
                    },
                },
            },
        });
    };

    afterEach(() => {
        wrapper.unmount();
    });

    it('renders create masternode modal when no UTXOs and synced', () => {
        wrapper = createWrapper();

        expect(wrapper.find('h4').text()).toBe('Create a masternode');
        expect(
            wrapper.find('[data-testid="masternodeTypeSelection"]').exists()
        ).toBe(true);
    });

    it('renders import masternode modal when UTXOs are available', () => {
        wrapper = createWrapper({
            possibleUTXOs: [
                { outpoint: { txid: 'tx1', n: 0 } },
                { outpoint: { txid: 'tx2', n: 1 } },
            ],
        });

        expect(wrapper.find('h4').text()).toBe('Import masternode');
        expect(wrapper.find('[data-testid="selectUTXO"]').exists()).toBe(true);
    });

    it('emits createMasternode event with correct data', async () => {
        wrapper = createWrapper();
        await wrapper
            .find('[data-testid="masternodeTypeSelection"]')
            .setValue('VPS');
        await wrapper
            .find('[data-testid="createMasternodeModalButton"]')
            .trigger('click');

        expect(wrapper.emitted('createMasternode')).toHaveLength(1);
        expect(wrapper.emitted('createMasternode')[0]).toEqual([
            { isVPS: true },
        ]);
    });

    it('emits importMasternode event with correct data', async () => {
        wrapper = createWrapper({
            possibleUTXOs: [{ outpoint: { txid: 'tx1', n: 0 } }],
        });

        await wrapper
            .find('[data-testid="importPrivateKey"]')
            .setValue('privateKey123');
        await wrapper
            .find('[data-testid="importIpAddress"]')
            .setValue('127.0.0.1');
        await wrapper
            .find('[data-testid="selectUTXO"]')
            // Trust me it works
            .setValue('[object Object]');
        await wrapper
            .find('[data-testid="importMasternodeButton"]')
            .trigger('click');

        expect(wrapper.emitted('importMasternode')).toHaveLength(1);
        expect(wrapper.emitted('importMasternode')[0]).toEqual([
            'privateKey123',
            '127.0.0.1',
            { outpoint: { txid: 'tx1', n: 0 } },
        ]);
    });
});
