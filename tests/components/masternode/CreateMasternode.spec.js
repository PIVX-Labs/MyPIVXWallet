import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CreateMasternode from '../../../scripts/masternode/CreateMasternode.vue';

vi.mock('../../../scripts/i18n.js');

describe('CreateMasternode component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<CreateMasternode>}
     */
    let wrapper;
    beforeEach(() => {
        wrapper = mount(CreateMasternode, {
            props: {
                synced: true,
                balance: 11000,
                possibleUTXOs: [],
            },
        });
    });

    it('displays correct error when not synced', async () => {
        await wrapper.setProps({ synced: false });
        const errorElement = wrapper.find('[data-testid="error"]');
        expect(errorElement.text()).toBe('MN_UNLOCK_WALLET');
    });

    it('displays correct error when balance is too low', async () => {
        await wrapper.setProps({ balance: 9999.99 });
        const errorElement = wrapper.find('[data-testid="error"]');
        expect(errorElement.text()).toBe(
            'MN_NOT_ENOUGH_COLLAT amount 0.01 ticker PIV'
        );
        await wrapper.setProps({ balance: 1234 });
        expect(errorElement.text()).toBe(
            'MN_NOT_ENOUGH_COLLAT amount 8766.00 ticker PIV'
        );
    });

    it('allows tx creation if no utxos are available', async () => {
        const errorElement = wrapper.find('[data-testid="error"]');
        expect(errorElement.text()).toHaveLength(0);
        const createMasternodeButton = wrapper.find(
            '[data-testid="createMasternodeButton"]'
        );

        expect(createMasternodeButton.isVisible()).toBe(true);
        await createMasternodeButton.trigger('click');
        const createMasternodeModalButton = wrapper.find(
            '[data-testid="createMasternodeModalButton"]'
        );
        const options = wrapper
            .find('[data-testid="masternodeTypeSelection"]')
            .findAll('option');
        // Create a VPS masternode
        await options.at(0).setSelected();
        await createMasternodeModalButton.trigger('click');

        // Create a third party masternode
        await createMasternodeButton.trigger('click');
        await options.at(1).setSelected();
        await createMasternodeModalButton.trigger('click');

        expect(wrapper.emitted().createMasternode).toStrictEqual([
            [{ isVPS: true }],
            [{ isVPS: false }],
        ]);
    });

    it('allows masternode importing when a valid UTXO is present', async () => {
        await wrapper.setProps({
            possibleUTXOs: [
                {
                    outpoint: {
                        txid: 'masternodetxid',
                        n: 3,
                    },
                },
                {
                    outpoint: {
                        txid: 'masternodetxid2',
                        n: 5,
                    },
                },
            ],
        });
        const privateKey = wrapper.find('[data-testid="importPrivateKey"]');
        const ipAddress = wrapper.find('[data-testid="importIpAddress"]');
        const selectUTXO = wrapper
            .find('[data-testid="selectUTXO"]')
            .findAll('option');
        expect(selectUTXO.map((o) => o.text()).slice(1)).toStrictEqual([
            'masternodetxid/3',
            'masternodetxid2/5',
        ]);
        await privateKey.setValue('mnprivatekey');
        await ipAddress.setValue('::1');
        await selectUTXO.at(2).setSelected();

        const importMasternodeButton = wrapper.find(
            '[data-testid="importMasternodeButton"]'
        );
        await importMasternodeButton.trigger('click');
        expect(wrapper.emitted().importMasternode).toStrictEqual([
            [
                'mnprivatekey',
                '::1',
                {
                    outpoint: {
                        txid: 'masternodetxid2',
                        n: 5,
                    },
                },
            ],
        ]);
    });
});
