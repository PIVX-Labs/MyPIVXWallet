import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ProposalName from '../../../scripts/governance/ProposalName.vue';
import { setActivePinia, createPinia } from 'pinia';
describe('ProposalName component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<ProposalName>}
     */
    let wrapper;
    beforeEach(() => {
        // Create test pinia instance
        setActivePinia(createPinia());
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

    it('Has correct href link', async () => {
        expect(
            wrapper.find('[data-testid="proposalLink"]').attributes('href')
        ).toBe('/address/Dlabsaddress');
        await wrapper.setProps({
            proposal: {
                PaymentAddress: 'xpubdlabs',
                URL: 'https://proposal.com',
                Name: 'ProposalName',
            },
        });
        expect(
            wrapper.find('[data-testid="proposalLink"]').attributes('href')
        ).toBe('/xpub/xpubdlabs');
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
