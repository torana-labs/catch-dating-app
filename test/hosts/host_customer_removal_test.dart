import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_loading_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

import '../clubs/clubs_test_helpers.dart';
import '../test_pump_helpers.dart';

const _actor = 'host-1';
const _organizer = 'organizer-1';
const _otherOrganizer = 'organizer-2';
const _key = (actorUid: _actor, organizerId: _organizer, contactId: 'a');
final _copy = AppLocalizationsEn();

void main() {
  setUpAll(() => initializeDateFormatting('en'));
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  test(
    'controller deduplicates exact requests but never changed revisions',
    () async {
      final repository = _RemovalRepository();
      final controller = HostCustomersController(repository);
      final first = controller.removeCustomer(key: _key, expectedRevision: 1);
      expect(
        controller.removeCustomer(key: _key, expectedRevision: 1),
        same(first),
      );
      await expectLater(
        controller.removeCustomer(key: _key, expectedRevision: 2),
        throwsStateError,
      );
      expect(repository.removals, [(_organizer, 'a', 1)]);
      repository.acknowledge();
      await first;
    },
  );

  test(
    'failed request cleans up and another organizer remains independent',
    () async {
      final repository = _RemovalRepository();
      final controller = HostCustomersController(repository);
      final first = controller.removeCustomer(key: _key, expectedRevision: 1);
      final failure = expectLater(first, throwsStateError);
      final other = controller.removeCustomer(
        key: (actorUid: _actor, organizerId: _otherOrganizer, contactId: 'a'),
        expectedRevision: 1,
      );
      repository.pending[0].completeError(StateError('rejected'));
      await failure;
      repository.acknowledge(index: 1);
      await other;
      final retry = controller.removeCustomer(key: _key, expectedRevision: 2);
      expect(repository.removals.last, (_organizer, 'a', 2));
      repository.acknowledge(index: 2);
      await retry;
    },
  );

  for (final layout in [
    (width: 390.0, predecessor: false),
    (width: 1400.0, predecessor: false),
    (width: 1400.0, predecessor: true),
  ]) {
    testWidgets('embedded acknowledgement clears only A at $layout', (
      tester,
    ) async {
      final harness = await _pumpRemoval(
        tester,
        width: layout.width,
        predecessor: layout.predecessor,
      );
      final history = harness.container.listen(
        hostAudienceContactHistoryProvider(_organizer, 'a'),
        (_, _) {},
      );
      addTearDown(history.close);
      await pumpFeatureUi(tester);
      await _confirmRemoval(tester);
      expect(harness.repository.removals, [(_organizer, 'a', 1)]);
      expect(harness.router.state.uri.queryParameters['contactId'], 'a');
      expect(_notices(harness), isEmpty);

      harness.repository.acknowledge();
      await pumpFeatureUi(tester);
      expect(harness.router.state.uri.path, Routes.hostAudienceScreen.path);
      expect(
        harness.router.state.uri.queryParameters.containsKey('contactId'),
        isFalse,
      );
      expect(find.byType(HostCustomerDetailScreen), findsNothing);
      expect(harness.repository.hidden, {(_organizer, 'a')});
      expect(harness.repository.historyReads, 2);
      expect(harness.repository.summaryReads, 2);
      expect(harness.repository.countReads, 2);
      expect(harness.repository.directoryReads, 2);
      expect(_notices(harness).single.tone, CatchNoticeTone.success);
      expect(_notices(harness).single.title, 'Person a removed.');
      expect(find.text('Predecessor'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('cancel and rejected hide retain the detail truthfully', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    await _openRemoval(tester);
    await tester.tap(find.text(_copy.coreCatchAdaptiveDialogVisiblecopyCancel));
    await pumpFeatureUi(tester);
    expect(harness.repository.removals, isEmpty);
    await _confirmRemoval(tester);
    harness.repository.pending.single.completeError(StateError('rejected'));
    await pumpFeatureUi(tester);
    expect(harness.router.state.uri.queryParameters['contactId'], 'a');
    expect(find.byType(HostCustomerDetailScreen), findsOneWidget);
    expect(harness.repository.hidden, isEmpty);
    expect(_notices(harness).single.tone, CatchNoticeTone.danger);
    expect(harness.repository.directoryReads, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('removal rejection is not replayed by rebuild and can retry', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    await _confirmRemoval(tester);
    harness.repository.pending.single.completeError(StateError('rejected'));
    await pumpFeatureUi(tester);
    expect(_notices(harness).single.tone, CatchNoticeTone.danger);
    harness.container.read(catchNoticeControllerProvider.notifier).clear();
    harness.container.invalidate(
      hostAudienceContactDetailProvider(_organizer, 'a'),
    );
    await pumpFeatureUi(tester);
    expect(_notices(harness), isEmpty);
    await _confirmRemoval(tester);
    expect(harness.repository.removals, hasLength(2));
    harness.repository.acknowledge(index: 1);
    await pumpFeatureUi(tester);
    expect(_notices(harness).single.tone, CatchNoticeTone.success);
    expect(tester.takeException(), isNull);
  });

  testWidgets('reentry cannot consume a departed removal rejection', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    await _confirmRemoval(tester);
    harness.router.go('/elsewhere');
    await pumpFeatureUi(tester);
    harness.router.go(_peopleLocation());
    await pumpFeatureUi(tester);
    harness.repository.pending.single.completeError(
      StateError('late rejection'),
    );
    await pumpFeatureUi(tester);
    expect(harness.repository.removals, hasLength(1));
    expect(harness.router.state.uri.queryParameters['contactId'], 'a');
    expect(_notices(harness), isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('saved duplicate callbacks cannot overlap confirmation or hide', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    final detailFinder = find.byType(HostCustomerDetailScreen);
    final originalState = tester.state(detailFinder);
    final originalUri = harness.router.state.uri;
    void expectOriginalScope() {
      expect(tester.state(detailFinder), same(originalState));
      expect(harness.router.state.uri, originalUri);
      expect(harness.container.read(uidProvider).asData?.value, _actor);
      expect(harness.auth.currentUser?.uid, _actor);
      final detail = tester.widget<HostCustomerDetailScreen>(detailFinder);
      expect(detail.organizerId, _organizer);
      expect(detail.contactId, 'a');
    }

    expectOriginalScope();
    final repeat = _savedRemovalCallback(tester);
    // Programmatic duplicate probe is separate from the pointer-path cases.
    repeat();
    repeat();
    await pumpFeatureUi(tester);
    final title = find.text(_copy.hostsHostAudienceRemoveTitle);
    expect(title, findsOneWidget);
    expectOriginalScope();
    expect(harness.repository.removals, isEmpty);
    final dialogRoute = ModalRoute.of(tester.element(title))!;
    Object? confirmationResult;
    unawaited(
      dialogRoute.popped.then<void>((result) => confirmationResult = result),
    );
    expect(
      find.text(_copy.hostsHostAudienceRemoveConfirm).hitTestable(),
      findsOneWidget,
    );
    await _acceptRemoval(tester);
    expect(confirmationResult, isTrue);
    expect(title, findsNothing);
    expectOriginalScope();
    final mutation = harness.container.read(
      HostCustomersController.removeMutation(_key),
    );
    expect(mutation.isPending, isTrue, reason: 'Mutation state: $mutation');
    expect(_notices(harness), isEmpty);
    repeat();
    await tester.pump();
    expect(harness.repository.removals, hasLength(1));
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
  });

  for (final change in ['actor', 'organizer']) {
    testWidgets('saved callback cannot become a new $change action', (
      tester,
    ) async {
      final harness = await _pumpRemoval(tester);
      final stale = _savedRemovalCallback(tester);
      await _changeScope(tester, harness, change);
      await _changeScope(tester, harness, change, restore: true);
      stale();
      await pumpFeatureUi(tester);
      expect(find.text(_copy.hostsHostAudienceRemoveTitle), findsNothing);
      expect(harness.repository.removals, isEmpty);
    });
    testWidgets('$change ABA during confirmation cannot dispatch old hide', (
      tester,
    ) async {
      final harness = await _pumpRemoval(tester);
      await _openRemoval(tester);
      await _changeScope(tester, harness, change);
      await _changeScope(tester, harness, change, restore: true);
      await _acceptRemoval(tester);
      expect(harness.repository.removals, isEmpty);
      expect(_notices(harness), isEmpty);
    });
    for (final reject in [false, true]) {
      testWidgets(
        '$change ABA suppresses acknowledged ${reject ? 'failure' : 'success'}',
        (tester) async {
          final harness = await _pumpRemoval(tester);
          await _confirmRemoval(tester);
          await _changeScope(tester, harness, change);
          await _changeScope(tester, harness, change, restore: true);
          final reads = harness.repository.directoryReads;
          if (reject) {
            harness.repository.pending.single.completeError(
              StateError('late failure'),
            );
          } else {
            harness.repository.acknowledge();
          }
          await pumpFeatureUi(tester);
          expect(harness.router.state.uri.queryParameters['contactId'], 'a');
          expect(_notices(harness), isEmpty);
          if (change == 'actor' || reject) {
            expect(harness.repository.directoryReads, reads);
          }
        },
      );
      testWidgets(
        '$change switch suppresses late ${reject ? 'failure' : 'success'}',
        (tester) async {
          final harness = await _pumpRemoval(tester);
          await _confirmRemoval(tester);
          await _changeScope(tester, harness, change);
          if (reject) {
            harness.repository.pending.single.completeError(
              StateError('late failure'),
            );
          } else {
            harness.repository.acknowledge();
          }
          await pumpFeatureUi(tester);
          expect(harness.router.state.uri.queryParameters['contactId'], 'a');
          expect(_notices(harness), isEmpty);
          final detail = tester.widget<HostCustomerDetailScreen>(
            find.byType(HostCustomerDetailScreen),
          );
          expect(
            detail.organizerId,
            change == 'organizer' ? _otherOrganizer : _organizer,
          );
        },
      );
    }
  }

  testWidgets(
    'live auth mismatch before confirmation blocks stale streamed actor',
    (tester) async {
      final harness = await _pumpRemoval(tester);
      final stale = _savedRemovalCallback(tester);
      harness.auth.uid = 'host-2';
      stale();
      await pumpFeatureUi(tester);
      expect(find.text(_copy.hostsHostAudienceRemoveTitle), findsNothing);
      expect(harness.repository.removals, isEmpty);
    },
  );

  testWidgets('live auth mismatch after confirmation blocks dispatch', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    await _openRemoval(tester);
    harness.auth.uid = 'host-2';
    await _acceptRemoval(tester);
    expect(harness.container.read(uidProvider).requireValue, _actor);
    expect(harness.repository.removals, isEmpty);
  });

  for (final reject in [false, true]) {
    testWidgets(
      'live auth mismatch suppresses late ${reject ? 'failure' : 'success'} and cache refresh',
      (tester) async {
        final harness = await _pumpRemoval(tester);
        await _confirmRemoval(tester);
        harness.auth.uid = 'host-2';
        if (reject) {
          harness.repository.pending.single.completeError(
            StateError('late rejection'),
          );
        } else {
          harness.repository.acknowledge();
        }
        await pumpFeatureUi(tester);
        expect(_notices(harness), isEmpty);
        expect(harness.repository.directoryReads, 1);
        expect(harness.router.state.uri.queryParameters['contactId'], 'a');
      },
    );
  }

  testWidgets(
    'organizer B can remove independently while organizer A is pending',
    (tester) async {
      final harness = await _pumpRemoval(tester);
      await _confirmRemoval(tester);
      await _changeScope(tester, harness, 'organizer');
      await _confirmRemoval(tester);
      expect(harness.repository.removals, [
        (_organizer, 'a', 1),
        (_otherOrganizer, 'a', 1),
      ]);
      harness.repository.acknowledge();
      await pumpFeatureUi(tester);
      expect(_notices(harness), isEmpty);
      harness.repository.acknowledge(index: 1);
      await pumpFeatureUi(tester);
      expect(
        harness.router.state.uri.queryParameters['organizerId'],
        _otherOrganizer,
      );
      expect(
        harness.router.state.uri.queryParameters.containsKey('contactId'),
        isFalse,
      );
      expect(_notices(harness).single.tone, CatchNoticeTone.success);
    },
  );

  testWidgets('late A completion never clears newly selected B', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester);
    await _confirmRemoval(tester);
    harness.router.go(_peopleLocation(contactId: 'b'));
    await pumpFeatureUi(tester);
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
    expect(harness.router.state.uri.queryParameters['contactId'], 'b');
    expect(
      tester
          .widget<HostCustomerDetailScreen>(
            find.byType(HostCustomerDetailScreen),
          )
          .contactId,
      'b',
    );
    expect(_notices(harness), isEmpty);
    expect(harness.repository.hidden, {(_organizer, 'a')});
  });

  testWidgets(
    'departure and reentry retain pending dedupe without replaying success',
    (tester) async {
      final harness = await _pumpRemoval(tester);
      await _confirmRemoval(tester);
      harness.router.go('/elsewhere');
      await pumpFeatureUi(tester);
      harness.router.go(_peopleLocation());
      await pumpFeatureUi(tester);
      _savedRemovalCallback(tester)();
      await tester.pump();
      expect(harness.repository.removals, hasLength(1));
      expect(find.text(_copy.hostsHostAudienceRemoveTitle), findsNothing);
      harness.repository.acknowledge();
      await pumpFeatureUi(tester);
      expect(_notices(harness), isEmpty);
      expect(harness.router.state.uri.queryParameters['contactId'], 'a');
      expect(
        harness.repository.overviewReads[(_organizer, 'a')],
        greaterThanOrEqualTo(3),
      );
    },
  );

  testWidgets('standalone removal pops only its acknowledged current route', (
    tester,
  ) async {
    final harness = await _pumpRemoval(
      tester,
      standalone: true,
      predecessor: true,
    );
    await _confirmRemoval(tester);
    expect(find.text('Predecessor'), findsNothing);
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
    expect(find.text('Predecessor'), findsOneWidget);
    expect(_notices(harness).single.tone, CatchNoticeTone.success);
  });

  testWidgets('standalone root returns to Audience after acknowledgement', (
    tester,
  ) async {
    final harness = await _pumpRemoval(tester, standalone: true);
    await _confirmRemoval(tester);
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
    expect(harness.router.state.uri.path, Routes.hostAudienceScreen.path);
    expect(harness.router.state.uri.queryParameters['organizerId'], _organizer);
    expect(find.byType(HostCustomerDetailScreen), findsNothing);
    expect(_notices(harness).single.tone, CatchNoticeTone.success);
  });

  testWidgets(
    'covered then restored same State cannot consume an old acknowledgement',
    (tester) async {
      final harness = await _pumpRemoval(
        tester,
        standalone: true,
        predecessor: true,
      );
      final state = tester.state(find.byType(HostCustomerDetailScreen));
      await _confirmRemoval(tester);
      unawaited(harness.router.push<void>('/elsewhere'));
      await pumpFeatureUi(tester);
      harness.router.pop();
      await pumpFeatureUi(tester);
      expect(tester.state(find.byType(HostCustomerDetailScreen)), same(state));
      harness.repository.acknowledge();
      await pumpFeatureUi(tester);
      expect(harness.router.state.uri.path, '/detail');
      expect(_notices(harness), isEmpty);
    },
  );

  testWidgets('departed standalone completion cannot pop the new route', (
    tester,
  ) async {
    final harness = await _pumpRemoval(
      tester,
      standalone: true,
      predecessor: true,
    );
    await _confirmRemoval(tester);
    harness.router.go('/elsewhere');
    await pumpFeatureUi(tester);
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
    expect(find.text('Elsewhere'), findsOneWidget);
    expect(_notices(harness), isEmpty);
  });

  testWidgets('post-ack navigation error is not reported as failed removal', (
    tester,
  ) async {
    final harness = await _pumpRemoval(
      tester,
      standalone: true,
      onBack: () => throw StateError('navigation failed'),
    );
    await _confirmRemoval(tester);
    harness.repository.acknowledge();
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isStateError);
    expect(_notices(harness).single.tone, CatchNoticeTone.success);
    expect(harness.repository.removals, hasLength(1));
    expect(harness.repository.hidden, {(_organizer, 'a')});
  });
}

typedef _Harness = ({
  GoRouter router,
  ProviderContainer container,
  _RemovalRepository repository,
  StreamController<String?> actors,
  _Auth auth,
});

String _peopleLocation({String contactId = 'a'}) => Uri(
  path: Routes.hostAudienceScreen.path,
  queryParameters: {'organizerId': _organizer, 'contactId': contactId},
).toString();

Future<_Harness> _pumpRemoval(
  WidgetTester tester, {
  double width = 1400,
  bool predecessor = false,
  bool standalone = false,
  VoidCallback? onBack,
}) async {
  tester.view.physicalSize = Size(width, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final repository = _RemovalRepository();
  final auth = _Auth();
  final actors = StreamController<String?>();
  addTearDown(actors.close);
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => actors.stream),
      firebaseAuthProvider.overrideWithValue(auth),
      hostContactsRepositoryProvider.overrideWithValue(repository),
      for (final uid in [_actor, 'host-2'])
        hostOperableClubsProvider(uid).overrideWithValue(
          AsyncData([
            buildClub(id: _organizer, ownerUserId: uid),
            buildClub(id: _otherOrganizer, ownerUserId: uid),
          ]),
        ),
      for (final org in [_organizer, _otherOrganizer]) ...[
        hostMessagingSetupProvider(org).overrideWithValue(const AsyncLoading()),
        for (final contact in ['a', 'b'])
          hostCommunicationPlanProvider(org, contact).overrideWithValue(
            AsyncError(
              StateError('optional messaging unavailable'),
              StackTrace.empty,
            ),
          ),
      ],
    ],
  );
  addTearDown(container.dispose);
  final location = standalone ? '/detail' : _peopleLocation();
  final router = GoRouter(
    initialLocation: predecessor ? '/' : location,
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const Scaffold(body: Text('Predecessor')),
      ),
      GoRoute(
        path: '/elsewhere',
        builder: (_, _) => const Scaffold(body: Text('Elsewhere')),
      ),
      GoRoute(
        path: '/detail',
        builder: (_, _) => HostCustomerDetailScreen(
          organizerId: _organizer,
          contactId: 'a',
          onBack: onBack,
        ),
      ),
      GoRoute(
        path: Routes.hostAudienceScreen.path,
        name: Routes.hostAudienceScreen.name,
        builder: (_, state) => hostAudienceScreenForUri(state.uri),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: AppTheme.light,
        routerConfig: router,
        builder: catchNoticeOverlayBuilder,
      ),
    ),
  );
  actors.add(_actor);
  await pumpFeatureUi(tester);
  if (predecessor) {
    unawaited(router.push<void>(location));
    await pumpFeatureUi(tester);
  }
  expect(find.byType(HostCustomerDetailScreen), findsOneWidget);
  return (
    router: router,
    container: container,
    repository: repository,
    actors: actors,
    auth: auth,
  );
}

