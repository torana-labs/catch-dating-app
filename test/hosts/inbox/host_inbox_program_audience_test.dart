import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_guest_directory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_program_audience_controller.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

typedef _GuestPage = CursorPage<ProgramGuestRow, String>;

class _Repository extends Fake implements ProgramGuestDirectoryRepository {
  final requestedCursors = <String?>[];
  final guestPages = <Completer<_GuestPage>>[];

  @override
  Future<_GuestPage> guestPage(
    String programId, {
    int limit = ProgramGuestDirectoryRepository.pageSize,
    String? cursor,
  }) {
    requestedCursors.add(cursor);
    final page = Completer<_GuestPage>();
    guestPages.add(page);
    return page.future;
  }
}

Map<Object?, Object?> _view({String organizerId = 'org'}) => {
  'programId': 'older-program',
  'organizerId': organizerId,
  'kind': 'wedding',
  'title': 'Older program',
  'status': 'active',
  'revision': 1,
  'functions': const <Object?>[],
};

/// The programme's view listener, overridden with [views].
List<Override> _overrides(
  _Repository repository,
  Stream<Map<Object?, Object?>> views,
) => [
  programGuestDirectoryRepositoryProvider.overrideWithValue(repository),
  organizerProgramViewStreamProvider(
    'older-program',
  ).overrideWith((ref) => views),
];

ProgramGuestRow _guest(int index, {String? contactId}) => ProgramGuestRow(
  guestId: 'guest-$index',
  displayName: 'Guest $index',
  contactId: contactId,
  groupIds: const [],
  invitationStatus: 'draft',
  rsvpStatus: 'unknown',
  revision: 1,
);

_GuestPage _page(List<ProgramGuestRow> guests, {String? nextCursor}) =>
    CursorPage(
      items: guests,
      hasMore: nextCursor != null,
      nextCursor: nextCursor,
    );

void main() {
  test(
    'direct ownership check precedes guests, including older programs',
    () async {
      final repository = _Repository();
      final views = StreamController<Map<Object?, Object?>>();
      addTearDown(views.close);
      final container = ProviderContainer(
        overrides: _overrides(repository, views.stream),
      );
      addTearDown(container.dispose);
      final provider = hostInboxProgramAudiencePagesProvider(
        'org',
        'older-program',
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final result = container.read(provider.future);
      await pumpEventQueue();
      expect(repository.requestedCursors, isEmpty);
      views.add(_view());
      await pumpEventQueue();
      expect(repository.requestedCursors, [null]);
      repository.guestPages.single.complete(_page([_guest(1)]));
      expect((await result).program.title, 'Older program');
    },
  );

  test('foreign program never requests a guest page', () async {
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: _overrides(
        repository,
        Stream.value(_view(organizerId: 'foreign')),
      ),
    );
    addTearDown(container.dispose);
    final provider = hostInboxProgramAudiencePagesProvider(
      'org',
      'older-program',
    );
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await expectLater(container.read(provider.future), throwsStateError);
    expect(repository.requestedCursors, isEmpty);
  });

  test(
    'loads past 200 guests and keeps unlinked guests out of contacts',
    () async {
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: _overrides(repository, Stream.value(_view())),
      );
      addTearDown(container.dispose);
      final provider = hostInboxProgramAudiencePagesProvider(
        'org',
        'older-program',
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final initial = container.read(provider.future);
      await pumpEventQueue();
      repository.guestPages.single.complete(
        _page([
          for (var i = 0; i < 200; i++)
            _guest(i, contactId: i == 0 ? null : 'contact-$i'),
        ], nextCursor: 'guest-199'),
      );
      expect((await initial).guestCount, 200);
      final more = container.read(provider.notifier).loadMore();
      expect(repository.requestedCursors, [null, 'guest-199']);
      repository.guestPages.last.complete(
        _page([_guest(200, contactId: 'contact-200')]),
      );
      await more;
      final complete = await container.read(provider.future);
      expect(complete.guestCount, 201);
      expect(complete.unlinkedGuestCount, 1);
      expect(complete.contactIds, contains('contact-200'));
      expect(complete.contactIds, isNot(contains('guest-0')));
      expect(complete.nextCursor, isNull);
    },
  );

  test(
    'page failure retains prior guests and retries the same cursor',
    () async {
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: _overrides(repository, Stream.value(_view())),
      );
      addTearDown(container.dispose);
      final provider = hostInboxProgramAudiencePagesProvider(
        'org',
        'older-program',
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final initial = container.read(provider.future);
      await pumpEventQueue();
      repository.guestPages.single.complete(
        _page([_guest(1, contactId: 'contact-1')], nextCursor: 'guest-1'),
      );
      await initial;
      final failed = container.read(provider.notifier).loadMore();
      repository.guestPages.last.completeError(StateError('offline'));
      await failed;
      final retained = await container.read(provider.future);
      expect(retained.guestCount, 1);
      expect(retained.error, isNotNull);
      expect(retained.nextCursor, 'guest-1');
      final retry = container.read(provider.notifier).loadMore();
      repository.guestPages.last.complete(
        _page([_guest(2, contactId: 'contact-2')]),
      );
      await retry;
      expect(repository.requestedCursors, [null, 'guest-1', 'guest-1']);
      expect((await container.read(provider.future)).contactIds, {
        'contact-1',
        'contact-2',
      });
    },
  );
}
