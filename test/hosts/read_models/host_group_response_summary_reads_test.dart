import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_summary_reader.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

void main() {
  test(
    'Groups load compact metadata and fetch only the selected definition',
    () async {
      final db = FakeFirebaseFirestore();
      await db.collection('hostDirectorySummaries').doc('org').set({
        'organizerId': 'org',
        'groupSummaryVersion': 1,
      });
      final compact = {
        'organizerId': 'org',
        'audienceId': 'group',
        'name': 'Members',
        'status': 'active',
        'isStatic': true,
        'revision': 1,
        'lastPreviewMatchCount': 2500,
        'lastPreviewAtMillis': null,
        'updatedAtMillis': 1000,
      };
      await db.collection('hostGroupSummaries').doc('group').set({
        'organizerId': 'org',
        'version': 1,
        'status': 'active',
        'updatedAtMillis': 1000,
        'searchName': 'members',
        'lastPreviewAtMillis': 0,
        'isStatic': true,
        'row': compact,
      });
      final repo = HostSavedAudienceRepository(
        _UnusedFunctions(),
        summaries: HostSummaryReader(db, actorId: () => 'host'),
      );
      final page = await repo.listGroupSummaries('org');
      expect(page.audiences.single.name, 'Members');
      expect(page.audiences.single.isStatic, isTrue);
      // No detail document was needed to render the directory.
      final definition = {
        'join': 'all',
        'predicates': [
          {
            'kind': 'staticMembers',
            'contactIds': ['person'],
          },
        ],
      };
      await db.collection('hostGroupDetails').doc('group').set({
        'organizerId': 'org',
        'version': 1,
        'row': {
          'organizerId': 'org',
          'audienceId': 'group',
          'name': 'Members',
          'scope': 'organizerCrm',
          'status': 'active',
          'definition': definition,
          'definitionHash': 'a' * 64,
          'definitionVersion': 1,
          'revision': 1,
          'lastPreviewMatchCount': 2500,
          'lastPreviewAtMillis': null,
          'createdAtMillis': 1000,
          'updatedAtMillis': 1000,
        },
      });
      final opened = await repo.reloadSavedAudience(
        organizerId: 'org',
        audienceId: 'group',
        isCurrent: () => true,
      );
      expect(opened.definition.toJson()['predicates'], [
        {
          'kind': 'staticMembers',
          'contactIds': ['person'],
        },
      ]);
      await expectLater(
        repo.reloadSavedAudience(
          organizerId: 'org',
          audienceId: 'group',
          isCurrent: () => false,
        ),
        throwsStateError,
      );
    },
  );

  test(
    'Responses read unified metadata without answer or application joins',
    () async {
      final db = FakeFirebaseFirestore();
      await db.collection('hostDirectorySummaries').doc('org').set({
        'organizerId': 'org',
        'responseSummaryVersion': 1,
      });
      final response = {
        'responseId': 'response',
        'formId': 'form',
        'formTitle': 'Survey',
        'versionId': 'version',
        'version': 1,
        'status': 'submitted',
        'identityKind': 'anonymous',
        'identity': {
          'displayName': 'Asha',
          'email': null,
          'phoneE164': null,
          'origin': 'organizerAcquired',
        },
        'sourceLinkId': null,
        'sourceLabel': null,
        'submittedAtMillis': 1000,
        'withdrawnAtMillis': null,
        'highlights': [],
        'conversionKinds': [],
      };
      await db.collection('hostResponseSummaries').doc('inbox').set({
        'organizerId': 'org',
        'version': 1,
        'kind': 'response',
        'submittedAtMillis': 1000,
        'row': {
          'entryId': 'response:response',
          'submittedAtMillis': 1000,
          'response': response,
          'application': null,
        },
      });
      final reads = HostResponseSummaryReads(
        HostSummaryReader(db, actorId: () => 'host'),
      );
      final page = await reads.list(
        const HostFormResponseListRequest(
          organizerId: 'org',
          includeApplications: true,
        ),
      );
      expect(page!.entries!.single.entryId, 'response:response');
      expect(page.items.single.identity.displayName, 'Asha');
      expect(page.items.single.highlights, isEmpty);
      expect(
        await reads.list(
          const HostFormResponseListRequest(
            organizerId: 'org',
            answerFilters: {
              'secret': {'answer'},
            },
          ),
        ),
        isNull,
      );
    },
  );
}
