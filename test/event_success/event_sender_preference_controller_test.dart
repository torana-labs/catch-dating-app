import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/event_success/presentation/event_sender_preference_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_sender_preference_fixtures.dart';

void main() {
  for (final channel in EventSenderChannel.values) {
    group(channel.name, () {
      final scope = senderScope(channel);
      final provider = eventSenderPreferenceControllerProvider(scope);
      late SenderTestRepository repository;
      late StreamController<String?> auth;
      late ProviderContainer container;
      late ProviderSubscription<EventSenderPreferenceState> subscription;
      EventSenderPreferenceController controller() =>
          container.read(provider.notifier);
      EventSenderPreferenceState state() => container.read(provider);
      EventSenderPreferenceReady ready() =>
          state() as EventSenderPreferenceReady;
      Future<void> signIn(String? uid) async {
        final count = repository.pages.length + 1;
        auth.add(uid);
        await container.pump();
        if (uid != null) await repository.waitForPages(count);
        await container.pump();
      }

      Future<void> load({Map<String, Object?> patch = const {}}) async {
        await signIn('guest-1');
        repository.pages.last.result.complete(
          senderPage(scope, previous: ['old-sender']),
        );
        await repository.waitForReads(1);
        repository.reads.last.result.complete(senderView(scope, patch: patch));
        await container.pump();
      }

      setUp(() {
        repository = SenderTestRepository();
        auth = StreamController<String?>.broadcast();
        container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => auth.stream),
            eventSenderPreferenceRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
        );
        subscription = container.listen(provider, (_, _) {});
      });
      tearDown(() async {
        container.dispose();
        await auth.close();
      });

      test(
        'discovery is read-only; configured sender is the only enrollment choice',
        () async {
          expect(state(), isA<EventSenderPreferenceLoading>());
          expect(repository.pages, isEmpty);
          await load();
          expect(ready().canEnable, isTrue);
          expect(repository.writes, isEmpty);
          final oldReview = ready().review!;
          final navigation = ready().navigation;
          final choose = controller().choose(navigation, 'old-sender');
          expect(state(), isA<EventSenderPreferenceLoading>());
          await expectLater(
            controller().enable(oldReview),
            throwsA(isA<ValidationException>()),
          );
          expect(repository.reads.last.senderId, 'old-sender');
          repository.reads.last.result.complete(
            senderView(
              scope,
              senderId: 'old-sender',
              patch: {
                'revision': 1,
                'preference': 'enabled',
                'expiresAt': 3000,
                'availability': 'senderUnavailable',
                'canEnable': false,
              },
            ),
          );
          await choose;
          expect(ready().navigation.isEarlier, isTrue);
          expect(ready().canEnable, isFalse);
          expect(ready().canDisable, isTrue);
          await expectLater(
            controller().choose(navigation, 'sender-1'),
            throwsA(isA<ValidationException>()),
          );
          final stop = controller().disable(ready().review!);
          final change = repository.writes.single.change;
          expect(change.snapshot.senderId, 'old-sender');
          repository.writes.single.result.complete(senderApplied(change));
          await stop;
          expect(ready().canEnable, isFalse);
          await expectLater(
            controller().enable(ready().review!),
            throwsA(isA<ValidationException>()),
          );
          final back = controller().choose(ready().navigation, 'sender-1');
          repository.reads.last.result.complete(senderView(scope));
          await back;
          expect(ready().canEnable, isTrue);
        },
      );

      test(
        'empty history pages remain explicitly pageable without fetching all senders',
        () async {
          await signIn('guest-1');
          final cursor = senderCursor(channel, 'a');
          repository.pages.last.result.complete(
            senderPage(scope, configured: null, nextCursor: cursor),
          );
          await container.pump();
          expect(ready().review, isNull);
          expect(ready().navigation.canLoadMore, isTrue);
          expect(repository.reads, isEmpty);
          final more = controller().loadMore(ready().navigation);
          expect(repository.pages.last.cursor, cursor);
          final next = senderCursor(channel, 'b');
          repository.pages.last.result.complete(
            senderPage(
              scope,
              configured: null,
              previous: ['older-1'],
              after: cursor,
              nextCursor: next,
            ),
          );
          await repository.waitForReads(1);
          repository.reads.last.result.complete(
            senderView(scope, senderId: 'older-1'),
          );
          await more;
          expect(ready().navigation.isEarlier, isTrue);
          expect(ready().canEnable, isFalse);
          expect(repository.pages, hasLength(2));
          expect(repository.reads, hasLength(1));
          final last = controller().loadMore(ready().navigation);
          repository.pages.last.result.complete(
            senderPage(
              scope,
              configured: null,
              previous: ['older-1', 'older-2'],
              after: next,
            ),
          );
          await last;
          expect(ready().navigation.previousSenderIds, ['older-1', 'older-2']);
          expect(ready().navigation.canLoadMore, isFalse);
          expect(repository.reads, hasLength(1));
        },
      );

      test(
        'an absent sender hides; discovery failures can be refreshed without enrollment',
        () async {
          await signIn('guest-1');
          repository.pages.last.result.completeError(
            const NetworkException('unavailable', 'Offline'),
          );
          await container.pump();
          expect(state(), isA<EventSenderPreferenceFailure>());
          final refresh = controller().refresh();
          repository.pages.last.result.complete(
            senderPage(scope, configured: null),
          );
          await refresh;
          expect(state(), isA<EventSenderPreferenceHidden>());
          expect(repository.reads, isEmpty);
          expect(repository.writes, isEmpty);
        },
      );

      test(
        'a changed configured sender across pages invalidates the whole discovery review',
        () async {
          await signIn('guest-1');
          final cursor = senderCursor(channel, 'a');
          repository.pages.last.result.complete(
            senderPage(scope, nextCursor: cursor),
          );
          await repository.waitForReads(1);
          repository.reads.last.result.complete(senderView(scope));
          await container.pump();
          final old = ready().review!;
          final more = controller().loadMore(ready().navigation);
          repository.pages.last.result.complete(
            senderPage(scope, configured: 'new-sender', after: cursor),
          );
          await more;
          expect(state(), isA<EventSenderPreferenceFailure>());
          await expectLater(
            controller().enable(old),
            throwsA(isA<ValidationException>()),
          );
          final refresh = controller().refresh();
          expect(repository.pages.last.cursor, isNull);
          repository.pages.last.result.complete(
            senderPage(scope, configured: 'new-sender'),
          );
          await repository.waitForReads(2);
          repository.reads.last.result.complete(
            senderView(scope, senderId: 'new-sender'),
          );
          await refresh;
          expect(ready().review!.view.senderId, 'new-sender');
        },
      );

      test(
        'duplicate taps share one request and uncertainty survives sheet dismissal',
        () async {
          await load();
          final originalController = controller();
          final review = ready().review!;
          final first = controller().enable(review);
          expect(controller().enable(review), same(first));
          final failure = expectLater(first, throwsA(isA<NetworkException>()));
          expect(ready().review!.view.preference, EventSenderPreference.notSet);
          expect(ready().phase, EventSenderPreferencePhase.saving);
          repository.writes.single.result.completeError(
            const NetworkException('unavailable', 'Lost reply'),
          );
          await failure;
          expect(ready().canRetry, isTrue);
          final navigation = ready().navigation;
          await expectLater(
            controller().choose(navigation, 'old-sender'),
            throwsA(isA<ValidationException>()),
          );
          await expectLater(
            controller().loadMore(navigation),
            throwsA(isA<ValidationException>()),
          );
          await expectLater(
            controller().disable(review),
            throwsA(isA<ValidationException>()),
          );
          await controller().refresh();
          expect(repository.reads, hasLength(1));
          subscription.close();
          await container.pump();
          subscription = container.listen(provider, (_, _) {});
          expect(controller(), same(originalController));
          expect(ready().review, same(review));
          final change = repository.writes.single.change;
          final retry = controller().retry(review);
          expect(repository.writes.last.change, same(change));
          expect(repository.writes.last.change.toJson(), change.toJson());
          repository.writes.last.result.complete(
            senderApplied(
              change,
              outcome: 'replayed',
              patch: {'revision': 3, 'preference': 'disabled'},
            ),
          );
          await retry;
          expect(ready().canNavigate, isTrue);
          expect(
            ready().review!.view.preference,
            EventSenderPreference.disabled,
          );
        },
      );

      test(
        'definite rejection and same-suffix review changes require fresh consent',
        () async {
          await load();
          final old = ready().review!;
          final first = controller().enable(old);
          final rejected = expectLater(
            first,
            throwsA(isA<BackendOperationException>()),
          );
          repository.writes.last.result.completeError(
            const BackendOperationException(
              code: 'failed-precondition',
              message: 'Review changed',
              context: BackendErrorContext(
                service: BackendService.functions,
                action: 'save messages',
              ),
            ),
          );
          await rejected;
          expect(ready().phase, EventSenderPreferencePhase.refreshRequired);
          await expectLater(
            controller().retry(old),
            throwsA(isA<ValidationException>()),
          );
          final refresh = controller().refresh();
          repository.reads.last.result.complete(
            senderView(scope, patch: {'reviewHash': 'c' * 64}),
          );
          await refresh;
          expect(ready().review!.view.phoneLastFour, old.view.phoneLastFour);
          await expectLater(
            controller().enable(old),
            throwsA(isA<ValidationException>()),
          );
          final next = controller().enable(ready().review!);
          final change = repository.writes.last.change;
          expect(change.snapshot.reviewHash, 'c' * 64);
          expect(
            change.requestId,
            isNot(repository.writes.first.change.requestId),
          );
          final malformed = expectLater(next, throwsFormatException);
          repository.writes.last.result.completeError(
            const FormatException('Invalid reply'),
          );
          await malformed;
          expect(ready().phase, EventSenderPreferencePhase.uncertain);
        },
      );

      test(
        'conflict publishes returned terms without assuming the request applied',
        () async {
          await load();
          final old = ready().review!;
          final change = controller().enable(old);
          repository.writes.last.result.complete(
            EventSenderPreferenceResult.fromCallableData(
              senderResponse(
                scope,
                outcome: 'conflict',
                patch: {'reviewHash': 'c' * 64},
              ),
              expectedScope: scope,
              expectedSenderId: 'sender-1',
            ),
          );
          await change;
          expect(ready().notice, EventSenderPreferenceNotice.changed);
          expect(ready().review!.view.preference, EventSenderPreference.notSet);
          await expectLater(
            controller().enable(old),
            throwsA(isA<ValidationException>()),
          );
        },
      );

      test(
        'account A to B to A fences old pages, changes and navigation callbacks',
        () async {
          await load();
          final old = ready().review!;
          final navigation = ready().navigation;
          final pending = controller().enable(old);
          final failure = expectLater(
            pending,
            throwsA(isA<BackendOperationException>()),
          );
          final write = repository.writes.single;
          await signIn('guest-2');
          final bPage = repository.pages.last;
          await signIn('guest-1');
          final aPage = repository.pages.last;
          bPage.result.complete(
            senderPage(scope, configured: 'foreign-sender'),
          );
          write.result.complete(senderApplied(write.change));
          await failure;
          await container.pump();
          expect(state(), isA<EventSenderPreferenceLoading>());
          expect(repository.reads, hasLength(1));
          aPage.result.complete(senderPage(scope));
          await repository.waitForReads(2);
          repository.reads.last.result.complete(senderView(scope));
          await container.pump();
          expect(ready().review!.account, isNot(same(old.account)));
          await expectLater(
            controller().enable(old),
            throwsA(isA<BackendOperationException>()),
          );
          await expectLater(
            controller().choose(navigation, 'old-sender'),
            throwsA(isA<BackendOperationException>()),
          );
          expect(repository.writes, hasLength(1));
          await signIn(null);
          expect(state(), isA<EventSenderPreferenceHidden>());
        },
      );

      test(
        'auth errors discard an uncertain review after the sheet closes',
        () async {
          await load();
          final old = ready().review!;
          final pending = controller().enable(old);
          final failure = expectLater(
            pending,
            throwsA(isA<NetworkException>()),
          );
          repository.writes.single.result.completeError(
            const NetworkException('unavailable', 'Lost reply'),
          );
          await failure;
          subscription.close();
          await container.pump();
          auth.addError(StateError('Auth unavailable'));
          await container.pump();
          subscription = container.listen(provider, (_, _) {});
          expect(state(), isA<EventSenderPreferenceFailure>());
          await signIn('guest-1');
          repository.pages.last.result.complete(senderPage(scope));
          await repository.waitForReads(2);
          repository.reads.last.result.complete(senderView(scope));
          await container.pump();
          expect(ready().canRetry, isFalse);
          await expectLater(
            controller().enable(old),
            throwsA(isA<BackendOperationException>()),
          );
          expect(repository.writes, hasLength(1));
        },
      );

      test(
        'read failures and backward views cannot reuse a prior checkbox callback',
        () async {
          await load(
            patch: {'revision': 1, 'preference': 'enabled', 'expiresAt': 3000},
          );
          final old = ready().review!;
          final refresh = controller().refresh();
          expect(controller().refresh(), same(refresh));
          repository.reads.last.result.complete(senderView(scope));
          await refresh;
          expect(state(), isA<EventSenderPreferenceFailure>());
          await expectLater(
            controller().disable(old),
            throwsA(isA<ValidationException>()),
          );
          final fresh = controller().refresh();
          repository.reads.last.result.completeError(
            const NetworkException('unavailable', 'Offline'),
          );
          await fresh;
          expect(state(), isA<EventSenderPreferenceFailure>());
          expect(repository.writes, isEmpty);
        },
      );
    });
  }

  test(
    'WhatsApp and RCS remain independently operable for the same participant',
    () async {
      final repository = SenderTestRepository();
      final auth = StreamController<String?>.broadcast();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => auth.stream),
          eventSenderPreferenceRepositoryProvider.overrideWith(
            (ref) => repository,
          ),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await auth.close();
      });
      final waScope = senderScope(EventSenderChannel.whatsapp);
      final rcsScope = senderScope(EventSenderChannel.rcs);
      final wa = eventSenderPreferenceControllerProvider(waScope);
      final rcs = eventSenderPreferenceControllerProvider(rcsScope);
      container.listen(wa, (_, _) {});
      container.listen(rcs, (_, _) {});
      auth.add('guest-1');
      await repository.waitForPages(2);
      for (final page in repository.pages) {
        page.result.complete(senderPage(page.scope));
      }
      await repository.waitForReads(2);
      for (final read in repository.reads) {
        read.result.complete(senderView(read.scope));
      }
      await container.pump();
      final waReview =
          (container.read(wa) as EventSenderPreferenceReady).review!;
      final rcsReview =
          (container.read(rcs) as EventSenderPreferenceReady).review!;
      await expectLater(
        container.read(rcs.notifier).enable(waReview),
        throwsA(isA<ValidationException>()),
      );
      final waSave = container.read(wa.notifier).enable(waReview);
      final rcsSave = container.read(rcs.notifier).enable(rcsReview);
      expect(
        repository.writes.map((w) => w.change.snapshot.scope.channel).toSet(),
        {EventSenderChannel.whatsapp, EventSenderChannel.rcs},
      );
      final failure = expectLater(waSave, throwsA(isA<NetworkException>()));
      repository.writes.first.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      repository.writes.last.result.complete(
        senderApplied(repository.writes.last.change),
      );
      await failure;
      await rcsSave;
      expect(
        (container.read(wa) as EventSenderPreferenceReady).canRetry,
        isTrue,
      );
      expect(
        (container.read(rcs) as EventSenderPreferenceReady).canDisable,
        isTrue,
      );
    },
  );
}
