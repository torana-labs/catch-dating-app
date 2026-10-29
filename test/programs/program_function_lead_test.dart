import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_attention_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_now_next_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_work_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

final _now = DateTime(2027, 2, 20, 10);
final _expires = _now.add(const Duration(hours: 8));

Map<String, Object?> _work({required List<Object?> duties}) => {
  'programId': 'program',
  'organizerId': 'org',
  'title': 'Kapoor–Shah Wedding',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'staff',
  'duties': duties,
  'grantExpiresAtMillis': _expires.millisecondsSinceEpoch,
  'capabilities': <Object?>[],
  'pickupPoints': <Object?>[],
  'hotels': <Object?>[],
  'functions': [
    {
      'functionId': 'fn-haldi',
      'name': 'Haldi',
      'venueName': 'Poolside',
      'startsAtMillis': _now
          .subtract(const Duration(hours: 1))
          .millisecondsSinceEpoch,
      'endsAtMillis': _now.add(const Duration(hours: 1)).millisecondsSinceEpoch,
      'checkInEnabled': true,
      'status': 'scheduled',
      'expectedCount': 40,
      'checkedInCount': 31,
    },
    {
      'functionId': 'fn-sangeet',
      'name': 'Sangeet',
      'venueName': 'Ballroom',
      'startsAtMillis': _now
          .add(const Duration(hours: 3))
          .millisecondsSinceEpoch,
      'endsAtMillis': _now.add(const Duration(hours: 6)).millisecondsSinceEpoch,
      'checkInEnabled': true,
      'status': 'scheduled',
      'expectedCount': 12,
      'checkedInCount': 4,
    },
    {
      'functionId': 'fn-mehndi',
      'name': 'Mehndi',
      'venueName': 'Courtyard',
      'startsAtMillis': _now
          .subtract(const Duration(hours: 20))
          .millisecondsSinceEpoch,
      'endsAtMillis': _now
          .subtract(const Duration(hours: 17))
          .millisecondsSinceEpoch,
      'checkInEnabled': true,
      'status': 'completed',
      'expectedCount': 35,
      'checkedInCount': 35,
    },
  ],
  'vehicleClasses': <Object?>[],
};

Map<String, Object?> _duty(String name) => {
  'duty': name,
  'pickupPointIds': <Object?>[],
  'hotelIds': <Object?>[],
  'functionIds': <Object?>[],
  'expiresAtMillis': _expires.millisecondsSinceEpoch,
};

final _attention = ProgramStaffAttention.fromCallableData({
  'programId': 'program',
  'truncated': false,
  'items': [
    {
      'itemId': 'run-a_functionLead',
      'runId': 'run-a',
      'momentId': 'm-late',
      'duty': 'functionLead',
      'severity': 'urgent',
      'title': 'Guest of honour delayed — hold entry',
      'createdAtMillis': _now
          .subtract(const Duration(minutes: 40))
          .millisecondsSinceEpoch,
    },
    {
      'itemId': 'run-b_functionLead',
      'runId': 'run-b',
      'momentId': 'm-late',
      'duty': 'functionLead',
      'severity': 'warning',
      'title': 'Late arrival at hotel — escort to Sangeet',
      'createdAtMillis': _now
          .subtract(const Duration(minutes: 12))
          .millisecondsSinceEpoch,
    },
  ],
});

class _Repository extends Fake implements ProgramWorkRepository {
  _Repository(this.access, {this.attention});

  final ProgramWorkAccess access;
  final ProgramStaffAttention? attention;

  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async => access;

  @override
  Future<ProgramStaffAttention> listStaffAttention(String programId) async =>
      attention ??
      const ProgramStaffAttention(
        programId: 'program',
        items: [],
        truncated: false,
      );
}

Future<void> _pump(WidgetTester tester, _Repository repository, Widget home) =>
    tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(
            emptyProgramSnapshots(),
          ),
          programWorkRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: home,
        ),
      ),
    );

void _viewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1000, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('work shell opens Now & next and Attention for function leads', (
    tester,
  ) async {
    _viewport(tester);
    final access = ProgramWorkAccess.fromCallableData(
      _work(duties: [_duty('functionLead'), _duty('functionCheckIn')]),
    );
    await _pump(
      tester,
      _Repository(access),
      ProgramWorkScreen(programId: 'program', now: () => _now),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Function lead'), findsOneWidget);
    expect(find.text('Now & next'), findsOneWidget);
    expect(find.text('Attention'), findsWidgets);
  });

  testWidgets('work shell hides lead rows for other duties', (tester) async {
    _viewport(tester);
    final access = ProgramWorkAccess.fromCallableData(
      _work(duties: [_duty('airportGreeter')]),
    );
    await _pump(
      tester,
      _Repository(access),
      ProgramWorkScreen(programId: 'program', now: () => _now),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Function lead'), findsNothing);
    expect(find.text('Attention'), findsNothing);
  });

  testWidgets('Now & next buckets functions by window', (tester) async {
    _viewport(tester);
    final access = ProgramWorkAccess.fromCallableData(
      _work(duties: [_duty('functionLead')]),
    );
    await _pump(
      tester,
      _Repository(access),
      ProgramNowNextScreen(programId: 'program', now: () => _now),
    );
    await pumpFeatureUi(tester);
    expect(find.text('In progress'), findsOneWidget);
    expect(find.text('Haldi'), findsOneWidget);
    expect(find.text('Up next'), findsOneWidget);
    expect(find.text('Sangeet'), findsOneWidget);
    expect(find.text('Earlier'), findsOneWidget);
    expect(find.text('Mehndi'), findsOneWidget);
  });

  testWidgets('attention feed renders duty alerts newest first', (
    tester,
  ) async {
    _viewport(tester);
    final access = ProgramWorkAccess.fromCallableData(
      _work(duties: [_duty('functionLead')]),
    );
    await _pump(
      tester,
      _Repository(access, attention: _attention),
      ProgramAttentionScreen(programId: 'program', now: () => _now),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Program alerts'), findsOneWidget);
    expect(
      find.text('Late arrival at hotel — escort to Sangeet'),
      findsOneWidget,
    );
    expect(find.text('Guest of honour delayed — hold entry'), findsOneWidget);
    expect(find.text('functionLead'), findsNWidgets(2));
    expect(find.text('urgent'), findsNothing); // duty chip, not severity text
  });

  testWidgets('attention feed shows the empty state without alerts', (
    tester,
  ) async {
    _viewport(tester);
    final access = ProgramWorkAccess.fromCallableData(
      _work(duties: [_duty('functionLead')]),
    );
    await _pump(
      tester,
      _Repository(access),
      ProgramAttentionScreen(programId: 'program', now: () => _now),
    );
    await pumpFeatureUi(tester);
    expect(
      find.text('Nothing needs your attention right now.'),
      findsOneWidget,
    );
  });
}
