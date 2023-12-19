import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { expect } from 'vitest';
import VanityGen from '../../scripts/dashboard/VanityGen.vue';
import { vi, it, describe } from 'vitest';
import * as translation from '../../scripts/i18n.js';
import * as misc from '../../scripts/misc.js';

// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
    <div id="app"></div>
  </div>
`;

describe('VanityGen tests', () => {
    beforeEach(() => {
        vi.spyOn(translation, 'tr').mockImplementation((message, variables) => {
            return message + variables[0].char;
        });
        vi.spyOn(misc, 'createAlert').mockImplementation(
            (type, message, timeout = 0) => {
                return message;
            }
        );
        vi.spyOn(translation, 'ALERTS', 'get').mockReturnValue({
            UNSUPPORTED_WEBWORKERS: 'unsupported_web_worker',
            UNSUPPORTED_CHARACTER: 'unsupported_character',
        });
    });
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });
    it('Unsupported worker test', async () => {
        const wrapper = mount(VanityGen, {
            attachTo: document.getElementById('app'),
        });
        const generateBtn = wrapper.find('[data-testid=generateBtn]');
        await generateBtn.trigger('click');
        await nextTick();
        // We don't have a valid webworker
        expect(misc.createAlert).toHaveReturnedWith('unsupported_web_worker');
    });
    it('Vanity Gen test', async () => {
        // Mock the vanity gen worker
        // NB: we are taking for granted that the Worker of VanityGen works as intended,
        // and we are just mocking it with random stuff
        const Worker = vi.fn();
        const mocks = [
            {
                priv: new Uint8Array([30, 40, 50]),
                pub: 'Dddd',
            },
            {
                priv: new Uint8Array([50, 60, 70]),
                pub: 'Dpan',
            },
        ];
        let tryMock = 0;
        Worker.prototype.postMessage = function () {
            this.onmessage({ data: mocks[tryMock++ % mocks.length] });
        };
        Worker.prototype.terminate = vi.fn();
        vi.stubGlobal('Worker', Worker);
        vi.stubGlobal('navigator', { hardwareConcurrency: 1 });
        // Mock translate and createAlert and the two translations used
        const wrapper = mount(VanityGen, {
            attachTo: document.getElementById('app'),
        });

        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        const generateBtn = wrapper.find('[data-testid=generateBtn]');
        const prefixInput = wrapper.find('[data-testid=prefixInput]');
        // we can see the generateBtn but not the prefix input box
        expect(wrapper.emitted('import-wallet')).toBeUndefined();
        expect(generateBtn.isVisible()).toBeTruthy();
        expect(prefixInput.isVisible()).toBeFalsy();

        //click and now the prefix input box should be visible
        await generateBtn.trigger('click');
        await nextTick();
        expect(generateBtn.isVisible()).toBeTruthy();
        expect(prefixInput.isVisible()).toBeTruthy();
        expect(prefixInput.element.value).toBe('');

        // Insert a non-valid prefix
        prefixInput.element.value = 'd%a';
        prefixInput.trigger('input');
        await nextTick();
        //click again and verify the createAlert
        await generateBtn.trigger('click');
        await nextTick();
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith('unsupported_character%');
        expect(generateBtn.isVisible()).toBeTruthy();
        expect(prefixInput.isVisible()).toBeTruthy();
        expect(wrapper.emitted('import-wallet')).toBeUndefined();

        // Add another invalid character: the createAlert should be called even if we don't press the button!
        prefixInput.element.value = 'd%a$';
        prefixInput.trigger('input');
        await nextTick();
        expect(misc.createAlert).toHaveBeenCalled();
        expect(misc.createAlert).toHaveReturnedWith('unsupported_character$');

        // Now insert a long prefix, so we can stop the webworker:
        expect(prefixInput.element.disabled).toBe(false);
        prefixInput.element.value = 'panle';
        prefixInput.trigger('input');
        await nextTick();
        await generateBtn.trigger('click');
        await nextTick();
        // prefix input should be disabled while generating
        expect(generateBtn.isVisible()).toBeTruthy();
        expect(prefixInput.element.disabled).toBe(true);
        // ok... prefix was too long it will never finish! stop the execution
        await generateBtn.trigger('click');
        await nextTick();
        expect(prefixInput.element.disabled).toBe(false);
        expect(wrapper.emitted('import-wallet')).toBeUndefined();

        // monocharacter prefix
        prefixInput.element.value = 'p';
        prefixInput.trigger('input');
        await nextTick();
        await generateBtn.trigger('click');
        await nextTick();
        // We found an address! Verify that the result is the expected (mocked in this case) one
        const res = new Uint8Array([50, 60, 70]);
        expect(wrapper.emitted('import-wallet')).toHaveLength(1);
        expect(wrapper.emitted('import-wallet')[0]).toStrictEqual([res]);
    });
});
