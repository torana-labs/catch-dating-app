import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_program_audience_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository extends Fake implements ProgramSetupRepository {
  final detail = Completer<OrganizerProgramDetail>();
  final requestedCursors = <String?>[];
  final guestPages = <Completer<ProgramGuestListPage>>[];

  @override
  Future<OrganizerProgramDetail> getProgram(String programId) => detail.future;

  @override
  Future<ProgramGuestListPage> listGuests(
    String programId, {
    int? limit,
    String? cursor,
  }) {
    requestedCursors.add(cursor);
    final page = Completer<ProgramGuestListPage>();
    guestPages.add(page);
    return page.future;
  }
}

OrganizerProgramDetail _detail({String organizerId = 'org'}) =>
    OrganizerProgramDetail(
      program: OrganizerProgramSettings(
        programId: 'older-program',
        organizerId: organizerId,
        kind: ProgramKind.wedding,
        title: 'Older program',
        timezone: 'Asia/Kolkata',
        status: ProgramStatus.active,
        startsAt: DateTime(2026),
        endsAt: DateTime(2026, 2),
        capabilities: const [],
        revision: 1,
      ),
      functions: const [],
      pickupPoints: const [],
      hotels: const [],
      counts: const {},
    );

ProgramGuestRow _guest(int index, {String? contactId}) => ProgramGuestRow(
  guestId: 'guest-$index',
  displayName: 'Guest $index',
  contactId: contactId,
  groupIds: const [],
  invitationStatus: 'draft',
  rsvpStatus: 'unknown',
  revision: 1,
);

ProgramGuestListPage _page(
  List<ProgramGuestRow> guests, {
  String? nextCursor,
}) => ProgramGuestListPage(
  programId: 'older-program',
  guests: guests,
  households: const [],
  functionGuests: const [],
  groups: const [],
  nextCursor: nextCursor,
);

void main() {
  test(
    'direct ownership check precedes guests, including older programs',
    () async {
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          programSetupRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      final provider = hostInboxProgramAudiencePagesProvider(
        'org',
        'older-program',
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final result = container.read(provider.future);
      expect(repository.requestedCursors, isEmpty);
      repository.detail.complete(_detail());
      await pumpEventQueue();
      expect(repository.requestedCursors, [null]);
      repository.guestPages.single.complete(_page([_guest(1)]));
      expect((await result).program.title, 'Older program');
    },
  );

  test('foreign program never requests a guest page', () async {
    final repository = _Repository()
      ..detail.complete(_detail(organizerId: 'foreign'));
    final container = ProviderContainer(
      overrides: [programSetupRepositoryProvider.overrideWithValue(repository)],
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
      final repository = _Repository()..detail.complete(_detail());
      final container = ProviderContainer(
        overrides: [
          programSetupRepositoryProvider.overrideWithValue(repository),
        ],
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
      final repository = _Repository()..detail.complete(_detail());
      final container = ProviderContainer(
        overrides: [
          programSetupRepositoryProvider.overrideWithValue(repository),
        ],
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
