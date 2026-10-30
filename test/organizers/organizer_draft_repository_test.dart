import 'package:catch_dating_app/contexts/organizers/data/organizer_draft_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('OrganizerDraftRepository', () {
    late OrganizerDraftRepository repository;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      repository = OrganizerDraftRepository(ErrorLogger());
    });

    test('returns null when no draft exists', () async {
      expect(await repository.loadDraft(userId: 'host-1'), isNull);
    });

    test('save then load returns the current user draft', () async {
      final draft = OrganizerDraft(
        savedAt: DateTime.now(),
        name: 'Sunset Striders',
        area: 'Bandra',
        description: 'Easy social club.',
        location: 'in-mh-mumbai',
        instagramHandle: '@sunsetstriders',
        organizerType: OrganizerType.community,
      );

      await repository.saveDraft(userId: 'host-1', draft: draft);

      final loaded = await repository.loadDraft(userId: 'host-1');
      expect(loaded, isNotNull);
      expect(loaded!.name, 'Sunset Striders');
      expect(loaded.location, 'in-mh-mumbai');
      expect(loaded.instagramHandle, '@sunsetstriders');
      expect(loaded.organizerType, OrganizerType.community);
    });

    test('different users have isolated drafts', () async {
      await repository.saveDraft(
        userId: 'host-1',
        draft: OrganizerDraft(savedAt: DateTime.now(), name: 'One'),
      );
      await repository.saveDraft(
        userId: 'host-2',
        draft: OrganizerDraft(savedAt: DateTime.now(), name: 'Two'),
      );

      expect((await repository.loadDraft(userId: 'host-1'))!.name, 'One');
      expect((await repository.loadDraft(userId: 'host-2'))!.name, 'Two');
    });

    test('stale drafts are discarded', () async {
      await repository.saveDraft(
        userId: 'host-1',
        draft: OrganizerDraft(
          savedAt: DateTime.now().subtract(const Duration(days: 10)),
          name: 'Old club',
        ),
      );

      expect(await repository.loadDraft(userId: 'host-1'), isNull);
    });

    test('deleteDraft clears the persisted draft', () async {
      await repository.saveDraft(
        userId: 'host-1',
        draft: OrganizerDraft(savedAt: DateTime.now(), name: 'Delete me'),
      );

      await repository.deleteDraft(userId: 'host-1');

      expect(await repository.loadDraft(userId: 'host-1'), isNull);
    });
  });
}
