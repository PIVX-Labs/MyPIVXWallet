import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BudgetAllocated from '../../../scripts/governance/BudgetAllocated.vue';

describe('BudgetAllocated component tests', () => {
    it('displays information correctly', () => {
        const wrapper = mount(BudgetAllocated, {
            props: { currency: 'usd', price: 1.5, allocatedBudget: 10_000 },
        });
        expect(
            wrapper.find('[data-testid="allocatedGovernanceBudget"]').text()
        ).toBe('10,000');
        expect(
            wrapper
                .find('[data-testid="allocatedGovernanceBudgetValue"]')
                .text()
        ).toBe('15,000'); // 1.5 * 10000
        expect(
            wrapper
                .find('[data-testid="allocatedGovernanceBudgetCurrency"]')
                .text()
        ).toBe('USD'); // currency to upper case
    });
});
