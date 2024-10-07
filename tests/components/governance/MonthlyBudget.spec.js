import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MonthlyBudget from '../../../scripts/governance/MonthlyBudget.vue';

describe('MonthlyBudget component tests', () => {
    it('displays correctly', () => {
        const wrapper = mount(MonthlyBudget, {
            props: {
                currency: 'usd',
                price: 1.3,
            },
        });
        expect(wrapper.find('[data-testid="monthlyBudgetValue"]').text()).toBe(
            '561,600'
        );
        expect(
            wrapper.find('[data-testid="monthlyBudgetCurrency"]').text()
        ).toBe('USD');
    });
});