List<CatchNoticeData> _notices(_Harness harness) =>
    harness.container.read(catchNoticeControllerProvider).notices;

Future<void> _changeScope(
  WidgetTester tester,
  _Harness harness,
  String change, {
  bool restore = false,
}) async {
  if (change == 'actor') {
    harness.auth.uid = restore ? _actor : 'host-2';
    harness.actors.add(restore ? _actor : 'host-2');
  } else {
    harness.container
        .read(hostOrganizerSelectionProvider(_actor).notifier)
        .select(restore ? _organizer : _otherOrganizer);
  }
  await pumpFeatureUi(tester);
}

class _Auth extends Fake implements FirebaseAuth {
  String? uid = _actor;
  @override
  User? get currentUser => uid == null ? null : _User(uid!);
}

class _User extends Fake implements User {
  _User(this.uid);
  @override
  final String uid;
}

VoidCallback _savedRemovalCallback(WidgetTester tester) {
  final menu = tester.widget<CatchActionMenu<dynamic>>(
    find.byKey(const ValueKey('host-customer-record-actions')),
  );
  final remove = menu.items.singleWhere(
    (item) => item.label == _copy.hostsHostAudienceRemoveAction,
  );
  // Erase the private enum only at this inspection boundary, then retain the
  // original callback and value across later actor or organizer changes.
  final callback = (menu as dynamic).onSelected as Function;
  final Object? value = remove.value;
  return () => Function.apply(callback, [value]);
}

