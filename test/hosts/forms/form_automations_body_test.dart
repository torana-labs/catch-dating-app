import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/forms/form_automations_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('a form lists its rules, presets and run outcomes', (
    tester,
  ) async {
    final edited = <String>[];
    final presets = <HostFormAutomationActionKind>[];
    var more = 0;
    await _pump(
      tester,
      HostFormAutomationsBody(
        formId: 'form_1',
        state: HostFormAutomationsState(
          rules: [_rule],
          runs: [_run],
          hasMore: true,
        ),
        sources: null,
        onEdit: (rule) => edited.add(rule.ruleId),
        onPreset: (_, kind) => presets.add(kind),
        onLoadMore: () => more++,
        onRetry: () {},
      ),
    );

    expect(find.text('Welcome new applicants'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('automation-edit-rule_1')));
    expect(edited, ['rule_1']);

    final notify = find.byKey(const ValueKey('automation-preset-notifyTeam'));
    await ensureCentered(tester, notify);
    await tester.tap(notify);
    expect(presets, [HostFormAutomationActionKind.notifyTeam]);

    expect(find.textContaining('Attempt 2', findRichText: true), findsWidgets);
    expect(
      find.textContaining('Webhook down', findRichText: true),
      findsWidgets,
    );
    final runsMore = find.byKey(const ValueKey('automation-runs-more'));
    await ensureCentered(tester, runsMore);
    await tester.tap(runsMore);
    expect(more, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an empty form says so and still offers presets', (tester) async {
    await _pump(
      tester,
      HostFormAutomationsBody(
        formId: 'form_1',
        state: const HostFormAutomationsState(
          rules: [],
          runs: [],
          hasMore: false,
          mutatingRuleIds: {'new'},
        ),
        sources: null,
        onEdit: (_) {},
        onPreset: (_, _) {},
        onLoadMore: () {},
        onRetry: () {},
      ),
    );
    expect(find.text('No automations yet'), findsOneWidget);
    final preset = tester.widget<CatchButton>(
      find.byKey(const ValueKey('automation-preset-createCrmContact')),
    );
    expect(preset.onPressed, isNull);
  });
}

Future<void> _pump(WidgetTester tester, Widget body) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(child: CatchScreen(body: body)),
    ),
  );
  await pumpFeatureUi(tester);
}

final _rule = HostFormAutomationRule(
  ruleId: 'rule_1',
  organizerId: 'org_1',
  formId: 'form_1',
  name: 'Welcome new applicants',
  enabled: true,
  revision: 2,
  trigger: HostFormAutomationTrigger.responseSubmitted,
  delayMinutes: 30,
  condition: null,
  actions: const [
    HostFormAutomationAction(
      actionId: 'a1',
      kind: HostFormAutomationActionKind.notifyTeam,
      tagId: null,
      eventId: null,
      webhookUrl: null,
      webhookSecretConfigured: false,
      channel: null,
    ),
  ],
  updatedAt: DateTime(2026, 9, 3),
);

final _run = HostFormAutomationRun(
  runId: 'run_1',
  ruleId: 'rule_1',
  ruleRevision: 2,
  responseId: 'response_1',
  eventKind: 'submitted',
  status: HostFormAutomationRunStatus.partiallyFailed,
  attemptCount: 2,
  actionResults: const [
    {'kind': 'notifyTeam', 'status': 'succeeded'},
  ],
  errorMessage: 'Webhook down',
  createdAt: DateTime(2026, 9, 3, 10),
  completedAt: null,
);
