import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/event_success/presentation/event_sender_preference_controller.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_sender_preference_fixtures.dart';

void main() {
  for (final channel in EventSenderChannel.values) {
    group(channel.name, () {
      final scope = senderScope(channel);
      final provider = eventSenderPreferenceControllerProvider(scope);
      late SenderTestRepository repository;
      late ProviderContainer container;
      EventSenderPreferenceController controller() =>
          container.read(provider.notifier);
      EventSenderPreferenceReady ready() =>
          container.read(provider) as EventSenderPreferenceReady;
      Future<void> load() async {
        repository.pages.single.result.complete(senderPage(scope));
        await repository.waitForReads(1);
        repository.reads.single.result.complete(senderView(scope));
        await container.pump();
      }

      setUp(() async {
        repository = SenderTestRepository();
        container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('guest-1')),
            eventSenderPreferenceRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
        );
        container.listen(provider, (_, _) {});
        await repository.waitForPages(1);
      });
      tearDown(() => container.dispose());

      test('discovery cannot publish another participant’s choices', () async {
        repository.pages.single.result.complete(
          senderPage(senderScope(channel, attendeeId: 'foreign')),
        );
        await container.pump();
        expect(container.read(provider), isA<EventSenderPreferenceFailure>());
        expect(repository.reads, isEmpty);
      });

      test('a selected sender read cannot expose a different sender', () async {
        repository.pages.single.result.complete(senderPage(scope));
        await repository.waitForReads(1);
        repository.reads.single.result.complete(
          senderView(scope, senderId: 'foreign'),
        );
        await container.pump();
        expect(container.read(provider), isA<EventSenderPreferenceFailure>());
      });

      for (final wrong in ['participant', 'decision', 'terms']) {
        test(
          'the state owner rejects an applied receipt with wrong $wrong',
          () async {
            await load();
            final request = controller().enable(ready().review!);
            final rejected = expectLater(request, throwsFormatException);
            final change = repository.writes.single.change;
            final expected = wrong == 'participant'
                ? senderScope(channel, attendeeId: 'foreign')
                : scope;
            repository.writes.single.result.complete(
              EventSenderPreferenceResult.fromCallableData(
                senderAppliedRaw(
                  change,
                  patch: switch (wrong) {
                    'participant' => {'attendeeId': 'foreign'},
                    'decision' => {'preference': 'disabled'},
                    _ =>
                      channel == EventSenderChannel.sms
                          ? {'phoneLastFour': '7777'}
                          : {'reviewHash': 'f' * 64},
                  },
                ),
                expectedScope: expected,
                expectedSenderId: change.snapshot.senderId,
              ),
            );
            await rejected;
            expect(ready().phase, EventSenderPreferencePhase.uncertain);
            expect(ready().notice, EventSenderPreferenceNotice.none);
            expect(
              ready().review!.view.preference,
              EventSenderPreference.notSet,
            );
          },
        );
      }

      test(
        'retry is actionable as soon as its uncertain state is visible',
        () async {
          await load();
          Future<EventSenderPreferenceResult>? next;
          final observer = container.listen(provider, (_, state) {
            if (state is EventSenderPreferenceReady &&
                state.canRetry &&
                next == null) {
              next = controller().retry(state.review!);
            }
          });
          final request = controller().enable(ready().review!);
          final failed = expectLater(request, throwsA(isA<NetworkException>()));
          repository.writes.single.result.completeError(
            const NetworkException('unavailable', 'Offline'),
          );
          await failed;
          expect(next, isNot(same(request)));
          expect(repository.writes, hasLength(2));
          final retry = repository.writes.last;
          expect(retry.change, same(repository.writes.first.change));
          retry.result.complete(senderApplied(retry.change));
          await next;
          observer.close();
          expect(ready().notice, EventSenderPreferenceNotice.saved);
        },
      );
    });
  }
}
