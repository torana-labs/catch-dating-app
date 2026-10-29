import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_profile_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_chat_profile_test.dart';

class ProfileRepository extends Fake implements EventChatRepository {
  Future<EventProfileSettings> Function(String) readSettings = (_) async =>
      settingsFixture();
  Future<void> Function() write = () async {};
  final writes =
      <
        ({
          String uid,
          int revision,
          EventProfileSelection? selection,
          String requestId,
        })
      >[];
  Future<EventParticipantProfile> Function(String) readProfile = (_) async =>
      miniProfile();
  Future<EventProfileSettings> Function(EventProfileSelection) readPreview =
      (_) async => settingsFixture();
  @override
  Future<EventProfileSettings> profileSettings(String uid, String eventId) =>
      readSettings(uid);
  @override
  Future<EventProfileSettings> previewProfile(
    String uid,
    EventProfileSettings reviewed,
    EventProfileSelection selection,
  ) => readPreview(selection);
  @override
  Future<void> shareProfile(
    String uid,
    EventProfileSettings reviewed,
    EventProfileSelection? selection,
    String requestId,
  ) {
    writes.add((
      uid: uid,
      revision: reviewed.revision,
      selection: selection,
      requestId: requestId,
    ));
    return write();
  }

  @override
  Future<EventParticipantProfile> participantProfile(
    String uid,
    String eventId,
    String participantUid,
  ) => readProfile(uid);
}

class CardsRepository extends Fake implements FormProfileRepository {
  final reads = <String?>[];
  Future<FormProfilePage> Function(String?) page = (_) async =>
      FormProfilePage(items: const [], nextCursor: null);
  Future<FormProfileReview> Function(String) card = (_) async => cardFixture();
  @override
  Future<FormProfilePage> list({String? cursor}) {
    reads.add(cursor);
    return page(cursor);
  }

  @override
  Future<FormProfileReview> review(String responseId) => card(responseId);
}

EventParticipantProfile miniProfile({String name = 'Sara'}) =>
    EventParticipantProfile(
      eventId: 'event',
      participantUid: 'sara',
      displayName: name,
      coreFields: [EventProfileField(id: 'age', value: 32)],
      cardFields: const [],
      photo: null,
    );
FormProfileSummary summary(String organizerId) => FormProfileSummary(
  responseId: organizerId,
  organizerId: organizerId,
  formTitle: 'Dinner',
  organizerName: organizerId,
  submittedAt: DateTime(2026),
  claimedAt: DateTime(2026),
  cardFieldCount: 1,
);

