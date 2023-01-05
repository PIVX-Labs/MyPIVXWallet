module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
	"jquery": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
	"@typescript-eslint/no-unused-vars": ["warn", {
	    "argsIgnorePattern": "^_",
	}],
	"no-constant-condition": "off",
	"@typescript-eslint/no-empty-function": "off",
    }
}
