import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

/// Fails any callable, so a test proves the reads never reach Functions.
class _NoFunctions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _pair(
  String candidateId, {
  required int updatedAtMillis,
  String decisionState = 'none',
  String? reviewedByUid,
  String organizerId = 'org',
}) => {
  'organizerId': organizerId,
  'candidateId': candidateId,
  'contactIds': ['a-$candidateId', 'b-$candidateId'],
  'contacts': [
    for (final id in ['a-$candidateId', 'b-$candidateId'])
      {
        'contactId': id,
        'displayName': 'Guest $id',
        'phoneE164': null,
        'email': null,
        'linkedAccount': false,
        'primarySource': 'hostImport',
        'revision': 1,
      },
  ],
  'matchKinds': ['sameEmail'],
  'confidence': 'proposed',
  'sourceKinds': ['hostImport'],
  'sharedEventIds': <String>[],
  'sharedEventCount': 0,
  'updatedAtMillis': updatedAtMillis,
  'decisionState': decisionState,
  'decisionRevision': decisionState == 'none' ? null : 7,
  'reviewedByUid': reviewedByUid,
  'version': 1,
};

void main() {
  late FakeFirebaseFirestore db;
  ScopedReadModelReader reader() =>
      ScopedReadModelReader(db, family: hostReadModels, actorId: () => 'me');

  setUp(() => db = FakeFirebaseFirestore());

  group('duplicate review', () {
    HostContactsRepository repository() => HostContactsRepository(
      _NoFunctions(),
      summaries: HostContactSummaryReads(reader()),
      mergeCandidates: reader(),
    );

    test('pages the views, newest evidence first, canReopen for the reader '
        'who marked a pair', () async {
      final views = db.collection('hostContactMergeCandidateViews');
      await views.doc('p1').set(_pair('p1', updatedAtMillis: 1));
      await views
          .doc('p2')
          .set(
            _pair(
              'p2',
              updatedAtMillis: 3,
              decisionState: 'differentPeople',
              reviewedByUid: 'me',
            ),
          );
      await views
          .doc('p3')
          .set(
            _pair(
              'p3',
              updatedAtMillis: 2,
              decisionState: 'differentPeople',
              reviewedByUid: 'teammate',
            ),
          );
      await views
          .doc('foreign')
          .set(_pair('foreign', updatedAtMillis: 9, organizerId: 'other'));

      final pages = await repository()
          .watchMergeCandidates('org', readerUid: 'me', pageSize: 10)
          .pages
          .first;

      expect(pages.items.map((pair) => pair.candidateId), ['p2', 'p3', 'p1']);
      expect(pages.items.map((pair) => pair.canReopen), [true, false, false]);
      expect(
        pages.items.first.decisionState,
        HostContactMergeDecisionState.differentPeople,
      );
      expect(pages.hasMore, isFalse);
    });
  });

  group('audience sources', () {
    HostSavedAudienceRepository repository() =>
        HostSavedAudienceRepository(_NoFunctions(), summaries: reader());

    test(
      'reads the view; an organizer without one has nothing to name',
      () async {
        expect(
          (await repository().watchFilterOptions('org').first).forms,
          isEmpty,
        );
        await db.collection('hostAudienceSourceViews').doc('org').set({
          'organizerId': 'org',
          'forms': [
            {'formId': 'f1', 'title': 'Supper club'},
          ],
          'questions': [
            {
              'formId': 'f1',
              'versionId': 'f1_v1',
              'activeVersion': true,
              'version': 1,
              'formTitle': 'Supper club',
              'questionId': 'q1',
              'label': 'Member?',
              'kind': 'boolean',
              'options': [
                {'label': 'Yes', 'value': true},
                {'label': 'No', 'value': false},
              ],
            },
          ],
          'events': [
            {'eventId': 'e1', 'title': 'Lantern walk'},
          ],
          'tags': [
            {'tagId': 'tag-1', 'label': 'Regular'},
          ],
          'unavailableReason': null,
          'version': 1,
        });

        final options = await repository().watchFilterOptions('org').first;

        expect(options.forms.single.title, 'Supper club');
        expect(options.questions.single.options.first.value, true);
        expect(options.events.single.id, 'e1');
        expect(options.tags.single.label, 'Regular');
      },
    );

    test('sources over the bounds fail as the callable did', () async {
      await db.collection('hostAudienceSourceViews').doc('org').set({
        'organizerId': 'org',
        'forms': <Object>[],
        'questions': <Object>[],
        'events': <Object>[],
        'tags': <Object>[],
        'unavailableReason':
            'Audience authoring exceeds 100 filterable versioned questions.',
        'version': 1,
      });

      await expectLater(
        repository().watchFilterOptions('org').first,
        throwsA(
          isA<BackendOperationException>().having(
            (error) => error.code,
            'code',
            'resource-exhausted',
          ),
        ),
      );
    });
  });
}
