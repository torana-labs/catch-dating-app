import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_stakeholder_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

final _future = DateTime.now().millisecondsSinceEpoch + 86400000;

Map<String, Object?> _work() => {
  'programId': 'program-1',
  'organizerId': 'org',
  'title': 'Resolved program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'staff',
  'duties': [
    {
      'duty': 'stakeholderViewer',
      'pickupPointIds': <String>[],
      'hotelIds': <String>[],
      'expiresAtMillis': _future,
    },
  ],
  'grantExpiresAtMillis': _future,
  'capabilities': <String>[],
  'pickupPoints': <Map<String, Object?>>[],
  'functions': [
    {
      'functionId': 'fn-sangeet',
      'name': 'Sangeet',
      'venueName': 'Ballroom',
      'startsAtMillis': 0,
      'endsAtMillis': 7200000,
      'checkInEnabled': true,
      'status': 'scheduled',
      'expectedCount': 60,
      'checkedInCount': 12,
    },
  ],
  'hotels': [
    {'hotelId': 'hotel-taj', 'name': 'Taj Palace'},
  ],
  'vehicleClasses': <Map<String, Object?>>[],
};

const _counts = {
  'programId': 'program-1',
  'serverTimeMillis': 0,
  'accessExpiresAtMillis': null,
  'guestCount': 142,
  'householdCount': 58,
  'functions': [
    {
      'functionId': 'fn-sangeet',
      'status': 'scheduled',
      'invitedCount': 80,
      'rsvpPending': 12,
      'rsvpAttending': 50,
      'rsvpDeclined': 14,
      'rsvpMaybe': 4,
      'expectedHeads': 60,
      'checkedInHeads': 12,
      'noShowCount': 3,
    },
  ],
  'hotels': [
    {
      'hotelId': 'hotel-taj',
      'routedGuestCount': 40,
      'arrivedGuestCount': 31,
      'legCount': 14,
    },
  ],
};

class _Repository extends Fake implements ProgramWorkRepository {
  _Repository(this.store);

  final ProgramReadSnapshotStore store;
  Object? countsError;
  Map<String, Object?> counts = _counts;

  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async {
    final work = _work();
    await store.save(snapshotAccountId!, 'work:$programId', work);
    return ProgramWorkAccess.fromCallableData(work);
  }

  @override
  Future<ProgramStakeholderCounts> getStakeholderCounts(String programId) {
    final error = countsError;
    if (error != null) return Future.error(error);
    return Future.value(ProgramStakeholderCounts.fromCallableData(counts));
  }
}

Future<void> _pump(WidgetTester tester, _Repository repository) async {
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programReadSnapshotStoreProvider.overrideWithValue(repository.store),
        programWorkRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const ProgramStakeholderScreen(programId: 'program-1'),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  await tester.runAsync(flushTestEventQueue);
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets(
    'renders counts with function and hotel names joined from work access',
    (tester) async {
      final repository = _Repository(emptyProgramSnapshots());
      await _pump(tester, repository);
      expect(find.text('Sangeet', skipOffstage: false), findsOneWidget);
      expect(find.text('Taj Palace', skipOffstage: false), findsOneWidget);
      expect(find.text('142 GUESTS'), findsOneWidget);
      expect(find.text('58 HOUSEHOLDS'), findsOneWidget);
      expect(
        find.textContaining('of 80 invited', skipOffstage: false),
        findsOneWidget,
      );
      expect(
        find.textContaining('60 expected', skipOffstage: false),
        findsOneWidget,
      );
      expect(
        find.textContaining('31 of 40 guests arrived', skipOffstage: false),
        findsOneWidget,
      );
      expect(find.text('fn-sangeet'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('falls back to ids when access names are absent', (tester) async {
    final repository = _Repository(emptyProgramSnapshots());
    repository.counts = {
      ..._counts,
      'functions': [
        {...(_counts['functions']! as List).first as Map, 'functionId': 'fn-x'},
      ],
      'hotels': [
        {
          'hotelId': 'hotel-x',
          'routedGuestCount': 1,
          'arrivedGuestCount': 0,
          'legCount': 1,
        },
      ],
    };
    await _pump(tester, repository);
    expect(find.text('fn-x', skipOffstage: false), findsOneWidget);
    expect(find.text('hotel-x', skipOffstage: false), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('renders inline empty states for a program without scope', (
    tester,
  ) async {
    final repository = _Repository(emptyProgramSnapshots());
    repository.counts = {
      ..._counts,
      'functions': <Map<String, Object?>>[],
      'hotels': <Map<String, Object?>>[],
    };
    await _pump(tester, repository);
    expect(
      find.text('No functions on this program yet.', skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.text('No hotel-routed travel yet.', skipOffstage: false),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('renders the error state when the counts read fails', (
    tester,
  ) async {
    final repository = _Repository(emptyProgramSnapshots())
      ..countsError = const NetworkException('offline', 'Offline');
    await _pump(tester, repository);
    expect(find.text('Sangeet', skipOffstage: false), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
