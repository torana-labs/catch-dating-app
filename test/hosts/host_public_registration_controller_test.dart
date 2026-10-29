import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import 'host_event_booking_controller_test.dart'
    show buildHostControllerContainer, primeUidProvider;

class _RegistrationRepository extends FakeEventRepository {
  final calls =
      <({Event event, EventPublicRegistrationMode mode, String requestId})>[];
  bool fail = false;
  @override
  Future<void> configurePublicRegistration({
    required Event event,
    required EventPublicRegistrationMode mode,
    required String requestId,
  }) async {
    calls.add((event: event, mode: mode, requestId: requestId));
    if (fail) throw StateError('Lost response');
  }
}

void main() {
  test(
    'paid registration retry retains its command and newer revisions get a new identity',
    () async {
      final repository = _RegistrationRepository()..fail = true;
      final container = buildHostControllerContainer(
        eventRepository: repository,
      );
      await primeUidProvider(container);
      final subscription = container.listen(
        hostEventBookingControllerProvider,
        (_, _) {},
      );
      addTearDown(subscription.close);
      final controller = container.read(
        hostEventBookingControllerProvider.notifier,
      );
      final event = buildEvent(
        priceInPaise: 85000,
      ).copyWith(publicRegistrationRevision: 3);
      await expectLater(
        controller.setPublicRegistration(event: event, enabled: true),
        throwsStateError,
      );
      repository.fail = false;
      await controller.setPublicRegistration(event: event, enabled: true);
      expect(repository.calls[0].mode, EventPublicRegistrationMode.paid);
      expect(repository.calls[0].requestId, repository.calls[1].requestId);
      expect(repository.calls[0].event.publicRegistrationRevision, 3);
      await controller.setPublicRegistration(
        event: event.copyWith(publicRegistrationRevision: 4),
        enabled: false,
      );
      expect(repository.calls.last.mode, EventPublicRegistrationMode.closed);
      expect(
        repository.calls.last.requestId,
        isNot(repository.calls.first.requestId),
      );
    },
  );
  test(
    'free events opt in to free mode and signed-out users cannot configure',
    () async {
      final repository = _RegistrationRepository();
      final container = buildHostControllerContainer(
        eventRepository: repository,
      );
      await primeUidProvider(container);
      await container
          .read(hostEventBookingControllerProvider.notifier)
          .setPublicRegistration(event: buildEvent(), enabled: true);
      expect(repository.calls.single.mode, EventPublicRegistrationMode.free);
      final signedOut = buildHostControllerContainer(
        eventRepository: repository,
        uid: null,
      );
      await primeUidProvider(signedOut);
      await expectLater(
        signedOut
            .read(hostEventBookingControllerProvider.notifier)
            .setPublicRegistration(event: buildEvent(), enabled: true),
        throwsA(isA<Exception>()),
      );
      expect(repository.calls.length, 1);
    },
  );
}
