import { describe, it, expect } from 'vitest';
import { beautifyNumber } from '../../scripts/misc.js';

describe('beautifyNumber', () => {
    it('should format a number without decimals correctly', () => {
        expect(beautifyNumber(12345)).toBe('12,345');
        expect(beautifyNumber('12345')).toBe('12,345');
    });

    it('should format a number with decimals and include HTML for the decimals', () => {
        expect(beautifyNumber('12345.67')).toBe(
            '12,345<span style="opacity: 0.55; ">.' + '67</span>'
        );
        expect(beautifyNumber(12345.67)).toBe(
            '12,345<span style="opacity: 0.55; ">.' + '67</span>'
        );
    });

    it('should handle numbers with a custom font size for the decimals', () => {
        expect(beautifyNumber('12345.67', '14px')).toBe(
            '12,345<span style="opacity: 0.55; font-size: 14px">.' + '67</span>'
        );
    });

    it('should handle numbers with leading 0 correctly', () => {
        expect(beautifyNumber('0.67', '')).toBe(
            '0<span style="opacity: 0.55; ">.' + '67</span>'
        );
    });

    it('should handle currency symbols correctly', () => {
        expect(beautifyNumber('USD 0.67', '')).toBe(
            'USD 0<span style="opacity: 0.55; ">.' + '67</span>'
        );
        expect(beautifyNumber('$1340139.67', '')).toBe(
            '$1,340,139<span style="opacity: 0.55; ">.' + '67</span>'
        );
    });

    it('should handle edge cases gracefully', () => {
        // Empty string input
        expect(beautifyNumber('')).toBe('NaN');

        // Zero as input
        expect(beautifyNumber('0')).toBe('0');
        expect(beautifyNumber(0)).toBe('0');

        // Negative number input
        expect(beautifyNumber('-12345.67')).toBe(
            '-12,345<span style="opacity: 0.55; ">.' + '67</span>'
        );
    });
});
