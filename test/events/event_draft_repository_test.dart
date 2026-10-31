import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('EventDraftRepository', () {
    late EventDraftRepository repo;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      repo = EventDraftRepository(ErrorLogger());
    });

    EventDraft buildDraft({
      String id = 'draft-1',
      String clubId = 'club-1',
      DateTime? savedAt,
      String? distance,
      String? meetingPoint,
    }) {
      return EventDraft(
        id: id,
        clubId: clubId,
        savedAt: savedAt ?? DateTime.now(),
        distance: distance,
        meetingPoint: meetingPoint,
      );
    }

    group('loadDrafts', () {
      test('returns empty list when no drafts exist', () async {
        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts, isEmpty);
      });

      test('stale drafts are filtered out and removed', () async {
        final oldDraft = EventDraft(
          id: 'old-1',
          clubId: 'club-1',
          savedAt: DateTime.now().subtract(const Duration(days: 10)),
          distance: '5',
        );
        await repo.saveDraft(userId: 'user-1', draft: oldDraft);

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts, isEmpty);
      });

      test('corrupted JSON returns empty list', () async {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('event_drafts_club-1_user-1', '{invalid');

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts, isEmpty);
      });
    });

    group('saveDraft / loadDrafts', () {
      test('save then load returns the same draft', () async {
        final draft = buildDraft(distance: '5');
        await repo.saveDraft(userId: 'user-1', draft: draft);

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 1);
        expect(drafts.first.id, 'draft-1');
        expect(drafts.first.distance, '5');
      });

      test('save with same ID updates instead of duplicating', () async {
        final draft1 = buildDraft(distance: '5');
        await repo.saveDraft(userId: 'user-1', draft: draft1);

        final draft2 = buildDraft(distance: '10', meetingPoint: 'Park');
        await repo.saveDraft(userId: 'user-1', draft: draft2);

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 1);
        expect(drafts.first.distance, '10');
        expect(drafts.first.meetingPoint, 'Park');
      });

      test('sorted by savedAt descending (newest first)', () async {
        final now = DateTime.now();
        final old = buildDraft(
          id: 'old',
          savedAt: now.subtract(const Duration(days: 2)),
          distance: '5',
        );
        final newer = buildDraft(
          id: 'new',
          savedAt: now.subtract(const Duration(days: 1)),
          distance: '10',
        );
        await repo.saveDraft(userId: 'user-1', draft: old);
        await repo.saveDraft(userId: 'user-1', draft: newer);

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 2);
        expect(drafts[0].id, 'new');
        expect(drafts[1].id, 'old');
      });

      test('evicts oldest when exceeding max 5 drafts', () async {
        final now = DateTime.now();
        for (var i = 0; i < 7; i++) {
          await repo.saveDraft(
            userId: 'user-1',
            draft: buildDraft(
              id: 'draft-$i',
              savedAt: now.subtract(Duration(days: 6 - i)),
              distance: '$i',
            ),
          );
        }

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 5);
        // Oldest (May 1) should be evicted
        final ids = drafts.map((d) => d.id).toList();
        expect(ids, contains('draft-6'));
        expect(ids, contains('draft-5'));
        expect(ids, isNot(contains('draft-0')));
      });
    });

    group('deleteDraft', () {
      test('removes the specified draft, leaves others', () async {
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-1'),
        );
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-2'),
        );

        await repo.deleteDraft(
          clubId: 'club-1',
          userId: 'user-1',
          draftId: 'd-1',
        );

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 1);
        expect(drafts.first.id, 'd-2');
      });

      test('does nothing when draft not found', () async {
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-1'),
        );
        await repo.deleteDraft(
          clubId: 'club-1',
          userId: 'user-1',
          draftId: 'nonexistent',
        );

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts.length, 1);
      });
    });

    group('deleteAllDrafts', () {
      test('clears all drafts for the club/user', () async {
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-1'),
        );
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-2'),
        );

        await repo.deleteAllDrafts(clubId: 'club-1', userId: 'user-1');

        final drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        expect(drafts, isEmpty);
      });
    });

    group('isolation', () {
      test('different organizerIds produce isolated lists', () async {
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-1'),
        );
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-2', clubId: 'club-2'),
        );

        final organizer1Drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        final organizer2Drafts = await repo.loadDrafts(
          clubId: 'club-2',
          userId: 'user-1',
        );
        expect(organizer1Drafts.length, 1);
        expect(organizer2Drafts.length, 1);
        expect(organizer1Drafts.first.id, 'd-1');
        expect(organizer2Drafts.first.id, 'd-2');
      });

      test('different userIds produce isolated lists', () async {
        await repo.saveDraft(
          userId: 'user-1',
          draft: buildDraft(id: 'd-1'),
        );
        await repo.saveDraft(
          userId: 'user-2',
          draft: buildDraft(id: 'd-2'),
        );

        final user1Drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-1',
        );
        final user2Drafts = await repo.loadDrafts(
          clubId: 'club-1',
          userId: 'user-2',
        );
        expect(user1Drafts.length, 1);
        expect(user2Drafts.length, 1);
        expect(user1Drafts.first.id, 'd-1');
        expect(user2Drafts.first.id, 'd-2');
      });
    });
  });
}
