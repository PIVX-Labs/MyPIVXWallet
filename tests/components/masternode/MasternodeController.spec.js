import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MasternodeController from '../../../scripts/masternode/MasternodeController.vue';
import * as misc from '../../../scripts/misc.js';
import { nextTick } from 'vue';

vi.mock('../../../scripts/i18n.js');

describe('MasternodeController component tests', () => {
    /**
     * @type{import('@vue/test-utils').VueWrapper<MasternodeController>}
     */
    let wrapper;
    let fullData;
    let masternode;
    beforeEach(() => {
        fullData = {
            lastseen: 1725009728331,
            status: 'ENABLED',
            version: 70926,
            network: 'ipv6',
        };
        masternode = vi.fn();
        masternode.getFullData = vi.fn().mockReturnValue(fullData);
        masternode.getStatus = vi.fn().mockReturnValue(fullData.status);
        masternode.addr = '::1';
        wrapper = mount(MasternodeController, {
            props: {
                masternode,
            },
        });

        vi.spyOn(misc, 'createAlert').mockImplementation(
            (type, message, timeout = 0) => {
                return message;
            }
        );
        return vi.clearAllMocks;
    });

    it('renders data correctly', () => {
        expect(wrapper.find('[data-testid="mnProtocol"]').text()).toBe('70926');
        expect(wrapper.find('[data-testid="mnStatus"]').text()).toBe('ENABLED');
        expect(wrapper.find('[data-testid="mnNetType"]').text()).toBe('IPV6');
        expect(wrapper.find('[data-testid="mnIp"]').text()).toBe('::1');
        expect(wrapper.find('[data-testid="mnLastSeen"]').text()).toBe(
            '9:22:08 AM'
        );
    });

    it('emits start when mn goes missing', async () => {
        fullData.status = 'MISSING';
        masternode = vi.fn();
        masternode.getFullData = vi.fn().mockReturnValue(fullData);
        masternode.getStatus = vi.fn().mockReturnValue(fullData.status);
        masternode.addr = '::1';
        await wrapper.setProps({ masternode });

        await flushPromises();
        expect(wrapper.emitted().start).toStrictEqual([[{ restart: false }]]);
    });

    it('emits restart event on button click', async () => {
        await wrapper.find('[data-testid="restartButton"]').trigger('click');
        expect(wrapper.emitted().start).toStrictEqual([[{ restart: true }]]);
    });

    it('emits destroy event on button click', async () => {
        await wrapper.find('[data-testid="destroyButton"]').trigger('click');
        expect(wrapper.emitted().destroy).toHaveLength(1);
    });
});
