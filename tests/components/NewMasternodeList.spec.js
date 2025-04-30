import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import MasternodeList from '../../scripts/masternode/NewMasternodeList.vue';
import MasternodeRow from '../../scripts/masternode/MasternodeRow.vue';
import CreateMasternodeModal from '../../scripts/masternode/CreateMasternodeModal.vue';
import * as translation from '../../scripts/i18n.js';
const mn = vi.fn((status, ip, lastSeen) => {
    return {
        getFullData() {
            return {
                status,
                ip,
                lastSeen,
            };
        },
    };
});

describe('NewMasternodeList tests', () => {
    beforeEach(() => {
        vi.spyOn(translation, 'tr').mockImplementation((message, variables) => {
            if (variables[0].MIN_PASS_LENGTH) {
                return message + variables[0].MIN_PASS_LENGTH;
            } else {
                return variables[0].length;
            }
        });
        vi.spyOn(translation, 'ALERTS', 'get').mockReturnValue({
            PASSWORD_TOO_SMALL: 'pass_too_small',
            PASSWORD_DOESNT_MATCH: 'pass_doesnt_match',
        });
    });
    const defaultProps = {
        masternodes: [
            mn('ENABLED', '192.168.1.1', '5:45'),
            mn('ENABLED', '192.168.1.2', '5:46'),
        ],
        possibleUTXOs: [],
        balance: 100000000, // Example balance in satoshis
        synced: true,
    };

    it('renders the correct number of masternodes', () => {
        const wrapper = mount(MasternodeList, { props: defaultProps });
        expect(wrapper.findAllComponents(MasternodeRow).length).toBe(2);
    });

    it('displays the correct masternode count in the header', () => {
        const wrapper = mount(MasternodeList, { props: defaultProps });
        expect(wrapper.find('.mnTopConfigured').text()).toContain('2');
    });

    it('disables the "Add Masternode" button if balance is insufficient', () => {
        const insufficientBalanceProps = { ...defaultProps, balance: 100 };
        const wrapper = mount(MasternodeList, {
            props: insufficientBalanceProps,
        });

        const button = wrapper.find('[data-testid="addMasternodeButton"]');
        expect(button.element.style.opacity).toBe('0.5');
    });

    it('emits the correct event when restarting a masternode', async () => {
        const wrapper = mount(MasternodeList, { props: defaultProps });
        const masternodeRow = wrapper.findComponent(MasternodeRow);

        await masternodeRow.vm.$emit(
            'restartMasternode',
            defaultProps.masternodes[0]
        );

        expect(wrapper.emitted('restartMasternode')[0]).toEqual([
            defaultProps.masternodes[0],
        ]);
    });

    it('emits the correct event when deleting a masternode', async () => {
        const wrapper = mount(MasternodeList, { props: defaultProps });
        const masternodeRow = wrapper.findComponent(MasternodeRow);

        await masternodeRow.vm.$emit(
            'deleteMasternode',
            defaultProps.masternodes[0]
        );

        expect(wrapper.emitted('deleteMasternode')[0]).toEqual([
            defaultProps.masternodes[0],
        ]);
    });

    it('emits the correct event when creating a new masternode', async () => {
        const wrapper = mount(MasternodeList, { props: defaultProps });
        const modal = wrapper.findComponent(CreateMasternodeModal);

        await modal.vm.$emit('createMasternode', {
            ip: '192.168.1.3',
            privKey: 'private-key',
        });

        expect(wrapper.emitted('createMasternode')[0]).toEqual([
            { ip: '192.168.1.3', privKey: 'private-key' },
        ]);
    });
});
