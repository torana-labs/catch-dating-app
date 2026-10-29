import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test(
    'automation webhook URL shape rejects credentials, fragments and non-HTTPS ports',
    () {
      expect(
        isHostAutomationWebhookUrl('https://example.com/hook?q=1'),
        isTrue,
      );
      for (final value in <String?>[
        null,
        '',
        'http://example.com',
        'https://',
        'https://user:secret@example.com',
        'https://example.com/#fragment',
        'https://example.com:8443',
      ]) {
        expect(isHostAutomationWebhookUrl(value), isFalse, reason: value);
      }
    },
  );

  testWidgets(
    'global editor saves an enabled acceptance webhook and retries the same request',
    (tester) async {
      final forms = _Forms()..failOnce = true;
      var saved = 0;
      await _pump(
        tester,
        forms,
        _Crm(),
        HostAutomationRuleEditor(
          organizerId: 'org',
          onSaved: () => saved++,
          onCancel: () {},
        ),
      );
      await tester.enterText(
        _input('automation-name'),
        'Welcome accepted applicants',
      );
      await _choose(tester, 'Action', 'Send signed webhook');
      await tester.ensureVisible(_namedInput('Webhook URL'));
      await tester.enterText(
        _namedInput('Webhook URL'),
        'https://example.com/accepted',
      );
      await tester.ensureVisible(_namedInput('Signing secret'));
      await tester.enterText(_namedInput('Signing secret'), 's' * 32);
      await tester.ensureVisible(find.byType(CatchToggleInput));
      await tester.tap(find.byType(CatchToggleInput));
      await tester.tap(find.byKey(const ValueKey('automation-save')));
      await pumpFeatureUi(tester);
      expect(saved, 0);
      expect(forms.requests, hasLength(1));
      final response = Completer<void>();
      forms.saveWait = response.future;
      await tester.tap(find.byKey(const ValueKey('automation-save')));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 300));
      expect(saved, 0);
      response.complete();
      await pumpFeatureUi(tester);
      expect(saved, 1);
      expect(forms.requests[0], forms.requests[1]);
      expect(
        forms.last!.trigger,
        HostFormAutomationTrigger.applicationAccepted,
      );
      expect(forms.last!.formId, isNull);
      expect(forms.last!.enabled, isTrue);
      expect(
        forms.actions!.single['webhookUrl'],
        'https://example.com/accepted',
      );
      expect(forms.actions!.single['webhookSecret'], 's' * 32);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('editing preserves a configured secret and expected revision', (
    tester,
  ) async {
    final forms = _Forms();
    final rule = _rule(
      actions: const [
        HostFormAutomationAction(
          actionId: 'hook',
          kind: HostFormAutomationActionKind.signedWebhook,
          tagId: null,
          eventId: null,
          webhookUrl: 'https://example.com/hook',
          webhookSecretConfigured: true,
          channel: null,
        ),
      ],
    );
    await _pump(
      tester,
      forms,
      _Crm(),
      HostAutomationRuleEditor(
        organizerId: 'org',
        initialRule: rule,
        onSaved: () {},
        onCancel: () {},
      ),
    );
    expect(_input('automation-secret-hook'), findsOneWidget);
    expect(
      tester
          .widget<EditableText>(_input('automation-secret-hook'))
          .controller
          .text,
      isEmpty,
    );
    await tester.tap(find.byKey(const ValueKey('automation-save')));
    await pumpFeatureUi(tester);
    expect(forms.actions!.single['webhookSecret'], isNull);
    expect(forms.expectedRevision, 3);
    expect(forms.last!.ruleId, 'rule');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'attendance message selection loads older drafts and pins the reviewed revision',
    (tester) async {
      final forms = _Forms();
      final crm = _Crm();
      final rule = _rule(
        trigger: HostFormAutomationTrigger.eventAttended,
        actions: const [
          HostFormAutomationAction(
            actionId: 'message',
            kind: HostFormAutomationActionKind.campaignHandoff,
            tagId: null,
            eventId: null,
            webhookUrl: null,
            webhookSecretConfigured: false,
            channel: 'whatsapp',
          ),
        ],
      );
      await _pump(
        tester,
        forms,
        crm,
        HostAutomationRuleEditor(
          organizerId: 'org',
          initialRule: rule,
          onSaved: () {},
          onCancel: () {},
        ),
      );
      await tester.ensureVisible(
        find.byKey(const ValueKey('automation-delay')),
      );
      await tester.enterText(_input('automation-delay'), '90');
      await tester.ensureVisible(find.text('Load more message drafts'));
      await tester.tap(find.text('Load more message drafts'));
      await pumpFeatureUi(tester);
      await _choose(tester, 'Message draft', 'Follow up · Thanks · Attendees');
      await tester.tap(find.byKey(const ValueKey('automation-save')));
      await pumpFeatureUi(tester);
      expect(crm.cursors, [null, 'older']);
      expect(forms.last!.delayMinutes, 90);
      expect(forms.last!.trigger, HostFormAutomationTrigger.eventAttended);
      expect(forms.actions!.single['campaignId'], 'draft');
      expect(forms.actions!.single['campaignRevision'], 7);
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'rule pause and history pagination preserve other run receipts',
    () async {
      final forms = _Forms();
      final container = ProviderContainer(
        overrides: [hostFormsRepositoryProvider.overrideWithValue(forms)],
      );
      addTearDown(container.dispose);
      final provider = hostFormAutomationsControllerProvider('org', null);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await container.read(provider.future);
      expect(
        await container.read(provider.notifier).setEnabled(_rule(), false),
        isTrue,
      );
      expect(
        container.read(provider).requireValue.rules.single.enabled,
        isFalse,
      );
      await container.read(provider.notifier).loadMore();
      expect(forms.cursors, [null, 'next']);
      expect(container.read(provider).requireValue.runs.map((r) => r.runId), [
        'first',
        'second',
      ]);
      expect(container.read(provider).requireValue.canLoadMore, isFalse);
    },
  );
}

Future<void> _pump(
  WidgetTester tester,
  _Forms forms,
  _Crm crm,
  Widget child,
) async {
  await tester.binding.setSurfaceSize(const Size(430, 900));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        hostFormsRepositoryProvider.overrideWithValue(forms),
        hostCampaignRepositoryProvider.overrideWithValue(crm),
        hostSavedAudienceFilterOptionsProvider('org').overrideWith(
          (ref) async => const HostSavedAudienceFilterOptions.empty(),
        ),
      ],
      child: MaterialApp(theme: AppTheme.light, home: child),
    ),
  );
  await pumpFeatureUi(tester);
}

