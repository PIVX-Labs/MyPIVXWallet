import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LocalProposalStatus from '../../../scripts/governance/LocalProposalStatus.vue';

vi.mock('../../../scripts/i18n.js');

describe('LocalProposalStatus component tests', () => {
    it('displays correct information', async () => {
        const wrapper = mount(LocalProposalStatus, {
            props: {
                proposal: {
                    blockHeight: 100_100,
                },
                blockCount: 100_105,
            },
        });
        expect(wrapper.find('[data-testid="localProposalStatus"]').text()).toBe(
            '1 block proposalFinalisationRemaining'
        );
        await wrapper.setProps({ proposal: { blockHeight: 99_999 } });
        expect(wrapper.find('[data-testid="localProposalStatus"]').text()).toBe(
            'proposalFinalisationReady'
        );
        await wrapper.setProps({ proposal: { blockHeight: 99_998 } });
        expect(wrapper.find('[data-testid="localProposalStatus"]').text()).toBe(
            'proposalFinalisationReady'
        );
        await wrapper.setProps({ proposal: { blockHeight: 1000 } });
        expect(wrapper.find('[data-testid="localProposalStatus"]').text()).toBe(
            'proposalFinalisationExpired'
        );
    });
    it('emits finalize event when button is clicked', async () => {
        const wrapper = mount(LocalProposalStatus, {
            props: {
                proposal: {
                    blockHeight: 100_100,
                },
                blockCount: 100_105,
            },
        });
        expect(wrapper.emitted()).toStrictEqual({});
        const button = wrapper.find('[data-testid="finalizeProposalButton"]');
        await button.trigger('click');
        // One event with no args
        expect(wrapper.emitted().finalizeProposal).toStrictEqual([[]]);
    });
});