Future<void> _openRemoval(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('host-customer-record-actions')));
  await pumpFeatureUi(tester);
  await tester.tap(find.text(_copy.hostsHostAudienceRemoveAction));
  await pumpFeatureUi(tester);
  expect(find.text(_copy.hostsHostAudienceRemoveTitle), findsOneWidget);
}

Future<void> _acceptRemoval(WidgetTester tester) async {
  await tester.tap(find.text(_copy.hostsHostAudienceRemoveConfirm));
  await pumpFeatureUi(tester);
}

Future<void> _confirmRemoval(WidgetTester tester) async {
  await _openRemoval(tester);
  await _acceptRemoval(tester);
}

class _RemovalRepository extends Fake implements HostContactsRepository {
  final removals = <(String, String, int)>[];
  final pending = <Completer<void>>[];
  final hidden = <(String, String)>{};
  final overviewReads = <(String, String), int>{};
  var historyReads = 0;
  var summaryReads = 0;
  var countReads = 0;
  var directoryReads = 0;

  void acknowledge({int index = 0}) {
    final request = removals[index];
    hidden.add((request.$1, request.$2));
    pending[index].complete();
  }

  @override
  Future<void> mutateContact({
    required String organizerId,
    required String contactId,
    required int expectedRevision,
    String? displayNameOverride,
    bool clearDisplayNameOverride = false,
    String? phoneE164,
    bool updatePhoneE164 = false,
    String? email,
    bool updateEmail = false,
    bool? whatsappAdminSuppressed,
    bool? hidden,
    List<String>? manualTags,
  }) {
    // This callback can resume while the tester is pumping the dialog.
    expectSync(hidden, isTrue);
    removals.add((organizerId, contactId, expectedRevision));
    final result = Completer<void>();
    pending.add(result);
    return result.future;
  }

