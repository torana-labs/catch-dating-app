import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checkLoadingComposition,
  legacyCollectionAllowanceFor,
  legacyCollectionRecipeCeiling,
  legacyRowAllowanceFor,
  legacyRowRecipeCeiling,
  scanLoadingCompositionSource,
} from './check_loading_composition.mjs';

test('rejects hand-built loading rows on protected Host and Consumer screens', () => {
  for (const relativePath of [
    'lib/hosts/today/presentation/widgets/host_today_body.dart',
    'lib/hosts/events/presentation/widgets/host_events_list.dart',
    'lib/hosts/presentation/customers/host_customers_screen.dart',
    'lib/hosts/presentation/forms/host_form_responses_section.dart',
    'lib/hosts/presentation/forms/host_forms_screen.dart',
    'lib/hosts/presentation/forms/host_form_overview_section_list.dart',
    'lib/hosts/presentation/forms/host_form_templates_screen.dart',
    'lib/hosts/presentation/forms/host_form_automations_screen.dart',
    'lib/hosts/presentation/customers/host_saved_audiences_workspace.dart',
    'lib/hosts/presentation/customers/host_saved_audience_section.dart',
    'lib/hosts/presentation/customers/host_customer_applications_section.dart',
    'lib/hosts/presentation/inbox/host_new_message_screen.dart',
    'lib/hosts/presentation/host_operations/host_team_hosted_organizers_section.dart',
    'lib/events/presentation/events_screen.dart',
    'lib/swipes/presentation/discover_screen.dart',
  ]) {
    const {findings} = scanLoadingCompositionSource({
      relativePath,
      source: 'return const CatchSkeleton.rows(count: 4);',
    });
    assert.deepEqual(findings.map((item) => item.code), ['LOADING-COMPOSITION-001']);
  }
});

test('allows known Field layouts and bans generic rows in every app file', () => {
  const valid = scanLoadingCompositionSource({
    relativePath: 'lib/hosts/events/presentation/widgets/host_events_list.dart',
    source: 'return CatchSection.sliverLoadingRows(itemCount: 4, layoutBuilder: (_, _) => CatchRecordLayout.placeholder(icon: CatchIcons.eventOutlined));',
  });
  assert.equal(valid.findings.length, 0);
  const legacy = scanLoadingCompositionSource({
    relativePath: 'lib/hosts/presentation/widgets/host_loading_skeleton.dart',
    source: 'return const CatchSkeleton.rows(count: 4);',
  });
  assert.equal(legacy.findings.length, 0);
  assert.equal(legacy.legacyCount, 1);
  assert.equal(legacyRowAllowanceFor('lib/hosts/presentation/widgets/host_event_participants_section.dart'), 0);
  assert.equal(legacyRowAllowanceFor('lib/hosts/presentation/widgets/host_loading_skeleton.dart'), 0);
  assert.equal(legacyRowAllowanceFor('lib/hosts/presentation/new_screen.dart'), 0);
  assert.equal(legacyCollectionAllowanceFor('lib/swipes/presentation/swipe_hub_screen.dart'), 0);
  assert.equal(legacyCollectionAllowanceFor('lib/swipes/presentation/new_screen.dart'), 0);
});

test('rejects root typography overrides while ignoring comments and strings', () => {
  const relativePath = 'lib/hosts/today/presentation/widgets/host_today_body.dart';
  const broken = scanLoadingCompositionSource({
    relativePath,
    source: 'return CatchTopBar.primaryRail(title: "Today", titleStyle: CatchTextStyles.eventTitle(context));',
  });
  assert.deepEqual(broken.findings.map((item) => item.code), ['ROOT-TITLE-001']);
  const clean = scanLoadingCompositionSource({
    relativePath,
    source: '// CatchSkeleton.rows()\nfinal note = "CatchTopBar.primaryRail(titleStyle: bad)";\nreturn CatchTopBar.primaryRail(title: "Today");',
  });
  assert.equal(clean.findings.length, 0);
});

test('a new unresolved Host file cannot add a generic row recipe', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catch-loading-lint-'));
  try {
    const relativePath = 'lib/hosts/presentation/new_screen.dart';
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
    fs.writeFileSync(absolutePath, 'CatchSkeleton.rows(count: 2);\n');
    const result = checkLoadingComposition({root});
    assert.ok(result.findings.some((finding) =>
      finding.path === relativePath &&
      finding.code === 'LOADING-COMPOSITION-RATCHET'
    ));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('a new Consumer file cannot add a generic collection recipe', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catch-loading-collection-lint-'));
  try {
    const relativePath = 'lib/explore/presentation/new_screen.dart';
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
    fs.writeFileSync(absolutePath, 'CatchSkeleton.cards(count: 2);\n');
    const result = checkLoadingComposition({root});
    assert.ok(result.findings.some((finding) =>
      finding.path === relativePath &&
      finding.code === 'LOADING-COMPOSITION-RATCHET'
    ));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('repository protected surfaces satisfy the loading contract', () => {
  const result = checkLoadingComposition();
  assert.deepEqual(result.findings, []);
  assert.ok(result.filesScanned > 0);
  assert.equal(result.legacyCount, legacyRowRecipeCeiling);
  assert.equal(result.legacyCollectionCount, legacyCollectionRecipeCeiling);
});
