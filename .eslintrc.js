/* eslint-env node */

module.exports = {
    env: {
        browser: true,
        es2021: true,
        jquery: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    overrides: [],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint'],
    rules: {
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
            },
        ],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-constant-condition': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/ban-ts-comment': 'off',
    },
};
