import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/safety/data/messaging_permission_repository.dart';
import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import '../test_pump_helpers.dart';

class _Repository extends Fake implements MessagingPermissionRepository {
  final lists = <Completer<MessagingPermissionPage>>[];
  final cursors = <String?>[];
  final withdrawals =
      <(MessagingPermission, String, Completer<MessagingPermission>)>[];
  final withdrawnPurposes = <MessagingPermissionPurpose?>[];
  @override
  Future<MessagingPermissionPage> list({String? cursor}) {
    cursors.add(cursor);
    final call = Completer<MessagingPermissionPage>();
    lists.add(call);
    return call.future;
  }

  @override
  Future<MessagingPermission> withdraw(
    MessagingPermission permission,
    String requestId,
    {MessagingPermissionPurpose? purpose}
  ) {
    withdrawnPurposes.add(purpose);
    final call = Completer<MessagingPermission>();
    withdrawals.add((permission, requestId, call));
    return call.future;
  }
}

MessagingPermission _permission(String receipt, {bool stopped = false}) =>
    MessagingPermission(
      organizerId: null,
      organizerName: null,
      receiptId: receipt,
      status: stopped
          ? MessagingPermissionStatus.optedOut
          : MessagingPermissionStatus.optedIn,
    );
MessagingPermissionPage _page(String receipt, {String? cursor}) =>
    MessagingPermissionPage(
      catchPermission: _permission(receipt),
      organizers: const [],
      nextCursor: cursor,
    );

