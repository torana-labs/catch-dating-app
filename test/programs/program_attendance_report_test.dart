import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_attendance_export.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_attendance_report_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';

const _access = {
  'programId': 'program',
  'organizerId': 'org',
  'title': 'Kapoor Wedding',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'manager',
  'duties': [],
  'grantExpiresAtMillis': null,
  'capabilities': ['functions'],
  'pickupPoints': [],
  'functions': [
    {
      'functionId': 'fn_sangeet',
      'name': 'Sangeet',
      'startsAtMillis': 1735750800000,
      'endsAtMillis': 1735761600000,
      'venueName': 'Lake Palace',
      'status': 'scheduled',
      'checkInEnabled': true,
      'expectedCount': 80,
      'checkedInCount': 61,
    },
    {
      'functionId': 'fn_reception',
      'name': 'Reception',
      'startsAtMillis': 1735840800000,
      'endsAtMillis': 1735851600000,
      'venueName': 'Grand Lawn',
      'status': 'scheduled',
      'checkInEnabled': true,
      'expectedCount': 58,
      'checkedInCount': 35,
    },
  ],
  'hotels': [],
  'vehicleClasses': [],
};

Map<String, Object?> _functionData({
  String functionId = 'fn_sangeet',
  int invitedGuests = 80,
  int attendingGuests = 66,
  int checkedInGuests = 61,
  int noShowGuests = 2,
  int walkInGuests = 1,
  List<String> invitedNoResponse = const ['g_21', 'g_34', 'g_40'],
  List<String> declinedCheckedIn = const ['g_55'],
  List<String> noShows = const ['g_61', 'g_62'],
  List<String> walkIns = const ['g_90'],
}) => {
  'functionId': functionId,
  'invitedGuests': invitedGuests,
  'respondedGuests': 74,
  'attendingGuests': attendingGuests,
  'attendingHeads': 92,
  'maybeGuests': 5,
  'declinedGuests': 3,
  'noResponseGuests': 6,
  'checkedInGuests': checkedInGuests,
  'checkedInHeads': 84,
  'noShowGuests': noShowGuests,
  'expectedGuests': 63,
  'walkInGuests': walkInGuests,
  'walkInHeads': walkInGuests,
  'exceptions': {
    'invitedNoResponseGuestIds': invitedNoResponse,
    'declinedCheckedInGuestIds': declinedCheckedIn,
    'noShowGuestIds': noShows,
    'walkInGuestIds': walkIns,
  },
};

Map<String, Object?> _reportData({List<Map<String, Object?>>? functions}) => {
  'programId': 'program',
  'serverTimeMillis': DateTime(2026).millisecondsSinceEpoch,
  'accessExpiresAtMillis': null,
  'programGuests': 142,
  'programInvitedGuests': 138,
  'programAttendingGuests': 117,
  'programCheckedInGuests': 96,
  'programNoShowGuests': 4,
  'functions':
      functions ??
      [
        _functionData(),
        _functionData(
          functionId: 'fn_reception',
          invitedGuests: 58,
          attendingGuests: 51,
          checkedInGuests: 35,
          walkInGuests: 0,
          invitedNoResponse: const [],
          declinedCheckedIn: const [],
          noShows: const [],
          walkIns: const [],
        ),
      ],
};

class _Repository extends Fake implements ProgramWorkRepository {
  _Repository(this.store);

  final ProgramReadSnapshotStore store;
  Object? error;
  Map<String, Object?>? report;

  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async {
    await store.save(snapshotAccountId!, 'work:$programId', _access);
    return ProgramWorkAccess.fromCallableData(_access);
  }

  @override
  Future<ProgramAttendanceReport> getAttendanceReport(String programId) async {
    if (error case final failure?) throw failure;
    return ProgramAttendanceReport.fromCallableData(report ?? _reportData());
  }
}

Future<void> _pumpReport(
  WidgetTester tester,
  _Repository repository,
  ProgramReadSnapshotStore store,
) async {
  tester.view.physicalSize = const Size(1000, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programReadSnapshotStoreProvider.overrideWithValue(store),
        programWorkRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const ProgramAttendanceReportScreen(programId: 'program'),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  late SharedPreferencesProgramReadSnapshotStore store;
  late _Repository repository;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    store = SharedPreferencesProgramReadSnapshotStore();
    repository = _Repository(store);
  });

  test('report requires program totals and per-function fields', () {
    for (final field in [
      'programGuests',
      'programInvitedGuests',
      'programCheckedInGuests',
    ]) {
      final data = _reportData()..remove(field);
      expect(
        () => ProgramAttendanceReport.fromCallableData(data),
        throwsFormatException,
      );
    }
    final broken = _reportData(
      functions: [_functionData()..remove('checkedInGuests')],
    );
    expect(
      () => ProgramAttendanceReport.fromCallableData(broken),
      throwsFormatException,
    );
  });

  testWidgets('renders program totals, joined names, and exception badges', (
    tester,
  ) async {
    await _pumpReport(tester, repository, store);
    expect(find.text('138 INVITED'), findsOneWidget);
    expect(find.text('117 ATTENDING'), findsOneWidget);
    expect(find.text('96 CHECKED IN'), findsOneWidget);
    expect(find.text('4 NO-SHOW'), findsOneWidget);
    expect(find.text('Sangeet'), findsOneWidget);
    expect(find.text('Reception'), findsOneWidget);
    expect(
      find.text('80 invited · 66 attending · 61 checked in'),
      findsOneWidget,
    );
    expect(find.text('3 INVITED, NO RESPONSE'), findsOneWidget);
    expect(find.text('1 DECLINED BUT ARRIVED'), findsOneWidget);
    expect(find.text('2 NO-SHOW'), findsOneWidget);
    expect(find.text('1 WALK-IN TO RECONCILE'), findsOneWidget);
  });

  testWidgets('shows the empty state when no functions carry counts', (
    tester,
  ) async {
    repository.report = _reportData(functions: const []);
    await _pumpReport(tester, repository, store);
    expect(find.text('No functions on this program yet.'), findsOneWidget);
  });

  testWidgets('shows the error state and retries', (tester) async {
    repository.error = const BackendOperationException(
      code: 'denied',
      message: 'denied',
      retryable: true,
      context: BackendErrorContext(
        service: BackendService.functions,
        action: 'load attendance',
      ),
    );
    await _pumpReport(tester, repository, store);
    expect(find.text('Refresh report'), findsOneWidget);
    repository.error = null;
    await tester.tap(find.text('Refresh report'));
    await pumpFeatureUi(tester);
    expect(find.text('Sangeet'), findsOneWidget);
  });

  test('export csv carries a program row and one row per function', () {
    final report = ProgramAttendanceReport.fromCallableData(_reportData());
    final export = buildProgramAttendanceReportExport(
      programId: 'program',
      programTitle: 'Kapoor Wedding',
      report: report,
      functionNames: const {
        'fn_sangeet': 'Sangeet',
        'fn_reception': 'Reception',
      },
      exportedAt: DateTime.utc(2026, 1, 5, 12),
    );
    expect(export.fileName, 'kapoor-wedding-attendance-2026-01-05.csv');
    expect(export.csv, contains('row_type,program_id,program_title'));
    expect(
      export.csv,
      contains('program,program,Kapoor Wedding,,,142,138,,117'),
    );
    expect(
      export.csv,
      contains('function,program,Kapoor Wedding,fn_sangeet,Sangeet,'),
    );
    expect(export.csv, contains('g_21; g_34; g_40'));
    expect(export.csv.split('\n').where((line) => line.isNotEmpty).length, 4);
  });
}
