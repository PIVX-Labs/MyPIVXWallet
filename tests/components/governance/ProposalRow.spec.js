import { mount } from '@vue/test-utils';
import ProposalRow from '../../../scripts/governance/ProposalRow.vue';
import ProposalStatus from '../../../scripts/governance/ProposalStatus.vue';
import LocalProposalStatus from '../../../scripts/governance/LocalProposalStatus.vue';
import ProposalName from '../../../scripts/governance/ProposalName.vue';
import { ProposalValidator } from '../../../scripts/governance/status.js';

vi.mock('../../../scripts/i18n.js');

describe('ProposalRow component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<ProposalName>}
     */
    let wrapper;

    beforeEach(() => {
        const proposalValidator = new ProposalValidator();
        proposalValidator.validate = vi.fn(() => {
            return { passing: true };
        });

        const props = {
            proposal: {
                Name: 'LRP - JSKitty',
                URL: 'https://forum.pivx.org/threads/lrp-jskitty.2126/',
                Hash: '2e9196542a65d0e84ef116f485e48e40cd93b7a90a39d850536c75979f92b809',
                FeeHash:
                    '0b7be6b9df8b65565423a5878d2b4c62830f907d3798c976be340cf55e13d65a',
                BlockStart: 4449600,
                BlockEnd: 4579203,
                TotalPaymentCount: 3,
                RemainingPaymentCount: 0,
                PaymentAddress: 'DFiH7DpxYahn5Y6p91oYwRDUqCsS9PaVGu',
                Ratio: 1,
                Yeas: 868,
                Nays: 0,
                Abstains: 0,
                TotalPayment: 45000,
                MonthlyPayment: 15000,
                IsEstablished: true,
                IsValid: true,
                Allotted: 15000,
            },
            proposalValidator,
            masternodeCount: 100,
            price: 10,
            strCurrency: 'USD',
            localProposal: false,
        };
        wrapper = mount(ProposalRow, {
            props,
        });
    });

    it('renders ProposalStatus if localProposal is false', () => {
        expect(wrapper.findComponent(ProposalStatus).exists()).toBe(true);
        expect(wrapper.findComponent(LocalProposalStatus).exists()).toBe(false);
    });

    it('renders LocalProposalStatus if localProposal is true', async () => {
        await wrapper.setProps({ localProposal: true });
        expect(wrapper.findComponent(ProposalStatus).exists()).toBe(false);
        expect(wrapper.findComponent(LocalProposalStatus).exists()).toBe(true);
    });

    it('emits click event when governStatusCol is clicked', async () => {
        await wrapper.find('.governStatusCol').trigger('click');
        expect(wrapper.emitted().click).toBeTruthy();
    });

    it('emits finalizeProposal event from LocalProposalStatus', async () => {
        await wrapper.setProps({ localProposal: true });
        wrapper.findComponent(LocalProposalStatus).vm.$emit('finalizeProposal');
        expect(wrapper.emitted().finalizeProposal).toBeTruthy();
    });

    it('emits vote event with 2 when No button is clicked', async () => {
        await wrapper.find('.govNoBtnMob').trigger('click');
        await wrapper.find('[data-testid="confirmVote"]').trigger('click');

        expect(wrapper.emitted().vote[0]).toEqual([2]);
    });

    it('emits vote event with 1 when Yes button is clicked', async () => {
        await wrapper.find('.govYesBtnMob').trigger('click');
        await wrapper.find('[data-testid="confirmVote"]').trigger('click');
        expect(wrapper.emitted().vote[0]).toEqual([1]);
    });
});
