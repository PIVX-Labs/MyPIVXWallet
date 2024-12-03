import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProposalPayment from '../../../scripts/governance/ProposalPayment.vue';
import MobileProposalPayment from '../../../scripts/governance/MobileProposalPayment.vue';
import MobileProposalPayment from '../../../scripts/governance/MobileProposalPayment.vue';

vi.mock('../../../scripts/i18n.js');
for (const { Component, name } of [
    {
        Component: ProposalPayment,
        name: 'ProposalPayment',
    },
    { Component: MobileProposalPayment, name: 'MobileProposalPayment' },
]) {
    describe(`${name} component tests`, () => {
        /**
         * @type{import('@vue/test-utils').VueWrapper<ProposalName>}
         */
        let wrapper;
        beforeEach(() => {
            wrapper = mount(Component, {
                props: {
                    price: 1.3,
                    proposal: {
                        MonthlyPayment: 10000,
                        RemainingPaymentCount: 3,
                        TotalPayment: 30000,
                    },
                    strCurrency: 'usd',
                },
            });
        });
        it('renders correctly', () => {
            expect(
                wrapper.find('[data-testid="proposalMonthlyPayment"]').text()
            ).toBe('10,000');
            // 1.3 * 10000
            expect(wrapper.find('[data-testid="proposalFiat"]').text()).toBe(
                '13,000 USD'
            );
            // Match general phrase, but ignore spacing
            expect(
                wrapper.find('[data-testid="governInstallments"]').text()
            ).toMatch(
                /3\s*proposalPaymentsRemaining\s*30,000 PIV proposalPaymentTotal/
            );
        });
    });
}
