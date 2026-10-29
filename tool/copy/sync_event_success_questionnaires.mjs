import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourcePath = path.join(root, 'copy/event_success_questionnaires_en.json');
const outputPath = path.join(
  root,
  'lib/contexts/formats/domain/event_success_compatibility_response/questionnaire_packs.dart',
);
const write = process.argv.includes('--write');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
validate(source);
const generated = render(source);

if (write) {
  fs.writeFileSync(outputPath, generated);
  console.log(`Wrote ${path.relative(root, outputPath)}.`);
} else {
  const current = fs.readFileSync(outputPath, 'utf8');
  if (current !== generated) {
    console.error(
      'Event Success questionnaire Dart is stale. Run ' +
        '`node tool/copy/sync_event_success_questionnaires.mjs --write`.',
    );
    process.exitCode = 1;
  } else {
    console.log('Event Success questionnaire copy is in sync.');
  }
}

function validate(value) {
  assert(value.version === 1, 'version must be 1');
  assert(value.locale === 'en', 'locale must be en');
  assert(value.owner === 'product', 'owner must be product');
  assert(Array.isArray(value.packs), 'packs must be an array');
  assert(
    value.packs.map((pack) => pack.id).join(',') ===
      'balanced,flirty,earnest,intentional',
    'packs must remain balanced, flirty, earnest, intentional in order',
  );
  const ids = new Set();
  for (const [packIndex, pack] of value.packs.entries()) {
    validateId(pack.id, `packs[${packIndex}].id`, ids);
    validateText(pack.title, `packs[${packIndex}].title`);
    validateText(pack.subtitle, `packs[${packIndex}].subtitle`);
    validateQuestions(pack.questions, `packs[${packIndex}].questions`, ids);
  }
  validateQuestions(value.customStarterQuestions, 'customStarterQuestions', ids);
  validateText(value.customFallback?.title, 'customFallback.title');
  validateText(value.customFallback?.subtitle, 'customFallback.subtitle');
  validateText(value.normalizationFallbacks?.question, 'normalizationFallbacks.question');
  validateText(value.normalizationFallbacks?.option, 'normalizationFallbacks.option');
  validateText(value.normalizationFallbacks?.option1, 'normalizationFallbacks.option1');
  validateText(value.normalizationFallbacks?.option2, 'normalizationFallbacks.option2');
}

function validateQuestions(questions, field, ids) {
  assert(Array.isArray(questions) && questions.length > 0, `${field} must not be empty`);
  for (const [questionIndex, question] of questions.entries()) {
    const prefix = `${field}[${questionIndex}]`;
    validateId(question.id, `${prefix}.id`, ids);
    validateText(question.prompt, `${prefix}.prompt`);
    assert(
      Array.isArray(question.options) && question.options.length >= 2,
      `${prefix}.options must contain at least two choices`,
    );
    for (const [optionIndex, option] of question.options.entries()) {
      validateId(option.id, `${prefix}.options[${optionIndex}].id`, ids);
      validateText(option.label, `${prefix}.options[${optionIndex}].label`);
    }
  }
}

function validateId(value, field, ids) {
  assert(
    typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value),
    `${field} must be a stable snake_case id`,
  );
  assert(!ids.has(value), `${field} duplicates id ${value}`);
  ids.add(value);
}

function validateText(value, field) {
  assert(typeof value === 'string' && value.trim() === value && value.length > 0, `${field} must be non-empty trimmed text`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid questionnaire copy: ${message}`);
}

function render(value) {
  const packs = value.packs.map(renderPack).join('\n\n');
  const packNames = value.packs.map((pack) => dartIdentifier(pack.id));
  return `// GENERATED FROM copy/event_success_questionnaires_en.json. DO NOT EDIT.\n` +
    `// Run: node tool/copy/sync_event_success_questionnaires.mjs --write\n\n` +
    `part of '../event_success_compatibility_response.dart';\n\n` +
    `abstract final class EventSuccessQuestionnairePackLibrary {\n` +
    `  static const fallbackQuestion = ${quote(value.normalizationFallbacks.question)};\n` +
    `  static const fallbackOption = ${quote(value.normalizationFallbacks.option)};\n` +
    `  static const fallbackOption1 = ${quote(value.normalizationFallbacks.option1)};\n` +
    `  static const fallbackOption2 = ${quote(value.normalizationFallbacks.option2)};\n\n` +
    value.packs.map((pack) => `  static const ${dartIdentifier(pack.id)}Id = ${quote(pack.id)};`).join('\n') +
    `\n  static const customId = 'custom';\n\n` +
    packs +
    `\n\n  static const customStarterQuestions = <EventSuccessCompatibilityQuestion>[\n` +
    value.customStarterQuestions.map((question) => indent(renderQuestion(question), 4)).join(',\n') +
    `,\n  ];\n\n` +
    `  static const allTemplates = <EventSuccessQuestionnairePack>[\n` +
    packNames.map((name) => `    ${name},`).join('\n') +
    `\n  ];\n\n` +
    `  static EventSuccessQuestionnairePack byIdOrDefault(String id) {\n` +
    `    return allTemplates.firstWhere(\n` +
    `      (pack) => pack.id == id,\n` +
    `      orElse: () => balanced,\n` +
    `    );\n` +
    `  }\n\n` +
    `  static EventSuccessQuestionnairePack resolve(\n` +
    `    EventSuccessQuestionnaireConfig config,\n` +
    `  ) {\n` +
    `    if (config.usesCustom && config.customQuestions.isNotEmpty) {\n` +
    `      return EventSuccessQuestionnairePack(\n` +
    `        id: customId,\n` +
    `        title: config.customTitle?.trim().isNotEmpty == true\n` +
    `            ? config.customTitle!.trim()\n` +
    `            : ${quote(value.customFallback.title)},\n` +
    `        subtitle: ${quote(value.customFallback.subtitle)},\n` +
    `        questions: config.customQuestions,\n` +
    `        custom: true,\n` +
    `      );\n` +
    `    }\n` +
    `    return byIdOrDefault(config.templateId);\n` +
    `  }\n` +
    `}\n`;
}

function renderPack(pack) {
  return `  static const ${dartIdentifier(pack.id)} = EventSuccessQuestionnairePack(\n` +
    `    id: ${dartIdentifier(pack.id)}Id,\n` +
    `    title: ${quote(pack.title)},\n` +
    `    subtitle: ${quote(pack.subtitle)},\n` +
    `    questions: <EventSuccessCompatibilityQuestion>[\n` +
    pack.questions.map((question) => indent(renderQuestion(question), 6)).join(',\n') +
    `,\n    ],\n` +
    `  );`;
}

function renderQuestion(question) {
  return `EventSuccessCompatibilityQuestion(\n` +
    `  id: ${quote(question.id)},\n` +
    `  prompt: ${quote(question.prompt)},\n` +
    `  options: <EventSuccessCompatibilityOption>[\n` +
    question.options.map((option) =>
      `    EventSuccessCompatibilityOption(\n` +
      `      id: ${quote(option.id)},\n` +
      `      label: ${quote(option.label)},\n` +
      `    )`,
    ).join(',\n') +
    `,\n  ],\n` +
    `)`;
}

function quote(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('$', '\\$').replaceAll('\n', '\\n')}'`;
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value.split('\n').map((line) => prefix + line).join('\n');
}

function dartIdentifier(value) {
  return value.replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
}
