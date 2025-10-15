module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ],
    env: {
        node: true,
    },
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "error",
            { argsIgnorePattern: "^_" },
        ],
    },
    overrides: [
        {
            files: ["tests/**/*"],
            rules: {
                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/no-unused-vars": "off",
                "no-empty": "off",
                "@typescript-eslint/no-var-requires": "off",
                "require-yield": "off",
            },
        },
        {
            files: ["**/*.d.ts"],
            rules: {
                "@typescript-eslint/no-explicit-any": "off",
            },
        },
    ],
};
