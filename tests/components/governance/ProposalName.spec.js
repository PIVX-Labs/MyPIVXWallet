import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProposalName from '../../../scripts/governance/ProposalName.vue';

describe('ProposalName component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<ProposalName>}
     */
    let wrapper;
    beforeEach(() => {
        wrapper = mount(ProposalName, {
            props: {
                proposal: {
                    URL: 'https://proposal.com/',
                    Name: 'ProposalName',
                    PaymentAddress: 'Dlabsaddress',
                },
            },
        });
    });

    it('emits openExplorer event when clicking link', async () => {
        await wrapper.find('[data-testid="proposalLink"]').trigger('click');
        expect(wrapper.emitted().openExplorer).toStrictEqual([
            ['Dlabsaddress'],
        ]);
    });

    it('renders correctly', async () => {
        expect(wrapper.find('[data-testid="proposalName"]').text()).toBe(
            'ProposalName'
        );
        expect(wrapper.find('[data-testid="proposalLink"]').text()).toBe(
            'Dlabsaddre...'
        );
    });
});
