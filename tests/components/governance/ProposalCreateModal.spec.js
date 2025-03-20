import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProposalCreateModal from '../../../scripts/governance/ProposalCreateModal.vue';
import { vi } from 'vitest';
import { defineComponent, h } from 'vue';

vi.stubGlobal(
    'Teleport',
    defineComponent({
        render() {
            return h('div', this.$slots.default ? this.$slots.default() : []);
        },
    })
);

describe('ProposalCreateModal component tests', () => {
    it('hides address input when advanced mode is false', async () => {
        const wrapper = mount(ProposalCreateModal, {
            props: { advancedMode: true, show: true },
            global: {
                stubs: {
                    teleport: true, // Stubs out <teleport> completely
                },
            },
        });
        let address = wrapper.find('[data-testid="proposalAddress"]');
        // Address input
        expect(address.attributes().disabled).toBe(undefined);
        expect(address.isVisible()).toBe(true);
        await wrapper.setProps({ advancedMode: false });
        address = wrapper.find('[data-testid="proposalAddress"]');
        expect(address.attributes().disabled).toBe('');
    });

    it('submits correctly', async () => {
        const wrapper = mount(ProposalCreateModal, {
            props: { advancedMode: true, isTest: true, show: true },
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
        await address.setValue('DLabsOops');
        const proposalSubmit = wrapper.find('[data-testid="proposalSubmit"]');
        await proposalSubmit.trigger('click');
        // Nothing should be emitted because address is wrong
        expect(wrapper.emitted().create).toBeUndefined();
        await address.setValue('DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb');
        await proposalSubmit.trigger('click');
        // Confirm the submission
        await wrapper
            .find('[data-testid="proposalConfirmSubmit"]')
            .trigger('click');

        expect(wrapper.emitted().create).toStrictEqual([
            [
                'Proposal Title',
                'https://proposal.com/',
                3,
                20,
                'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb',
            ],
        ]);
        await wrapper.setProps({ advancedMode: false });

        await proposalSubmit.trigger('click');
        // Confirm the submission
        await wrapper
            .find('[data-testid="proposalConfirmSubmit"]')
            .trigger('click');
        // When advanced mode is toggled off, address should reset
        expect(wrapper.emitted().create.at(-1)).toStrictEqual([
            'Proposal Title',
            'https://proposal.com/',
            3,
            20,
            undefined,
        ]);
    });
});
