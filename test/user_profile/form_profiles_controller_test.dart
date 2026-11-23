import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository extends Fake implements FormProfileRepository {
  final calls = <String?>[];
  final pending = <Completer<FormProfilePage>>[];
  @override
  Future<FormProfilePage> list(String uid, {String? cursor}) {
    calls.add(cursor);
    final completer = Completer<FormProfilePage>();
    pending.add(completer);
    return completer.future;
  }
}

FormProfilePage _page(String id, {String? cursor}) => FormProfilePage(
  items: [
    FormProfileSummary(
      organizerId: 'org',
      responseId: id,
      formTitle: 'Form',
      organizerName: 'Organizer',
      submittedAt: DateTime(2026),
      claimedAt: null,
      cardFieldCount: 0,
    ),
  ],
  nextCursor: cursor,
);

void main() {
  test('rows are named from the organizer lookup', () async {
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('one')),
        formProfileRepositoryProvider.overrideWithValue(repository),
        organizerNameLookupProvider.overrideWith(
          (ref, query) async => {
            for (final id in query.organizerIds) id: 'Name of $id',
          },
        ),
      ],
    );
    addTearDown(container.dispose);
    container.listen(formProfilesControllerProvider, (_, _) {});
    await flushTestEventQueue();
    repository.pending.last.complete(
      FormProfilePage(
        items: [
          FormProfileSummary(
            organizerId: 'org',
            responseId: 'one',
            formTitle: 'Form',
            organizerName: null,
            submittedAt: DateTime(2026),
            claimedAt: null,
            cardFieldCount: 0,
          ),
        ],
        nextCursor: null,
      ),
    );
    final state = await container.read(formProfilesControllerProvider.future);
    expect(state.page.items.single.organizerName, 'Name of org');
  });

  test(
    'pagination rejects stale account results and preserves retry cursor',
    () async {
      final accounts = StreamController<String?>();
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          formProfileRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await accounts.close();
      });
      container.listen(formProfilesControllerProvider, (_, _) {});
      accounts.add('one');
      await flushTestEventQueue();
      repository.pending.last.complete(_page('one', cursor: 'one'));
      await container.read(formProfilesControllerProvider.future);
      final notifier = container.read(formProfilesControllerProvider.notifier);
      final failed = notifier.loadMore();
      await notifier.loadMore();
      expect(repository.calls, [null, 'one']);
      repository.pending.last.completeError(StateError('offline'));
      await failed;
      expect(
        container.read(formProfilesControllerProvider).requireValue.error,
        isNotNull,
      );
      expect(
        container
            .read(formProfilesControllerProvider)
            .requireValue
            .page
            .nextCursor,
        'one',
      );
      final loadingOldAccount = notifier.loadMore();
      final oldRequest = repository.pending.last;
      accounts.add('two');
      await flushTestEventQueue();
      repository.pending.last.complete(_page('two'));
      await container.read(formProfilesControllerProvider.future);
      oldRequest.complete(_page('private-one'));
      await loadingOldAccount;
      expect(
        container
            .read(formProfilesControllerProvider)
            .requireValue
            .page
            .items
            .single
            .responseId,
        'two',
      );
      expect(
        container
            .read(formProfilesControllerProvider)
            .requireValue
            .page
            .nextCursor,
        isNull,
      );
    },
  );
}
