// Declare webpack injected variables
// typescript complains that the export is unnecessary here
// but if I remove it it doesn't work
// @ts-ignore
export declare global {
    const VERSION: string;
    const CHANGELOG: string;
}
