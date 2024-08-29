import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProposalVotes from '../../../scripts/governance/ProposalVotes.vue';
import MobileProposalVotes from '../../../scripts/governance/MobileProposalVotes.vue';

vi.mock('../../../scripts/i18n.js');
for (const { Component, name } of [
    { Component: ProposalVotes, name: 'ProposalVotes' },
    { Component: MobileProposalVotes, name: 'MobileProposalVotes' },
]) {
    describe(`${name} component tests`, () => {
        /**
         * @type{import('@vue/test-utils').VueWrapper<ProposalVotes>}
         */
        let wrapper;
        beforeEach(() => {
            wrapper = mount(Component, {
                props: {
                    proposal: {
                        Yeas: 32,
                        Nays: 54,
                        Ratio: 32 / (32 + 54),
                    },
                },
            });
        });

        it('renders correctly', () => {
            expect(
                wrapper.find('[data-testid="proposalVotes"]').text()
            ).toMatch(/37.2%\s*32 \/ 54/);
        });
    });
}
