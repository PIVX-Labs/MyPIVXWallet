import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProposalCreateModal from '../../../scripts/governance/ProposalCreateModal.vue';

describe('ProposalCreateModal component tests', () => {
    it('hides address input when advanced mode is false', async () => {
        const wrapper = mount(ProposalCreateModal, {
            props: { advancedMode: true },
        });
        let address = wrapper.find('[data-testid="proposalAddress"]');
        // Address input
        expect(address.isVisible()).toBe(true);
        await wrapper.setProps({ advancedMode: false });
        address = wrapper.find('[data-testid="proposalAddress"]');
        expect(address.exists()).toBe(false);
    });

    it('submits correctly', async () => {
        const wrapper = mount(ProposalCreateModal, {
            props: { advancedMode: true },
        });
        const proposalTitle = wrapper.find('[data-testid="proposalTitle"]');
        await proposalTitle.setValue('Proposal Title');
        const url = wrapper.find('[data-testid="proposalUrl"]');
        await url.setValue('https://proposal.com/');
        const proposalCycles = wrapper.find('[data-testid="proposalCycles"]');
        await proposalCycles.setValue(3);
        const proposalPayment = wrapper.find('[data-testid="proposalPayment"]');
        await proposalPayment.setValue(20);
        const address = wrapper.find('[data-testid="proposalAddress"]');
        await address.setValue('DLabSomethingSomething');

        const proposalSubmit = wrapper.find('[data-testid="proposalSubmit"]');
        await proposalSubmit.trigger('click');
        expect(wrapper.emitted().create).toStrictEqual([
            [
                'Proposal Title',
                'https://proposal.com/',
                3,
                20,
                'DLabSomethingSomething',
            ],
        ]);
        await wrapper.setProps({ advancedMode: false });

        await proposalSubmit.trigger('click');
        // When advanced mode is toggled off, address should reset
        expect(wrapper.emitted().create.at(-1)).toStrictEqual([
            'Proposal Title',
            'https://proposal.com/',
            3,
            20,
            '',
        ]);
    });
});
