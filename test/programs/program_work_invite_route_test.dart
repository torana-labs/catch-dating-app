import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_work_screen.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

const _work = {
  'programId': 'resolved-program',
  'organizerId': 'org',
  'title': 'Resolved program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'manager',
  'duties': [],
  'grantExpiresAtMillis': null,
  'capabilities': ['arrivalsTransport'],
  'pickupPoints': [],
    'functions': [],
  'hotels': [],
  'vehicleClasses': [],
};

class _Repository extends Fake implements ProgramWorkRepository {
  _Repository(this.store);
  final ProgramReadSnapshotStore store;
  final claim = Completer<String>();
  var claims = 0;
  var online = true;

  @override
  Future<String> claimStaffInvite(String inviteId) {
    claims++;
    return claim.future;
  }

  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async {
    if (!online) throw const NetworkException('offline', 'Offline');
    await store.save(snapshotAccountId!, 'work:$programId', _work);
    return ProgramWorkAccess.fromCallableData(_work);
  }
}

Future<GoRouter> _pumpWorkspace(
  WidgetTester tester,
  _Repository repository,
) async {
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const Scaffold(body: Text('Previous route')),
      ),
      GoRoute(
        path: Routes.hostWorkProgramScreen.path,
        name: Routes.hostWorkProgramScreen.name,
        builder: (_, state) => ProgramWorkScreen(
          programId: state.pathParameters['programId']!,
          inviteId: state.uri.queryParameters['invite'],
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programReadSnapshotStoreProvider.overrideWithValue(repository.store),
        programWorkRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        routerConfig: router,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ),
  );
  return router;
}

void main() {
  testWidgets(
    'a successful invite replaces its URL and reopens offline without a claim',
    (tester) async {
      final store = emptyProgramSnapshots();
      final repository = _Repository(store);
      final router = await _pumpWorkspace(tester, repository);
      unawaited(
        router.pushNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': 'link-program'},
          queryParameters: {'invite': 'one-time-invite'},
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(repository.claims, 1);
      expect(router.state.uri.queryParameters, {'invite': 'one-time-invite'});
      await tester.runAsync(() async {
        repository.claim.complete('resolved-program');
        await flushTestEventQueue();
      });
      await pumpFeatureUi(tester);
      await tester.runAsync(flushTestEventQueue);
      await pumpFeatureUi(tester);
      expect(find.text('Resolved program'), findsOneWidget);
      expect(router.state.uri.path, '/host/work/resolved-program');
      expect(router.state.uri.queryParameters, isEmpty);
      expect(router.canPop(), isTrue);
      router.pop();
      await pumpFeatureUi(tester);
      expect(find.text('Previous route'), findsOneWidget);
      final claimsAfterEntry = repository.claims;
      repository.online = false;
      unawaited(
        router.pushNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': 'resolved-program'},
        ),
      );
      await tester.pump();
      await tester.runAsync(flushTestEventQueue);
      await pumpFeatureUi(tester);
      expect(find.text('Resolved program'), findsOneWidget);
      expect(repository.claims, claimsAfterEntry);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('a rejected invite keeps its URL for retry', (tester) async {
    final repository = _Repository(emptyProgramSnapshots());
    final router = await _pumpWorkspace(tester, repository);
    unawaited(
      router.pushNamed(
        Routes.hostWorkProgramScreen.name,
        pathParameters: {'programId': 'link-program'},
        queryParameters: {'invite': 'rejected-invite'},
      ),
    );
    await tester.pump();
    await tester.runAsync(() async {
      repository.claim.completeError(const PermissionException('Revoked'));
      await flushTestEventQueue();
    });
    await pumpFeatureUi(tester);
    expect(router.state.uri.queryParameters, {'invite': 'rejected-invite'});
    expect(find.byType(ProgramWorkPageBody), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('leaving a pending invite prevents a late route replacement', (
    tester,
  ) async {
    final repository = _Repository(emptyProgramSnapshots());
    final router = await _pumpWorkspace(tester, repository);
    unawaited(
      router.pushNamed(
        Routes.hostWorkProgramScreen.name,
        pathParameters: {'programId': 'link-program'},
        queryParameters: {'invite': 'late-invite'},
      ),
    );
    await tester.pump();
    router.pop();
    await pumpFeatureUi(tester);
    await tester.runAsync(() async {
      repository.claim.complete('resolved-program');
      await flushTestEventQueue();
    });
    await pumpFeatureUi(tester);
    expect(find.text('Previous route'), findsOneWidget);
    expect(router.state.uri.path, '/');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
