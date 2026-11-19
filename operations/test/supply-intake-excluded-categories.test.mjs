// Owner decision, 19 Nov 2026 (programmatic organiser listings, decision 10):
// discovery never searches for nightlife or anything singles-related. These
// checks keep the reviewed discovery config free of both, so a category,
// template or search cannot quietly come back.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const readJson = (relative) =>
  JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
const config = "../src/workflows/supply-intake/config/";
const targets = readJson(`${config}target_categories.json`);
const matrix = readJson(`${config}search_matrix.json`);
const templates = readJson(`${config}query_templates.json`);

const excluded = /single|speed[ _-]?dat|mixer.*dating|nightlife|night[ _-]?club|clubbing/i;

test("no discovery category targets singles or nightlife", () => {
  for (const category of targets.categories) {
    assert.doesNotMatch(category.id, excluded, category.id);
    assert.doesNotMatch(category.label, excluded, category.id);
  }
});

test("no query template searches for singles or nightlife", () => {
  for (const template of templates) {
    assert.doesNotMatch(template.id, excluded, template.id);
    assert.doesNotMatch(template.category, excluded, template.id);
    for (const query of template.queryTemplates) {
      assert.doesNotMatch(query, excluded, `${template.id}: ${query}`);
    }
  }
});

test("every planned search names a reviewed category and template", () => {
  const categoryIds = new Set(targets.categories.map((category) => category.id));
  const templateIds = new Set(templates.map((template) => template.id));
  for (const search of matrix.genericSearches) {
    assert.ok(categoryIds.has(search.categoryId),
      `${search.queryTemplateId} searches unknown category ${search.categoryId}`);
    assert.ok(templateIds.has(search.queryTemplateId),
      `${search.queryTemplateId} is not a query template`);
  }
  assert.ok(templateIds.has(matrix.candidateVerification.queryTemplateId));
});
