import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  ProviderContainer container({required List<String> billReads}) {
    final container = ProviderContainer(
      overrides: [
        authenticatedSessionProvider.overrideWithValue(const AsyncLoading()),
        watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        hostOrganizerBillsProvider.overrideWith((ref, organizerId) async {
          billReads.add(organizerId);
          return [organizerBill()];
        }),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  test('an owner gets the newest bill and the team; the stats wait for the '
      'session', () async {
    final reads = <String>[];
    final ref = container(billReads: reads);
    final request = OrganizerTabRequest(
      organizer: lanternLane(),
      uid: organizerOwnerUid,
    );
    final sub = ref.listen(organizerTabControllerProvider(request), (_, _) {});
    addTearDown(sub.close);
    await ref.read(hostOrganizerBillsProvider(request.organizer.id).future);

    final state = ref.read(organizerTabControllerProvider(request));
    expect(state.isOwner, isTrue);
    expect(state.billMinor, 740000);
    expect(state.teamCount, 2);
    expect(state.statsPending, isTrue);
    expect(state.stats, isEmpty);
    expect(state.pageLink, isNull);
    expect(reads, ['lantern-lane']);
  });

  test('a host who is not the owner never reads the bills', () {
    final reads = <String>[];
    final ref = container(billReads: reads);
    final state = ref.read(
      organizerTabControllerProvider(
        OrganizerTabRequest(organizer: lanternLane(), uid: organizerHostUid),
      ),
    );

    expect(state.isOwner, isFalse);
    expect(state.billMinor, isNull);
    expect(reads, isEmpty);
  });

  test('the stat kinds stay in board order', () {
    expect(OrganizerStatKind.values, [
      OrganizerStatKind.bookings,
      OrganizerStatKind.ticketSales,
      OrganizerStatKind.followers,
      OrganizerStatKind.pageVisits,
    ]);
  });
}
