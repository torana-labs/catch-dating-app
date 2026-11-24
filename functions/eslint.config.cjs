const js = require("@eslint/js");
const {FlatCompat} = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

function withoutRemovedCoreRules(config) {
  const rules = {...config.rules};
  delete rules["require-jsdoc"];
  delete rules["valid-jsdoc"];

  return {
    ...config,
    rules,
  };
}

module.exports = [
  {
    ignores: [
      "lib/**",
      "generated/**",
      "src/shared/generated/**",
    ],
  },
  ...compat.env({
    es6: true,
    node: true,
  }),
  ...compat
    .extends(
      "eslint:recommended",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:import/typescript",
      "google",
      "plugin:@typescript-eslint/recommended",
    )
    .map(withoutRemovedCoreRules),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module",
      },
    },
    rules: {
      quotes: ["error", "double"],
      "import/no-unresolved": 0,
      indent: ["error", 2],
    },
  },
  {
    // Replay receipts have one document shape and one TTL policy, owned by
    // src/shared/commandReceipts.ts (docs/data_contracts.md, "Command
    // receipts"). Production code reads and writes them only through its
    // helpers (commandReceiptRef, readCommandReceipt, writeCommandReceipt,
    // claimCommandReceipt), never by naming the collection or building the
    // document itself.
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts", "src/shared/commandReceipts.ts"],
    rules: {
      "no-restricted-syntax": ["error",
        {
          selector: "Literal[value='commandReceipts']",
          message: "Use the src/shared/commandReceipts.ts helpers instead " +
            "of naming the commandReceipts collection.",
        },
        {
          selector: "TemplateElement[value.raw=/(^|\\/)commandReceipts\\//]",
          message: "Use commandReceiptRef instead of building a " +
            "commandReceipts path.",
        },
        {
          selector: "ImportSpecifier[imported.name=/^(COMMAND_RECEIPTS|" +
            "buildCommandReceipt)$/]",
          message: "Write receipts with writeCommandReceipt or " +
            "claimCommandReceipt and address them with commandReceiptRef.",
        },
      ],
    },
  },
];
