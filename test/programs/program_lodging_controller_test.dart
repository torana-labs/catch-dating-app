import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_controller.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'program_lodging_test_fixtures.dart';
import 'program_operations_fixture.dart';

void main() {
  late ProviderContainer container;
  late FakeLodgingRepository repository;
  late ProgramReadSnapshotStore snapshots;
  late ProviderSubscription<AsyncValue<ProgramLodgingView>> subscription;
  final provider = programLodgingControllerProvider('program');
  setUp(() {
    repository = FakeLodgingRepository();
    snapshots = emptyProgramSnapshots();
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('actor')),
        programReadSnapshotStoreProvider.overrideWithValue(snapshots),
        programLodgingRepositoryProvider.overrideWithValue(repository),
      ],
    );
    subscription = container.listen(provider, (_, _) {});
  });
  tearDown(() => container.dispose());

  test(
    'membership save binds guest revision and explicit empty exclusion',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final membership = await controller.loadMembership('guest');
      await controller.saveMembership(membership, []);
      expect(repository.membershipSaves, 1);
      expect(repository.savedMembershipRevision, 7);
      expect(repository.savedMembershipGroups, isEmpty);
    },
  );
  test(
    'membership save without lodging setup reloads an honest empty view',
    () async {
      repository.hasSetup = false;
      repository.previewFailure = StateError('Lodging configuration is absent');
      container.invalidate(provider);
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final membership = await controller.loadMembership('guest');
      final previews = repository.previews;
      await controller.saveMembership(membership, ['friends']);
      final view = container.read(provider).requireValue;
      expect(repository.membershipSaves, 1);
      expect(repository.previews, previews);
      expect(view.setup.configuration, isNull);
      expect(view.review, isNull);
      expect(view.setup.catalog?.rows('guests'), isNotEmpty);
      expect(view.error, isNull);
    },
  );

  test(
    'uncertain membership write hides old choices and refresh never repeats it',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final membership = await controller.loadMembership('guest');
      repository.membershipFailure = TimeoutException(
        'Unknown membership result',
      );
      await expectLater(
        controller.saveMembership(membership, ['friends']),
        throwsA(isA<TimeoutException>()),
      );
      expect(container.read(provider).hasError, true);
      controller.refresh();
      await container.read(provider.future);
      expect(repository.membershipSaves, 1);
    },
  );
  test(
    'acknowledged membership save failed reload never repeats prior revision',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final membership = await controller.loadMembership('guest');
      repository.previewFailure = TimeoutException('Reload failed');
      await expectLater(
        controller.saveMembership(membership, ['friends']),
        throwsA(isA<TimeoutException>()),
      );
      expect(container.read(provider).hasError, true);
      repository.previewFailure = null;
      controller.refresh();
      await container.read(provider.future);
      expect(repository.membershipSaves, 1);
    },
  );
  test('disposed membership save cannot launch a late preview', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final membership = await controller.loadMembership('guest');
    final gate = Completer<int>();
    repository.pendingMembershipSave = gate.future;
    final previews = repository.previews;
    final pending = controller.saveMembership(membership, []);
    subscription.close();
    container.invalidate(provider);
    await container.pump();
    gate.complete(8);
    await expectLater(pending, throwsA(same(programReadSuperseded)));
    expect(repository.previews, previews);
  });
  test(
    'late membership read cannot deliver after account authority changes',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final gate = Completer<ProgramLodgingMembership>();
      repository.pendingMembershipRead = gate.future;
      final pending = controller.loadMembership('guest');
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('other')),
        programReadSnapshotStoreProvider.overrideWithValue(snapshots),
        programLodgingRepositoryProvider.overrideWithValue(repository),
      ]);
      await container.pump();
      gate.complete(
        ProgramLodgingMembership.fromMap(
          lodgingMembershipJson(),
          programId: 'program',
          guestId: 'guest',
        ),
      );
      await expectLater(pending, throwsA(same(programReadSuperseded)));
    },
  );
  test(
    'earlier loaded setup expiry blocks imperative membership access but permits refresh',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      repository.setupAccessExpiresAt = DateTime.utc(2020);
      await controller.loadSetup();
      expect(
        () => controller.loadMembership('guest'),
        throwsA(isA<PermissionException>()),
      );
      repository.setupAccessExpiresAt = null;
      controller.refresh();
      await container.read(provider.future);
    },
  );
  test('initial private view uses exact current proposal and setup', () async {
    final view = await container.read(provider.future);
    expect(view.review?.proposal.id, lodgingFixtureId);
    expect(view.busy, false);
    expect(view.setup.configuration, view.review?.configuration);
  });

  test(
    'missing setup exposes no invented rooms or sharing assumptions',
    () async {
      repository.hasSetup = false;
      container.invalidate(provider);
      final view = await container.read(provider.future);
      expect(view.review, isNull);
      expect(view.setup.configuration, isNull);
      expect(repository.commands, isEmpty);
    },
  );

  test('busy regeneration rejects a second mutation', () async {
    await container.read(provider.future);
    final gate = Completer<ProgramLodgingReview>();
    repository.pendingPreview = gate.future;
    final controller = container.read(provider.notifier);
    final pending = controller.regenerate();
    expect(container.read(provider).requireValue.busy, true);
    await expectLater(
      controller.regenerate(),
      throwsA(same(programReadSuperseded)),
    );
    gate.complete(repository.current);
    await pending;
    expect(container.read(provider).requireValue.busy, false);
  });

  test(
    'uncertain publication retries exact command without stale save',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      repository.transitionFailure = TimeoutException('Uncertain transport');
      await expectLater(
        controller.decide(ProgramLodgingAction.publishGuests),
        throwsA(isA<TimeoutException>()),
      );
      expect(
        container.read(provider).requireValue.retryAction,
        ProgramLodgingAction.publishGuests,
      );
      final first = Map.of(repository.commands.single);
      await expectLater(
        controller.decide(ProgramLodgingAction.approve),
        throwsA(isA<StateError>()),
      );
      repository.transitionFailure = null;
      await controller.decide(ProgramLodgingAction.publishGuests);
      expect(repository.commands.last, first);
      expect(repository.saves, 0);
      expect(container.read(provider).requireValue.retryAction, isNull);
    },
  );

  test(
    'uncertain approval retries one immutable save and same operation',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      repository.transitionFailure = TimeoutException('Uncertain transport');
      await expectLater(
        controller.decide(ProgramLodgingAction.approve),
        throwsA(isA<TimeoutException>()),
      );
      final first = Map.of(repository.commands.single);
      expect(repository.saves, 1);
      repository.transitionFailure = null;
      await controller.decide(ProgramLodgingAction.approve);
      expect(repository.commands.last, first);
      expect(repository.saves, 1);
    },
  );

  test(
    'acknowledged decision with failed refresh hides stale controls',
    () async {
      await container.read(provider.future);
      repository.previewFailure = TimeoutException('Reload failed');
      await expectLater(
        container
            .read(provider.notifier)
            .decide(ProgramLodgingAction.publishGuests),
        throwsA(isA<TimeoutException>()),
      );
      expect(container.read(provider).hasError, true);
      expect(container.read(provider).asData, isNull);
      expect(repository.commands, hasLength(1));
    },
  );

  test(
    'authority generation invalidates private view and late regeneration',
    () async {
      await container.read(provider.future);
      final gate = Completer<ProgramLodgingReview>();
      repository.pendingPreview = gate.future;
      final pending = container.read(provider.notifier).regenerate();
      repository.hasSetup = false;
      await container
          .read(programReadSnapshotStoreProvider)
          .clearProgram('actor', 'program');
      await container.pump();
      final fresh = await container.read(provider.future);
      expect(fresh.review, isNull);
      gate.complete(repository.current);
      await expectLater(pending, throwsA(same(programReadSuperseded)));
      expect(container.read(provider).requireValue.review, isNull);
    },
  );
  test(
    'account switch rejects a late proposal from the prior session',
    () async {
      await container.read(provider.future);
      final gate = Completer<ProgramLodgingReview>();
      repository.pendingPreview = gate.future;
      final pending = container.read(provider.notifier).regenerate();
      repository.hasSetup = false;
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('other')),
        programReadSnapshotStoreProvider.overrideWithValue(snapshots),
        programLodgingRepositoryProvider.overrideWithValue(repository),
      ]);
      await container.pump();
      expect((await container.read(provider.future)).review, isNull);
      gate.complete(repository.current);
      await expectLater(pending, throwsA(same(programReadSuperseded)));
      expect(container.read(provider).requireValue.review, isNull);
    },
  );

  test(
    'disposing during save cannot start the subsequent approval write',
    () async {
      await container.read(provider.future);
      final gate = Completer<ProgramLodgingProposal>();
      repository.pendingSave = gate.future;
      final pending = container
          .read(provider.notifier)
          .decide(ProgramLodgingAction.approve);
      subscription.close();
      await container.pump();
      gate.complete(repository.current.proposal);
      await expectLater(pending, throwsA(same(programReadSuperseded)));
      expect(repository.saves, 1);
      expect(repository.commands, isEmpty);
    },
  );
  test('late transition cannot clear a rebuilt pending decision', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final gate = Completer<Map<String, Object?>>();
    repository.pendingTransition = gate.future;
    final old = controller.decide(ProgramLodgingAction.publishGuests);
    container.invalidate(provider);
    await container.read(provider.future);
    repository.pendingTransition = null;
    repository.transitionFailure = TimeoutException('New uncertain decision');
    await expectLater(
      container.read(provider.notifier).decide(ProgramLodgingAction.approve),
      throwsA(isA<TimeoutException>()),
    );
    final newer = Map.of(repository.commands.last);
    final previews = repository.previews;
    gate.complete({'kind': 'transition'});
    await expectLater(old, throwsA(same(programReadSuperseded)));
    expect(repository.previews, previews);
    expect(
      container.read(provider).requireValue.retryAction,
      ProgramLodgingAction.approve,
    );
    repository.transitionFailure = null;
    await container
        .read(provider.notifier)
        .decide(ProgramLodgingAction.approve);
    expect(repository.commands.last, newer);
  });

  test('disposing during transition cannot start a late preview', () async {
    await container.read(provider.future);
    final gate = Completer<Map<String, Object?>>();
    repository.pendingTransition = gate.future;
    final pending = container
        .read(provider.notifier)
        .decide(ProgramLodgingAction.publishGuests);
    final previews = repository.previews;
    subscription.close();
    await container.pump();
    gate.complete({'kind': 'transition'});
    await expectLater(pending, throwsA(same(programReadSuperseded)));
    expect(repository.previews, previews);
  });

  test('refresh cannot discard an uncertain decision identity', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    repository.transitionFailure = TimeoutException('Uncertain transport');
    await expectLater(
      controller.decide(ProgramLodgingAction.publishGuests),
      throwsA(isA<TimeoutException>()),
    );
    final command = Map.of(repository.commands.single);
    expect(controller.refresh, throwsA(isA<StateError>()));
    expect(
      container.read(provider).requireValue.retryAction,
      ProgramLodgingAction.publishGuests,
    );
    repository.transitionFailure = null;
    await controller.decide(ProgramLodgingAction.publishGuests);
    expect(repository.commands.last, command);
  });
  test(
    'staged setup save binds exact configuration revision and adoptions',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final setup = await controller.loadSetup();
      final draft = ProgramLodgingDraft(
        catalog: setup.catalog!,
        configuration: setup.configuration,
      );
      final adoptions = <Map<String, Object?>>[
        {
          'stayId': 'stay',
          'partyId': 'party',
          'inventoryId': 'unit',
          'expectedRevision': 7,
        },
      ];
      await controller.saveDraft(draft, adoptions: adoptions);
      expect(repository.savedConfigurationRevision, 1);
      expect(repository.savedAdoptions, adoptions);
      expect(repository.savedSetup!.containsKey('programId'), false);
      expect(repository.commands, isEmpty);
    },
  );

  test('disposed setup save cannot start late preview', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final setup = await controller.loadSetup();
    final gate = Completer<int>();
    repository.pendingSetupSave = gate.future;
    final pending = controller.saveDraft(
      ProgramLodgingDraft(
        catalog: setup.catalog!,
        configuration: setup.configuration,
      ),
    );
    final previews = repository.previews;
    subscription.close();
    await container.pump();
    gate.complete(2);
    await expectLater(pending, throwsA(same(programReadSuperseded)));
    expect(repository.previews, previews);
  });

  for (final staged in [true, false]) {
    test(
      'acknowledged ${staged ? 'draft' : 'setup'} save reload failure hides old write',
      () async {
        await container.read(provider.future);
        final controller = container.read(provider.notifier);
        final setup = await controller.loadSetup();
        repository.previewFailure = TimeoutException(
          'Reload after save failed',
        );
        final draft = ProgramLodgingDraft(
          catalog: setup.catalog!,
          configuration: setup.configuration,
        );
        await expectLater(
          staged
              ? controller.saveDraft(draft)
              : controller.saveSetup(draft.setup),
          throwsA(isA<TimeoutException>()),
        );
        expect(repository.setupSaves, 1);
        expect(container.read(provider).hasError, true);
        expect(container.read(provider).asData, isNull);
        await expectLater(
          controller.saveDraft(draft),
          throwsA(same(programReadSuperseded)),
        );
        expect(repository.setupSaves, 1);
        repository.previewFailure = null;
        controller.refresh();
        await container.read(provider.future);
        expect(repository.setupSaves, 1);
      },
    );
  }

  for (final rejected in [
    ('aborted', 'Record changed since you loaded it. Reload and retry.'),
    (
      'failed-precondition',
      'Stale lodging proposal; regenerate against current data.',
    ),
    ('failed-precondition', 'Stale lodging workflow revision.'),
  ]) {
    test(
      'definitive ${rejected.$2} permits fresh source instead of stale retry',
      () async {
        await container.read(provider.future);
        final controller = container.read(provider.notifier);
        repository.transitionFailure = normalizeBackendError(
          FirebaseFunctionsException(code: rejected.$1, message: rejected.$2),
          context: const BackendErrorContext(
            service: BackendService.functions,
            action: 'manage hotel rooms',
            resource: 'manageProgramLodging',
          ),
        );
        await expectLater(
          controller.decide(ProgramLodgingAction.publishGuests),
          throwsA(isA<AppException>()),
        );
        final old = Map.of(repository.commands.single);
        expect(container.read(provider).hasError, true);
        expect(container.read(provider).asData, isNull);
        repository.transitionFailure = null;
        controller.refresh();
        await container.read(provider.future);
        await controller.decide(ProgramLodgingAction.publishGuests);
        expect(
          repository.commands.last['operationId'],
          isNot(old['operationId']),
        );
      },
    );
  }

  test(
    'unrecognized failed precondition retains exact uncertain command',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      repository.transitionFailure = normalizeBackendError(
        FirebaseFunctionsException(
          code: 'failed-precondition',
          message: 'Unknown transport failure',
        ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'manage hotel rooms',
          resource: 'manageProgramLodging',
        ),
      );
      await expectLater(
        controller.decide(ProgramLodgingAction.publishGuests),
        throwsA(isA<AppException>()),
      );
      final old = Map.of(repository.commands.single);
      expect(controller.refresh, throwsA(isA<StateError>()));
      repository.transitionFailure = null;
      await controller.decide(ProgramLodgingAction.publishGuests);
      expect(repository.commands.last, old);
    },
  );

  test(
    'uncertain hotel confirmation retries exact hotel and operation identity',
    () async {
      repository.current = ProgramLodgingReview.fromCallableData(
        lodgingTwoHotelReviewJson(),
      );
      container.invalidate(provider);
      final view = await container.read(provider.future);
      expect(view.review!.allocatedHotelIds, ['hotel', 'hotel2']);
      final controller = container.read(provider.notifier);
      repository.transitionFailure = TimeoutException(
        'Uncertain hotel confirmation',
      );
      await expectLater(
        controller.decide(ProgramLodgingAction.confirmHotel, hotelId: 'hotel2'),
        throwsA(isA<TimeoutException>()),
      );
      final command = Map.of(repository.commands.single);
      expect(command['hotelId'], 'hotel2');
      expect(container.read(provider).requireValue.retryHotelId, 'hotel2');
      await expectLater(
        controller.decide(ProgramLodgingAction.confirmHotel, hotelId: 'hotel'),
        throwsA(isA<StateError>()),
      );
      expect(controller.refresh, throwsA(isA<StateError>()));
      repository.transitionFailure = null;
      await controller.decide(
        ProgramLodgingAction.confirmHotel,
        hotelId: 'hotel2',
      );
      expect(repository.commands.last, command);
      expect(repository.saves, 0);
      expect(container.read(provider).requireValue.retryHotelId, isNull);
    },
  );

  test(
    'confirmation rejects missing or unallocated hotel before a write',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      for (final hotelId in [null, 'foreign-hotel']) {
        await expectLater(
          controller.decide(
            ProgramLodgingAction.confirmHotel,
            hotelId: hotelId,
          ),
          throwsA(isA<StateError>()),
        );
      }
      await expectLater(
        controller.decide(ProgramLodgingAction.publishGuests, hotelId: 'hotel'),
        throwsA(isA<StateError>()),
      );
      expect(repository.commands, isEmpty);
    },
  );

  test(
    'acknowledged hotel confirmation never republishes on failed reload',
    () async {
      await container.read(provider.future);
      repository.previewFailure = TimeoutException('Reload failed');
      final controller = container.read(provider.notifier);
      await expectLater(
        controller.decide(ProgramLodgingAction.confirmHotel, hotelId: 'hotel'),
        throwsA(isA<TimeoutException>()),
      );
      expect(container.read(provider).hasError, true);
      repository.previewFailure = null;
      controller.refresh();
      await container.read(provider.future);
      expect(repository.commands, hasLength(1));
      expect(repository.commands.single['action'], 'confirmHotel');
    },
  );
}
