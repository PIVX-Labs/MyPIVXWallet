import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import MasternodeRow from '../../scripts/masternode/MasternodeRow.vue';

vi.mock('../../scripts/i18n.js');

class MockMasternode {
    async getFullData() {
        return { status: 'ENABLED', lastseen: Date.now() };
    }
}

vi.mock('../masternode.js', () => ({
    default: MockMasternode,
}));

describe('MasternodeRow', () => {
    it('renders correctly with initial props', async () => {
        const wrapper = mount(MasternodeRow, {
            props: {
                masternode: new MockMasternode(),
            },
        });
        expect(wrapper.find('.masternodeBadges').exists()).toBe(true);
        expect(wrapper.find('.mnLastSeen').exists()).toBe(true);
    });

    it('updates info when masternode data changes', async () => {
        const mockMasternode = new MockMasternode();
        const wrapper = mount(MasternodeRow, {
            props: {
                masternode: mockMasternode,
            },
        });

        await mockMasternode.getFullData();
        expect(wrapper.vm.info.status).toBe('ENABLED');
        expect(wrapper.vm.info.lastSeen).toBeDefined();
    });

    it('applies correct class based on status', async () => {
        const mockMasternode = new MockMasternode();
        vi.spyOn(mockMasternode, 'getFullData').mockResolvedValue({
            status: 'PRE_ENABLED',
            lastseen: Date.now(),
        });

        const wrapper = mount(MasternodeRow, {
            props: { masternode: mockMasternode },
        });

        await wrapper.vm.updateMnData(mockMasternode);
        expect(wrapper.find('.masternodeBadges').classes()).toContain(
            'preEnabledBadge'
        );
    });
});
