import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount as vueMount } from '@vue/test-utils';
import ProposalStatus from '../../../scripts/governance/ProposalStatus.vue';
import { ProposalValidator, reasons } from '../../../scripts/governance/status';

vi.mock('../../../scripts/i18n.js');

describe('ProposalStatus component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<ProposalStatus>}
     */
    let wrapper;
    let proposalValidator = new ProposalValidator(100);
    beforeEach(() => {
        proposalValidator.reason = null;
        proposalValidator.validate = vi.fn(() => {
            if (proposalValidator.reason !== null)
                return { passing: false, reason: proposalValidator.reason };
            return { passing: true };
        });
    });
    function mount() {
        wrapper = vueMount(ProposalStatus, {
            props: {
                proposal: {
                    URL: 'https://proposal.com/',
                    Name: 'ProposalName',
                    PaymentAddress: 'Dlabsaddress',
                    Yeas: 90,
                    Nays: 30,
                },
                proposalValidator,
                nMasternodes: 132,
            },
        });
    }
    it('renders not funded proposals correctly', () => {
        proposalValidator.reason = reasons.NOT_FUNDED;
        mount();
        const status = wrapper.find('[data-testid="proposalStatus"]');
        expect(status.text()).toBe('proposalFailing');
        expect(status.classes()).toContain('votesNo');
        const funding = wrapper.find('[data-testid="proposalFunding"]');
        expect(funding.text()).toBe('(proposalNotFunded)');
    });
    it('renders over budget proposals correctly', () => {
        proposalValidator.reason = reasons.OVER_BUDGET;
        mount();
        const status = wrapper.find('[data-testid="proposalStatus"]');
        expect(status.text()).toBe('proposalFailing');
        expect(status.classes()).toContain('votesOverAllocated');
        const funding = wrapper.find('[data-testid="proposalFunding"]');
        expect(funding.text()).toBe('(proposalOverBudget)');
    });
    it('renders young proposals correctly', () => {
        proposalValidator.reason = reasons.TOO_YOUNG;
        mount();
        const status = wrapper.find('[data-testid="proposalStatus"]');
        expect(status.text()).toBe('proposalFailing');
        expect(status.classes()).toContain('votesNo');
        const funding = wrapper.find('[data-testid="proposalFunding"]');
        expect(funding.text()).toBe('(proposalTooYoung)');
    });

    it('renders passing proposals correctly', () => {
        mount();
        const status = wrapper.find('[data-testid="proposalStatus"]');
        expect(status.text()).toBe('proposalPassing');
        expect(status.classes()).toContain('votesYes');
        const funding = wrapper.find('[data-testid="proposalFunding"]');
        expect(funding.text()).toBe('(proposalFunded)');
    });
    it('renders percentages correctly', () => {
        mount();
        // It should be (90 - 30) / 132 = 45.5% approx.
        expect(wrapper.find('[data-testid="proposalPercentage"]').text()).toBe(
            '45.5% proposalNetYes'
        );
    });
});
