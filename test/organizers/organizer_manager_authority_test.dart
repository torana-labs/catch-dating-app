import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizers_test_helpers.dart';

const _removed = 'removed-manager';
const _staleProfile = OrganizerHostProfile(
  uid: _removed,
  displayName: 'Old manager display',
  role: OrganizerHostRole.owner,
);

Organizer _revokedOrganizer() => buildOrganizer(
  hostUserId: 'owner',
  ownerUserId: 'owner',
  hostUserIds: const ['owner'],
  hostProfiles: const [_staleProfile],
);

void main() {
  test(
    'revocation is not undone by a delayed owner-labelled display entry',
    () {
      final managed = _revokedOrganizer().copyWith(
        hostUserIds: ['owner', _removed],
      );
      expect(managed.isHostedBy(_removed), isTrue);
      final revoked = managed.copyWith(hostUserIds: ['owner']);
      expect(revoked.isHostedBy(_removed), isFalse);
      expect(revoked.displayHostProfiles, contains(_staleProfile));
      expect(revoked.isHostedBy('owner'), isTrue);
    },
  );

  test('display-only legacy records and signed-out users grant no seat', () {
    final displayOnly = _revokedOrganizer().copyWith(
      hostUserId: null,
      ownerUserId: null,
      hostUserIds: [],
    );
    expect(displayOnly.isHostedBy(_removed), isFalse);
    expect(displayOnly.isHostedBy(null), isFalse);
  });

  test('nested ownership snapshots do not grant a management seat', () {
    final nestedOnly = _revokedOrganizer().copyWith(
      ownership: OrganizerOwnership.fromJson({
        'state': 'claimed',
        'ownerUserId': _removed,
        'primaryHostUserId': _removed,
        'hostUserIds': [_removed],
      }),
    );
    expect(nestedOnly.isHostedBy(_removed), isFalse);
    expect(nestedOnly.isOwnedBy(_removed), isFalse);
    expect(nestedOnly.isOwnedBy('owner'), isTrue);
  });

  for (final entry in <String, Organizer>{
    'legacy host': buildOrganizer(hostUserId: 'allowed'),
    'canonical owner': buildOrganizer(hostUserId: null, ownerUserId: 'allowed'),
    'manager array': buildOrganizer(hostUserId: null, hostUserIds: ['allowed']),
  }.entries) {
    test(
      '${entry.key} retains management authority without a display profile',
      () {
        expect(entry.value.isHostedBy('allowed'), isTrue);
        expect(entry.value.isHostedBy('outsider'), isFalse);
      },
    );
  }

  test(
    'canonical owner wins ownership while both explicit IDs remain managers',
    () {
      final transferred = buildOrganizer(
        hostUserId: 'old-host',
        ownerUserId: 'new-owner',
      );
      expect(transferred.isOwnedBy('new-owner'), isTrue);
      expect(transferred.isOwnedBy('old-host'), isFalse);
      expect(transferred.isHostedBy('old-host'), isTrue);
      expect(transferred.isHostedBy('new-owner'), isTrue);
      expect(buildOrganizer(hostUserId: 'legacy').isOwnedBy('legacy'), isTrue);
    },
  );

  test('stale display profile cannot open the event edit route', () {
    final organizer = _revokedOrganizer();
    final event = buildEvent(clubId: organizer.id);
    final state = HostEventEditState.resolve(
      uid: const CatchAsyncState<String?>.data(_removed),
      organizer: CatchAsyncState<Organizer?>.data(organizer),
      event: CatchAsyncState.data(event),
    );
    expect(state.status, HostEventEditRouteStatus.unauthorized);
    final ownerState = HostEventEditState.resolve(
      uid: const CatchAsyncState<String?>.data('owner'),
      organizer: CatchAsyncState<Organizer?>.data(organizer),
      event: CatchAsyncState.data(event),
    );
    expect(ownerState.status, HostEventEditRouteStatus.ready);
  });

  test(
    'host detail route rejects a revoked manager and consumer exposes no host affordance',
    () {
      AsyncValue<OrganizerDetailViewModel?> resolve(AppRole role) =>
          buildOrganizerDetailViewModel(
            organizerAsync: AsyncData(_revokedOrganizer()),
            eventsAsync: const AsyncData([]),
            reviewsAsync: const AsyncData([]),
            userProfileAsync: const AsyncData(null),
            uidAsync: const AsyncData(_removed),
            membershipAsync: const AsyncData(null),
            appRole: role,
          );
      expect(resolve(AppRole.host).value, isNull);
      expect(resolve(AppRole.consumer).value?.isHost, isFalse);
    },
  );

  test(
    'media edit rejects a revoked manager before the repository mutation',
    () async {
      final repository = FakeOrganizersRepository();
      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => repository),
          uidProvider.overrideWith((ref) => Stream.value(_removed)),
        ],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      await container.pump();
      await expectLater(
        container
            .read(hostOrganizerEditControllerProvider)
            .updateOrganizerMedia(
              organizer: _revokedOrganizer(),
              removeLogo: true,
            ),
        throwsA(
          isA<BackendOperationException>().having(
            (error) => error.code,
            'code',
            'club-host-edit-required',
          ),
        ),
      );
      expect(repository.lastUpdatedOrganizerId, isNull);
      expect(repository.lastUpdatedFields, isNull);
    },
  );
}