  HostAudienceContactDetail _detail(String organizerId, String contactId) =>
      hostCustomerSkeletonDetail(
        organizerId: organizerId,
        contactId: contactId,
        displayName: 'Person $contactId',
        manualTagLabel: 'Fixture tag',
        noteBody: 'Fixture note',
      );

  @override
  Future<HostAudienceContactDetail> getContactOverview(
    String organizerId,
    String contactId,
  ) async {
    overviewReads.update(
      (organizerId, contactId),
      (value) => value + 1,
      ifAbsent: () => 1,
    );
    if (hidden.contains((organizerId, contactId))) {
      throw StateError('Contact removed');
    }
    return _detail(organizerId, contactId);
  }

  @override
  Future<HostAudienceContactDetail> getContactDetail(
    String organizerId,
    String contactId,
  ) async {
    historyReads++;
    if (hidden.contains((organizerId, contactId))) {
      throw StateError('Contact removed');
    }
    return _detail(organizerId, contactId);
  }

  int _count(String organizerId) =>
      ['a', 'b'].where((id) => !hidden.contains((organizerId, id))).length;

  @override
  Future<HostCrmSummary> getSummary(String organizerId) async {
    summaryReads++;
    return HostCrmSummary(
      organizerId: organizerId,
      contactCount: _count(organizerId),
      pastAttendeeCount: 0,
      repeatAttendeeCount: 0,
      linkedAccountCount: 0,
      importedContactCount: 0,
      whatsappOptInCount: 0,
      smsOptInCount: 0,
      truncated: false,
      inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
      whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
      smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
    );
  }