Finder _input(String key) => find.descendant(
  of: find.byKey(ValueKey(key)),
  matching: find.byType(EditableText),
);
Future<void> _choose(WidgetTester tester, String field, String value) async {
  final anchor = find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == field,
  );
  await ensureCentered(tester, anchor);
  await tester.tap(anchor);
  await pumpFeatureUi(tester);
  await tester.tap(
    find.descendant(
      of: find.byWidgetPredicate(
        (widget) => widget is CatchMenu<Object?> && widget.builder == null,
      ),
      matching: find.text(value),
    ),
  );
  await pumpFeatureUi(tester);
}

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

class _Forms extends HostFormsRepository {
  _Forms() : super(_UnusedFunctions());
  final requests = <String>[];
  final cursors = <String?>[];
  bool failOnce = false;
  Future<void>? saveWait;
  HostFormAutomationRule? last;
  List<Map<String, Object?>>? actions;
  int? expectedRevision;
  @override
  Future<HostFormAutomationRule> saveAutomation({
    required String organizerId,
    required String? formId,
    required String requestId,
    required String name,
    required bool enabled,
    required HostFormAutomationTrigger trigger,
    required List<Map<String, Object?>> actions,
    String? ruleId,
    int? expectedRevision,
    Map<String, Object?>? condition,
    String? triggerEventId,
    int delayMinutes = 0,
  }) async {
    requests.add(requestId);
    if (saveWait != null) await saveWait;
    this.actions = actions;
    this.expectedRevision = expectedRevision;
    if (failOnce) {
      failOnce = false;
      throw FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Try again',
      );
    }
    return last = HostFormAutomationRule(
      ruleId: ruleId ?? 'created',
      organizerId: organizerId,
      formId: formId,
      name: name,
      enabled: enabled,
      revision: 4,
      trigger: trigger,
      triggerEventId: triggerEventId,
      delayMinutes: delayMinutes,
      condition: condition,
      actions: const [],
      updatedAt: DateTime(2026, 9, 3),
    );
  }

  @override
  Future<HostFormAutomationPage> listAutomations({
    required String organizerId,
    required String? formId,
    String? ruleId,
    String? cursor,
    int limit = 50,
  }) async {
    cursors.add(cursor);
    return HostFormAutomationPage(
      rules: [last ?? _rule()],
      runs: [_run(cursor == null ? 'first' : 'second')],
      nextCursor: cursor == null ? 'next' : null,
    );
  }

  @override
  Future<HostFormAutomationRule> setAutomationEnabled({
    required String organizerId,
    required String ruleId,
    required int expectedRevision,
    required bool enabled,
  }) async => last = _rule(enabled: enabled);
}

