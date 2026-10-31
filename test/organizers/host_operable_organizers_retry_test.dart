import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test(
    'Retry re-runs the failed organizer listener, not the composition',
    () async {
      var hostedAttempts = 0;
      final container = ProviderContainer(
        // Only the user's Retry may re-run a read in this test.
        retry: (_, _) => null,
        overrides: [
          watchOrganizersHostedByProvider('uid-a').overrideWith((ref) {
            hostedAttempts += 1;
            return hostedAttempts == 1
                ? Stream.error(StateError('permission-denied'))
                : Stream.value(const <Organizer>[]);
          }),
          watchOrganizersOwnedByProvider(
            'uid-a',
          ).overrideWith((ref) => Stream.value(const <Organizer>[])),
        ],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(
        hostOperableOrganizersProvider('uid-a'),
        (_, _) {},
      );
      addTearDown(subscription.close);

      Future<void> settle() async {
        await flushTestEventQueue();
        await container.pump();
      }

      await settle();
      expect(subscription.read().hasError, isTrue);

      container.invalidate(hostOperableOrganizersProvider('uid-a'));
      await settle();
      expect(subscription.read().hasError, isTrue);
      expect(hostedAttempts, 1);

      hostOperableOrganizerReads('uid-a').forEach(container.invalidate);
      await settle();
      expect(subscription.read(), isA<AsyncData<List<Organizer>>>());
      expect(hostedAttempts, 2);
    },
  );
}