void main() {
  late ProfileRepository repo;
  late CardsRepository cards;
  late ProviderContainer container;
  final editor = eventProfileEditorControllerProvider('event');
  final viewer = eventParticipantProfileControllerProvider('event', 'sara');
  ProviderContainer create({Stream<String?>? accounts}) => ProviderContainer(
    overrides: [
      uidProvider.overrideWith((_) => accounts ?? Stream.value('person')),
      eventChatRepositoryProvider.overrideWithValue(repo),
      formProfileRepositoryProvider.overrideWithValue(cards),
    ],
  );
  setUp(() {
    repo = ProfileRepository();
    cards = CardsRepository();
    container = create();
  });
  tearDown(() => container.dispose());
  test(
    'card picker filters ownership and preserves empty-page continuation',
    () async {
      cards.page = (cursor) async => FormProfilePage(
        items: [summary(cursor == null ? 'other' : 'rsvp')],
        nextCursor: cursor == null ? 'more' : null,
      );
      container.listen(editor, (_, _) {});
      final first = await container.read(editor.future);
      expect(first.cards, isEmpty);
      expect(first.nextCursor, 'more');
      await container.read(editor.notifier).loadMore();
      expect(
        container.read(editor).requireValue.cards.single.organizerId,
        'rsvp',
      );
      expect(cards.reads, [null, null, 'more']);
    },
  );
  test(
    'revocation remains possible with cancelled admission and unavailable cards',
    () async {
      repo.readSettings = (_) async =>
          settingsFixture(canShare: false, selection: selectionFixture());
      container.listen(editor, (_, _) {});
      await container.read(editor.future);
      expect(cards.reads, isEmpty);
      await container
          .read(editor.notifier)
          .save(null, reviewedUid: 'person', reviewedRevision: 1);
      expect(repo.writes.single.selection, isNull);
    },
  );
  test('stale UI accounts and revisions cannot start a save', () async {
    container.listen(editor, (_, _) {});
    await container.read(editor.future);
    final c = container.read(editor.notifier);
    expect(await c.save(null, reviewedUid: 'old', reviewedRevision: 1), false);
    expect(
      await c.save(null, reviewedUid: 'person', reviewedRevision: 0),
      false,
    );
    expect(repo.writes, isEmpty);
  });
  test('preview checks the same reviewed revision before any write', () async {
    container.listen(editor, (_, _) {});
    await container.read(editor.future);
    final c = container.read(editor.notifier);
    final selected = selectionFixture();
    repo.readPreview = (_) async =>
        settingsFixture(preview: miniProfile(name: 'Mira'));
    expect(
      await c.preview(selected, reviewedUid: 'person', reviewedRevision: 0),
      isNull,
    );
    expect(
      await c.preview(selected, reviewedUid: 'person', reviewedRevision: 1),
      isA<EventParticipantProfile>(),
    );
    expect(repo.writes, isEmpty);
    repo.readPreview = (_) async =>
        settingsFixture(revision: 2, preview: miniProfile(name: 'Changed'));
    expect(
      await c.preview(selected, reviewedUid: 'person', reviewedRevision: 1),
      isNull,
    );
    expect(repo.writes, isEmpty);
  });
  test('pending save freezes duplicates, card changes and refreshes', () async {
    container.listen(editor, (_, _) {});
    await container.read(editor.future);
    final pending = Completer<void>();
    repo.write = () => pending.future;
    final c = container.read(editor.notifier);
    final saving = c.save(
      selectionFixture(),
      reviewedUid: 'person',
      reviewedRevision: 1,
    );
    await c.save(null, reviewedUid: 'person', reviewedRevision: 1);
    await c.chooseCard(null, reviewedUid: 'person');
    await c.refresh();
    expect(repo.writes, hasLength(1));
    expect(container.read(editor).requireValue.busy, true);
    pending.complete();
    expect(await saving, true);
    expect(container.read(editor).requireValue.busy, false);
  });
  test(
    'failed save retains the request ID for retrying the same reviewed payload',
    () async {
      container.listen(editor, (_, _) {});
      await container.read(editor.future);
      final c = container.read(editor.notifier);
      repo.write = () async => throw StateError('offline');
      expect(
        await c.save(null, reviewedUid: 'person', reviewedRevision: 1),
        false,
      );
      expect(container.read(editor).hasError, true);
      await c.refresh();
      repo.write = () async {};
      await c.save(null, reviewedUid: 'person', reviewedRevision: 1);
      expect(repo.writes[0].requestId, repo.writes[1].requestId);
    },
  );
  test(
    'failed participant refresh drops previously visible private details',
    () async {
      container.listen(viewer, (_, _) {});
      await container.read(viewer.future);
      repo.readProfile = (_) async => throw StateError('revoked');
      await container.read(viewer.notifier).refresh();
      expect(container.read(viewer).hasError, true);
      expect(container.read(viewer).asData, isNull);
    },
  );
  test(
    'backgrounding clears profile and requires a new foreground read',
    () async {
      container.listen(viewer, (_, _) {});
      await container.read(viewer.future);
      final c = container.read(viewer.notifier);
      c.setForeground(false);
      expect(container.read(viewer).asData, isNull);
      repo.readProfile = (_) async => miniProfile(name: 'Fresh');
      c.setForeground(true);
      await flushTestEventQueue();
      expect(container.read(viewer).requireValue.displayName, 'Fresh');
    },
  );
  test('late participant results cannot cross a sign-in change', () async {
    container.dispose();
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    container = create(accounts: accounts.stream);
    container.listen(viewer, (_, _) {});
    accounts.add('person');
    await flushTestEventQueue();
    await container.read(viewer.future);
    final pending = Completer<EventParticipantProfile>();
    repo.readProfile = (_) => pending.future;
    final old = container.read(viewer.notifier).refresh();
    repo.readProfile = (_) async => miniProfile(name: 'Current');
    accounts.add('other');
    await flushTestEventQueue();
    await container.read(viewer.future);
    pending.complete(miniProfile(name: 'Old private'));
    await old;
    expect(container.read(viewer).requireValue.displayName, 'Current');
  });
  test(
    'an old card review cannot appear in the next signed-in account',
    () async {
      container.dispose();
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      container = create(accounts: accounts.stream);
      container.listen(editor, (_, _) {});
      accounts.add('person');
      await flushTestEventQueue();
      await container.read(editor.future);
      final pending = Completer<FormProfileReview>();
      cards.card = (_) => pending.future;
      repo.readSettings = (_) async =>
          settingsFixture(selection: selectionFixture());
      final old = container.read(editor.notifier).refresh();
      await flushTestEventQueue();
      repo.readSettings = (_) async => settingsFixture(canShare: false);
      accounts.add('other');
      await flushTestEventQueue();
      await container.read(editor.future);
      pending.complete(cardFixture());
      await old;
      final current = container.read(editor).requireValue;
      expect(current.uid, 'other');
      expect(current.card, isNull);
      expect(current.cards, isEmpty);
    },
  );
  test(
    'pending save acknowledgement cannot change the next account editor',
    () async {
      container.dispose();
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      container = create(accounts: accounts.stream);
      container.listen(editor, (_, _) {});
      accounts.add('person');
      await flushTestEventQueue();
      await container.read(editor.future);
      final pending = Completer<void>();
      repo.write = () => pending.future;
      final saving = container
          .read(editor.notifier)
          .save(null, reviewedUid: 'person', reviewedRevision: 1);
      repo.readSettings = (_) async => settingsFixture(revision: 8);
      accounts.add('other');
      await flushTestEventQueue();
      await container.read(editor.future);
      pending.complete();
      expect(await saving, false);
      expect(repo.writes.single.uid, 'person');
      expect(container.read(editor).requireValue.uid, 'other');
      expect(container.read(editor).requireValue.settings.revision, 8);
    },
  );
  test(
    'an initial profile response arriving in the background stays hidden',
    () async {
      final pending = Completer<EventParticipantProfile>();
      repo.readProfile = (_) => pending.future;
      container.listen(viewer, (_, _) {});
      await flushTestEventQueue();
      final first = container.read(viewer.future);
      final assertion = expectLater(first, throwsStateError);
      container.read(viewer.notifier).setForeground(false);
      pending.complete(miniProfile());
      await assertion;
      expect(container.read(viewer).asData, isNull);
    },
  );
}
