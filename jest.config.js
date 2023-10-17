/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
    // An array of file extensions your modules use
    moduleFileExtensions: ['js', 'json', 'vue'],

    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
    moduleNameMapper: {
        '^lodash-es$': 'lodash',
    },

    // The test environment that will be used for testing
    testEnvironment: 'node',
    transform: {
        '.*\\.(vue)$': '@vue/vue3-jest',
        '.*\\.(js)$': 'babel-jest',
    },
};

export default config;