class _Crm extends HostCampaignRepository {
  _Crm() : super(_UnusedFunctions());
  final cursors = <String?>[];
  @override
  Future<HostSendsPage> listCampaigns(
    String organizerId, {
    String? cursor,
    int limit = 50,
  }) async {
    cursors.add(cursor);
    return HostSendsPage(
      organizerId: organizerId,
      sends: cursor == null
          ? []
          : [
              HostCampaignSendSummary(
                campaignId: 'draft',
                name: 'Follow up',
                status: 'draft',
                savedAudienceId: 'audience',
                savedAudienceName: 'Attendees',
                segments: const {},
                templateId: 'template',
                templateName: 'Thanks',
                audienceCounts: const HostCampaignCounts({}),
                deliveryCounts: const HostCampaignCounts({}),
                scheduledAt: null,
                dispatchedAt: null,
                activityAt: DateTime(2026),
              ),
            ],
      nextCursor: cursor == null ? 'older' : null,
    );
  }

  @override
  Future<HostCampaign> getCampaignReport(
    String organizerId,
    String campaignId,
  ) async => HostCampaign(
    organizerId: organizerId,
    campaignId: campaignId,
    status: 'draft',
    revision: 7,
    audienceCounts: const HostCampaignCounts({}),
    deliveryCounts: const HostCampaignCounts({}),
    senderStatus: 'active',
    templateStatus: 'APPROVED',
    canApprove: false,
    canDispatch: false,
    blockers: const {},
  );
}

HostFormAutomationRule _rule({
  bool enabled = true,
  HostFormAutomationTrigger trigger =
      HostFormAutomationTrigger.applicationAccepted,
  List<HostFormAutomationAction> actions = const [],
}) => HostFormAutomationRule(
  ruleId: 'rule',
  organizerId: 'org',
  formId: null,
  name: 'Welcome',
  enabled: enabled,
  revision: 3,
  trigger: trigger,
  condition: null,
  actions: actions,
  updatedAt: DateTime(2026, 9, 3),
);
HostFormAutomationRun _run(String id) => HostFormAutomationRun(
  runId: id,
  ruleId: 'rule',
  ruleRevision: 3,
  responseId: null,
  eventKind: 'applicationAccepted',
  status: HostFormAutomationRunStatus.pending,
  attemptCount: 0,
  actionResults: const [],
  errorMessage: null,
  createdAt: DateTime(2026, 9, 3),
  completedAt: null,
);

Finder _namedInput(String title) => find.descendant(
  of: find.byWidgetPredicate((w) => w is CatchField && w.title == title),
  matching: find.byType(EditableText),
);
