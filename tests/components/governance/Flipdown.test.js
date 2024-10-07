import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import FlipDownComponent from '../../../scripts/governance/Flipdown.vue';
import { FlipDown } from '../../../scripts/flipdown.js';
vi.mock('../../../scripts/flipdown.js', () => {
    const FlipDown = vi.fn();
    FlipDown.prototype.start = vi.fn();
    return { FlipDown };
});

describe('BudgetAllocated component tests', () => {
    it('updates flipdown correctly', async () => {
        const wrapper = mount(FlipDownComponent, { props: { timeStamp: 5 } });
        const flipdownElement = wrapper.find('[data-testid="flipdown"]');
        await flushPromises();
        const id = flipdownElement.wrapperElement.id;
        expect(FlipDown).toHaveBeenCalledWith(5, id);
        expect(FlipDown.prototype.start).toHaveBeenCalledOnce();
        await wrapper.setProps({ timeStamp: 10 });

        await flushPromises();
        expect(FlipDown).toHaveBeenCalledWith(5, id);
        expect(FlipDown.prototype.start).toHaveBeenCalledTimes(2);
    });
});
