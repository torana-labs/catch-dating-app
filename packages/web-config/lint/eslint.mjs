import parser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";

// D17: table and image families wait for their styled library components.
// This matches the production-source scope of the consolidation scorecard.
export const forbiddenElements = [
  "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "section",
  "article", "header", "footer", "nav", "main", "aside", "ul", "ol", "li",
  "button", "input", "select", "textarea", "label", "a", "form", "strong", "small",
];
const drawingProps = ["className", "style"];
const productionRules = {
  "react/forbid-elements": ["error", {forbid: forbiddenElements}],
  "react/forbid-dom-props": ["error", {forbid: drawingProps.map((propName) => ({
    propName, disallowedFor: forbiddenElements,
  }))}],
  "react/forbid-component-props": ["error", {forbid: drawingProps}],
};
const examples = ["src/**/*.test.{js,jsx,ts,tsx}", "src/**/*.stories.{js,jsx,ts,tsx}"];

export default [
  {ignores: ["src/**/generated/**"]},
  {linterOptions: {noInlineConfig: true, reportUnusedDisableDirectives: "error"}},
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {parser, parserOptions: {ecmaFeatures: {jsx: true}}},
    plugins: {react},
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: examples,
    rules: productionRules,
  },
  {
    // Keep the old story/test control and class-name guards without adding
    // demonstration-only text/layout nodes to the production markup measure.
    files: examples,
    ignores: ["src/shared/ui/**", "src/shared/site/**"],
    rules: {
      "react/forbid-elements": ["error", {forbid: ["a", "button", "input", "select", "textarea"]}],
      "react/forbid-dom-props": ["error", {forbid: ["className"]}],
      "react/forbid-component-props": ["error", {forbid: ["className"]}],
    },
  },
];
