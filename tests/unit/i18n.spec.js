import { describe, it, expect } from 'vitest';
import { getParentLanguage } from '../../scripts/i18n';

describe('i18n tests', () => {
    it('returns correct parent language', () => {
        expect(getParentLanguage('es-ES')).toBe('es');
        expect(getParentLanguage('es')).toBe('en');
        expect(getParentLanguage('en-US')).toBe('en');
        expect(getParentLanguage('it')).toBe('en');
        expect(getParentLanguage('en')).toBe('en');
    });
});
