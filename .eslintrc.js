/* eslint-env node */

module.exports = {
    env: {
        browser: true,
        es2021: true,
        jquery: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 
    'plugin:@typescript-eslint/recommended-requiring-type-checking',],
    overrides: [],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
	   project: 'tsconfig.eslint.json',
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
        'no-constant-condition': 'off',
        '@typescript-eslint/no-empty-function': 'off',
	// You can assign `any` to a typed property
	'@typescript-eslint/no-unsafe-argument': 'off',
	// You can call `any` values
	//'@typescript-eslint/no-unsafe-call': 'off',
	// You can access properties on `any` values
	'@typescript-eslint/no-unsafe-member-access': 'off',
	// You can return `any` values
	'@typescript-eslint/no-unsafe-return': 'off',
	'@typescript-eslint/no-unsafe-assignment': 'off',
	'@typescript-eslint/restrict-plus-operands': 'off',
	'@typescript-eslint/restrict-template-expressions': 'off',
    },
};