void main() {
  test(
    'withdrawal retries keep identity; in-flight results cannot cross accounts',
    () async {
      final accounts = StreamController<String?>();
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          messagingPermissionRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await accounts.close();
      });
      container.listen(messagingPermissionsControllerProvider, (_, _) {});
      accounts.add('one');
      await flushTestEventQueue();
      repository.lists.last.complete(_page('one-grant'));
      await container.read(messagingPermissionsControllerProvider.future);
      final controller = container.read(
        messagingPermissionsControllerProvider.notifier,
      );
      await controller.withdraw('foreign', _permission('one-grant'));
      expect(repository.withdrawals, isEmpty);
      final first = controller.withdraw('one', _permission('one-grant'));
      await controller.withdraw('one', _permission('one-grant'));
      expect(repository.withdrawals, hasLength(1));
      repository.withdrawals.last.$3.completeError(StateError('network lost'));
      await first;
      expect(
        container
            .read(messagingPermissionsControllerProvider)
            .requireValue
            .error,
        isNotNull,
      );
      final retry = controller.withdraw('one', _permission('one-grant'));
      expect(repository.withdrawals.last.$2, repository.withdrawals.first.$2);
      final stale = repository.withdrawals.last.$3;
      accounts.add('two');
      await flushTestEventQueue();
      repository.lists.last.complete(_page('two-grant'));
      await container.read(messagingPermissionsControllerProvider.future);
      stale.complete(_permission('one-withdrawal', stopped: true));
      await retry;
      final state = container
          .read(messagingPermissionsControllerProvider)
          .requireValue;
      expect(state.uid, 'two');
      expect(state.page.catchPermission.receiptId, 'two-grant');
      expect(state.error, isNull);
      expect(state.busy, false);
      await controller.withdraw('one', _permission('one-grant'));
      expect(repository.withdrawals, hasLength(2));
    },
  );

  test(
    'pagination retries the same cursor and updates current Catch permission',
    () async {
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('one')),
          messagingPermissionRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      container.listen(messagingPermissionsControllerProvider, (_, _) {});
      await flushTestEventQueue();
      repository.lists.last.complete(_page('grant', cursor: 'cursor'));
      await container.read(messagingPermissionsControllerProvider.future);
      final controller = container.read(
        messagingPermissionsControllerProvider.notifier,
      );
      final failed = controller.loadMore();
      await controller.loadMore();
      expect(repository.cursors, [null, 'cursor']);
      repository.lists.last.completeError(StateError('offline'));
      await failed;
      final retry = controller.loadMore();
      expect(repository.cursors, [null, 'cursor', 'cursor']);
      repository.lists.last.complete(
        MessagingPermissionPage(
          catchPermission: _permission('stop', stopped: true),
          organizers: const [],
          nextCursor: null,
        ),
      );
      await retry;
      final state = container
          .read(messagingPermissionsControllerProvider)
          .requireValue;
      expect(
        state.page.catchPermission.status,
        MessagingPermissionStatus.optedOut,
      );
      expect(state.page.nextCursor, isNull);
      expect(state.error, isNull);
    },
  );

  test('scoped withdrawal leaves the other organizer purpose active', () async {
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('one')),
        messagingPermissionRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    container.listen(messagingPermissionsControllerProvider, (_, _) {});
    await flushTestEventQueue();
    const permission = MessagingPermission(
      organizerId: 'rsvp',
      organizerName: 'RSVP',
      status: MessagingPermissionStatus.optedIn,
      receiptId: 'broad',
      purposes: {
        MessagingPermissionPurpose.eventOperations: MessagingPurposeDecision(
          status: MessagingPermissionStatus.optedIn,
          receiptId: 'ops',
        ),
        MessagingPermissionPurpose.marketing: MessagingPurposeDecision(
          status: MessagingPermissionStatus.optedIn,
          receiptId: 'marketing',
        ),
      },
    );
    repository.lists.last.complete(
      MessagingPermissionPage(
        catchPermission: _permission('catch'),
        organizers: const [permission],
        nextCursor: null,
      ),
    );
    await container.read(messagingPermissionsControllerProvider.future);
    final controller = container.read(
      messagingPermissionsControllerProvider.notifier,
    );
    final action = controller.withdraw(
      'one',
      permission,
      purpose: MessagingPermissionPurpose.eventOperations,
    );
    expect(repository.withdrawnPurposes.single,
        MessagingPermissionPurpose.eventOperations);
    repository.withdrawals.single.$3.complete(
      permission.afterWithdrawal(
        MessagingPermissionPurpose.eventOperations,
        'ops-stop',
      ),
    );
    await action;
    final saved = container
        .read(messagingPermissionsControllerProvider)
        .requireValue
        .page
        .organizers
        .single;
    expect(saved.purposes[MessagingPermissionPurpose.eventOperations]?.status,
        MessagingPermissionStatus.optedOut);
    expect(saved.purposes[MessagingPermissionPurpose.marketing]?.status,
        MessagingPermissionStatus.optedIn);
  });

  test('Stop all reaches the repository after fresh purpose re-opt-in', () async {
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('one')),
        messagingPermissionRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    container.listen(messagingPermissionsControllerProvider, (_, _) {});
    await flushTestEventQueue();
    const permission = MessagingPermission(
      organizerId: 'rsvp',
      organizerName: 'RSVP',
      status: MessagingPermissionStatus.optedOut,
      receiptId: 'fresh-ops',
      purposes: {
        MessagingPermissionPurpose.eventOperations: MessagingPurposeDecision(
          status: MessagingPermissionStatus.optedIn,
          receiptId: 'fresh-ops',
        ),
        MessagingPermissionPurpose.marketing: MessagingPurposeDecision(
          status: MessagingPermissionStatus.optedOut,
          receiptId: 'old-stop',
        ),
      },
    );
    repository.lists.last.complete(MessagingPermissionPage(
      catchPermission: _permission('catch'),
      organizers: const [permission],
      nextCursor: null,
    ));
    await container.read(messagingPermissionsControllerProvider.future);
    final action = container
        .read(messagingPermissionsControllerProvider.notifier)
        .withdraw('one', permission);
    expect(repository.withdrawals, hasLength(1));
    expect(repository.withdrawnPurposes.single, isNull);
    repository.withdrawals.single.$3.complete(
      permission.afterWithdrawal(null, 'stop-all'),
    );
    await action;
    final saved = container
        .read(messagingPermissionsControllerProvider)
        .requireValue.page.organizers.single;
    expect(saved.effectiveStatus, MessagingPermissionStatus.optedOut);
    expect(saved.purposes.values.every((row) =>
        row.status == MessagingPermissionStatus.optedOut), isTrue);
  });
}
