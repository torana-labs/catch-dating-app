import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

Future<void> primeUidProvider(ProviderContainer container) async {
  final uidSubscription = container.listen(
    uidProvider,
    (_, _) {},
    fireImmediately: true,
  );
  addTearDown(uidSubscription.close);
  await container.pump();
}

ProviderContainer buildHostControllerContainer({
  required FakeEventRepository eventRepository,
  String? uid = 'host-1',
}) {
  final container = ProviderContainer(
    overrides: [
      eventRepositoryProvider.overrideWith((ref) => eventRepository),
      uidProvider.overrideWith((ref) => Stream.value(uid)),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('HostEventBookingController', () {
    test('cancelHostedEvent delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .cancelHostedEvent(
            event: buildEvent(id: 'event-10'),
            reason: 'Weather warning',
          );

      expect(fakeEventRepository.hostCancelledEventId, 'event-10');
      expect(fakeEventRepository.hostCancelReason, 'Weather warning');
    });

    test('deleteHostedEvent delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .deleteHostedEvent(event: buildEvent(id: 'event-11'));

      expect(fakeEventRepository.deletedEventId, 'event-11');
    });

    test('updateHostedEvent delegates editable event details', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);
      final event = buildEvent(id: 'event-12');

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .updateHostedEvent(
            event: event,
            includePolicy: true,
            inviteCode: 'VIP123',
          );

      expect(fakeEventRepository.updatedEvent, event);
      expect(fakeEventRepository.updatedEventIncludePolicy, isTrue);
      expect(fakeEventRepository.updatedEventInviteCode, 'VIP123');
    });

    test('updateHostedEvent deduplicates an active request snapshot', () async {
      final pendingUpdate = Completer<void>();
      final fakeEventRepository = FakeEventRepository()
        ..updateEventCompleter = pendingUpdate;
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);
      final controller = container.read(
        hostEventBookingControllerProvider.notifier,
      );
      final event = buildEvent(id: 'event-12');

      final first = controller.updateHostedEvent(
        event: event,
        includePolicy: true,
        inviteCode: 'VIP123',
      );
      final duplicate = controller.updateHostedEvent(
        event: event.copyWith(description: 'Stale overwrite'),
      );

      expect(identical(first, duplicate), isTrue);
      expect(fakeEventRepository.updateEventCallCount, 1);
      pendingUpdate.complete();
      await Future.wait([first, duplicate]);

      fakeEventRepository.updateEventCompleter = null;
      await controller.updateHostedEvent(event: event);
      expect(fakeEventRepository.updateEventCallCount, 2);
    });

    test('createWaitlistOffer delegates a single user offer', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .createWaitlistOffer(eventId: 'event-42', userId: 'runner-9');

      expect(fakeEventRepository.createdWaitlistOfferEventId, 'event-42');
      expect(fakeEventRepository.createdWaitlistOfferUserIds, ['runner-9']);
    });

    test('createWaitlistOffers delegates bulk offers in order', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .createWaitlistOffers(
            eventId: 'event-42',
            userIds: ['runner-2', 'runner-3'],
          );

      expect(fakeEventRepository.createdWaitlistOfferEventId, 'event-42');
      expect(fakeEventRepository.createdWaitlistOfferUserIds, [
        'runner-2',
        'runner-3',
      ]);
    });

    test('createWaitlistOffers skips empty batches', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .createWaitlistOffers(eventId: 'event-42', userIds: const []);

      expect(fakeEventRepository.createdWaitlistOfferEventId, isNull);
      expect(fakeEventRepository.createdWaitlistOfferUserIds, isNull);
    });

    test('approveJoinRequest delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .approveJoinRequest(eventId: 'event-42', userId: 'runner-9');

      expect(fakeEventRepository.decidedJoinRequestEventId, 'event-42');
      expect(fakeEventRepository.decidedJoinRequestUserId, 'runner-9');
      expect(fakeEventRepository.decidedJoinRequestDecision, 'approve');
    });

    test('declineJoinRequest delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .declineJoinRequest(eventId: 'event-42', userId: 'runner-9');

      expect(fakeEventRepository.decidedJoinRequestEventId, 'event-42');
      expect(fakeEventRepository.decidedJoinRequestUserId, 'runner-9');
      expect(fakeEventRepository.decidedJoinRequestDecision, 'decline');
    });

    test('markAttendance delegates to the event repository', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
      );
      await primeUidProvider(container);

      await container
          .read(hostEventBookingControllerProvider.notifier)
          .markAttendance(eventId: 'event-42', userId: 'runner-9');

      expect(fakeEventRepository.markedAttendanceEventId, 'event-42');
      expect(fakeEventRepository.markedAttendanceUserId, 'runner-9');
    });

    test('throws before deleting when the user is not signed in', () async {
      final fakeEventRepository = FakeEventRepository();
      final container = buildHostControllerContainer(
        eventRepository: fakeEventRepository,
        uid: null,
      );
      await primeUidProvider(container);

      await expectLater(
        container
            .read(hostEventBookingControllerProvider.notifier)
            .deleteHostedEvent(event: buildEvent(id: 'event-11')),
        throwsA(isA<SignInRequiredException>()),
      );

      expect(fakeEventRepository.deletedEventId, isNull);
    });
  });

  group('HostEventBookingController mutation keys', () {
    test('scope row operations by event and user', () {
      expect(
        HostEventBookingController.waitlistOfferMutationKey(
          eventId: 'event-1',
          userId: 'user-1',
        ),
        (eventId: 'event-1', userId: 'user-1'),
      );
      expect(
        HostEventBookingController.approveJoinRequestMutationKey(
          eventId: 'event-1',
          userId: 'user-1',
        ),
        (eventId: 'event-1', userId: 'user-1'),
      );
      expect(
        HostEventBookingController.declineJoinRequestMutationKey(
          eventId: 'event-1',
          userId: 'user-1',
        ),
        (eventId: 'event-1', userId: 'user-1'),
      );
      expect(
        HostEventBookingController.markAttendanceMutationKey(
          eventId: 'event-1',
          userId: 'user-1',
        ),
        (eventId: 'event-1', userId: 'user-1'),
      );
    });

    test('scopes bulk waitlist offers by event', () {
      expect(
        HostEventBookingController.bulkWaitlistOfferMutationKey(
          eventId: 'event-1',
        ),
        (eventId: 'event-1', scope: HostEventBulkMutationScope.waitlistOffer),
      );
    });
  });
}
