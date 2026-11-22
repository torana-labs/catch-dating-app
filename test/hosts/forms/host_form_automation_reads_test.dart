import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_automation_reads.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _rule(String id, String? formId, {String org = 'org'}) => {
  'organizerId': org,
  'ruleId': id,
  'formId': formId,
  'version': 1,
  'row': {
    'ruleId': id,
    'organizerId': org,
    'formId': formId,
    'name': 'Rule $id',
    'enabled': true,
    'revision': 1,
    'trigger': 'responseSubmitted',
    'triggerEventId': null,
    'delayMinutes': 0,
    'condition': null,
    'actions': [
      {
        'actionId': 'a1',
        'kind': 'signedWebhook',
        'tagId': null,
        'eventId': null,
        'webhookUrl': 'https://hooks.example.com/x',
        'webhookSecretConfigured': true,
        'channel': null,
        'campaignId': null,
        'campaignRevision': null,
      },
    ],
    'updatedAtMillis': 10,
  },
};

Map<String, Object?> _run(String id, String? formId, int at) => {
  'organizerId': 'org',
  'runId': id,
  'ruleId': 'r1',
  'formId': formId,
  'createdAtMillis': at,
  'ruleName': null,
  'version': 1,
  'row': {
    'runId': id,
    'ruleId': 'r1',
    'ruleRevision': 1,
    'responseId': 'response-1',
    'sourceId': 'response-1',
    'dueAtMillis': null,
    'eventKind': 'submitted',
    'status': 'failed',
    'attemptCount': 2,
    'actionResults': [
      {
        'actionId': 'a1',
        'kind': 'signedWebhook',
        'status': 'failed',
        'resultId': null,
        'errorCode': 'timeout',
      },
    ],
    'errorMessage': 'The webhook timed out.',
    'createdAtMillis': at,
    'completedAtMillis': at + 1,
  },
};

void main() {
  test('one form reads its own rules and runs; all forms read every one, '
      'and no other organizer', () async {
    final db = FakeFirebaseFirestore();
    final rules = db.collection(HostFormAutomationReads.ruleViews);
    await rules.doc('r1').set(_rule('r1', 'f1'));
    await rules.doc('r2').set(_rule('r2', null));
    await rules.doc('r3').set(_rule('r3', 'f1', org: 'other'));
    final runs = db.collection(HostFormAutomationReads.runViews);
    await runs.doc('run-a').set(_run('run-a', 'f1', 5));
    await runs.doc('run-b').set(_run('run-b', 'f2', 9));
    final reads = HostFormAutomationReads(
      ScopedReadModelReader(db, family: hostReadModels, actorId: () => 'host'),
    );

    final all = await reads.watchRules('org', null).first;
    expect(all.map((rule) => rule.ruleId), ['r1', 'r2']);
    expect(all.first.actions.single.webhookSecretConfigured, isTrue);
    final formRules = await reads.watchRules('org', 'f1').first;
    expect(formRules.map((rule) => rule.ruleId), ['r1']);

    final allRuns = await reads.watchRunPages('org', null).pages.first;
    expect(allRuns.items.map((run) => run.runId), ['run-b', 'run-a']);
    final formRuns = await reads.watchRunPages('org', 'f1').pages.first;
    expect(formRuns.items.single.runId, 'run-a');
    expect(formRuns.items.single.ruleName, isNull);
    expect(formRuns.items.single.errorMessage, 'The webhook timed out.');
  });
}
