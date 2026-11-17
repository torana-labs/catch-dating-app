import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

Future<void> _form(FakeFirebaseFirestore db, String id, int updatedAt) =>
    db.collection('hostFormSummaries').doc(id).set({
      'organizerId': 'org',
      'formId': id,
      'version': 1,
      'status': 'published',
      'purpose': 'survey',
      'updatedAtMillis': updatedAt,
      'row': {
        'organizerId': 'org',
        'formId': id,
        'title': id,
        'description': null,
        'purpose': 'survey',
        'status': 'published',
        'templateId': 'blank',
        'publicFormId': 'public-form-123456789012',
        'defaultTargetKind': 'organizer',
        'defaultTargetId': null,
        'activeVersionId': 'version',
        'draftRevision': 1,
        'publishedVersion': 1,
        'submittedResponseCount': 0,
        'consequences': {
          'coverage': 'unavailable',
          'identityPolicy': null,
          'enabledAutomationActionKinds': <String>[],
        },
        'updatedAtMillis': updatedAt,
        'publishedAtMillis': updatedAt,
        'lastResponseAtMillis': null,
      },
    });

void main() {
  late FakeFirebaseFirestore db;
  late ProviderContainer container;
  const request = HostFormListRequest(organizerId: 'org', limit: 2);
  final provider = hostFormsDirectoryControllerProvider(request);

  List<String> ids() => container
      .read(provider)
      .requireValue
      .forms
      .map((form) => form.formId)
      .toList();

  setUp(() async {
    db = FakeFirebaseFirestore();
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'formSummaryVersion': 1,
    });
    for (final (index, id) in ['d', 'c', 'b', 'a'].indexed) {
      await _form(db, id, index);
    }
    container = ProviderContainer.test(
      overrides: [
        hostFormsRepositoryProvider.overrideWithValue(
          HostFormsRepository(
            _UnusedFunctions(),
            summaries: HostFormSummaryReads(
              HostSummaryReader(db, actorId: () => 'host'),
            ),
          ),
        ),
      ],
    );
    container.listen(provider, (_, _) {});
  });

  test('the directory lists a page, then listens to one more', () async {
    await container.read(provider.future);
    await flushTestEventQueue();
    expect(ids(), ['a', 'b']);
    expect(container.read(provider).requireValue.canLoadMore, isTrue);

    await container.read(provider.notifier).loadMore();
    expect(ids(), ['a', 'b']);
    await flushTestEventQueue();
    expect(ids(), ['a', 'b', 'c', 'd']);
    expect(container.read(provider).requireValue.canLoadMore, isFalse);
  });

  test('a form saved elsewhere moves to the top at once', () async {
    await container.read(provider.future);
    await flushTestEventQueue();
    await _form(db, 'd', 10);
    await flushTestEventQueue();
    expect(ids(), ['d', 'a']);
  });
}