  @override
  Future<({int count, HostAudienceMatchCountCoverage coverage})> countContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async {
    countReads++;
    return (
      count: _count(organizerId),
      coverage: HostAudienceMatchCountCoverage.exact,
    );
  }

  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    directoryReads++;
    return HostAudiencePage(
      organizerId: organizerId,
      contacts: [
        for (final id in ['a', 'b'])
          if (!hidden.contains((organizerId, id)))
            HostAudienceContact(
              contactId: id,
              displayName: 'Person $id',
              phoneE164: null,
              email: null,
              identityState: HostAudienceIdentityState.unlinked,
              identityConfidence: 'unverified',
              ambiguousCandidateCount: 0,
              attendedEventCount: 0,
              expectedEventCount: 0,
              lastAttendedAt: null,
              segments: const {},
              whatsappStatus: HostAudiencePermissionStatus.unknown,
              whatsappAdminSuppressed: false,
              smsStatus: HostAudiencePermissionStatus.unknown,
              sourceCoverage: HostAudienceSourceCoverage.exact,
              revision: 1,
            ),
      ],
      nextCursor: null,
      matchCount: _count(organizerId),
      matchCountCoverage: HostAudienceMatchCountCoverage.exact,
      sourceCoverage: HostAudienceSourceCoverage.exact,
      projectionVersion: 1,
    );
  }
}
