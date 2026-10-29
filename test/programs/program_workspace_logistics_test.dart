import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

class _Repository extends Fake implements ProgramSetupRepository {
  final pickupPoints =
      <
        ({
          String? pickupPointId,
          int? revision,
          String kind,
          String label,
          String? iataCode,
          String? terminal,
          String? meetingZone,
          String? instructions,
          bool? active,
        })
      >[];
  final hotels =
      <
        ({
          String? hotelId,
          int? revision,
          String name,
          String? address,
          String? receptionContact,
          String? notes,
          bool? active,
        })
      >[];

  @override
  Future<ProgramMutationResult> upsertPickupPoint({
    required String programId,
    required String kind,
    required String label,
    String? pickupPointId,
    int? expectedRevision,
    String? iataCode,
    String? terminal,
    String? meetingZone,
    String? instructions,
    bool? active,
  }) async {
    pickupPoints.add((
      pickupPointId: pickupPointId,
      revision: expectedRevision,
      kind: kind,
      label: label,
      iataCode: iataCode,
      terminal: terminal,
      meetingZone: meetingZone,
      instructions: instructions,
      active: active,
    ));
    return ProgramMutationResult(
      entityId: pickupPointId ?? 'new-point',
      revision: (expectedRevision ?? 0) + 1,
      alreadyApplied: false,
    );
  }

  @override
  Future<ProgramMutationResult> upsertHotel({
    required String programId,
    required String name,
    String? hotelId,
    int? expectedRevision,
    String? address,
    String? receptionContact,
    String? notes,
    bool? active,
  }) async {
    hotels.add((
      hotelId: hotelId,
      revision: expectedRevision,
      name: name,
      address: address,
      receptionContact: receptionContact,
      notes: notes,
      active: active,
    ));
    return ProgramMutationResult(
      entityId: hotelId ?? 'new-hotel',
      revision: (expectedRevision ?? 0) + 1,
      alreadyApplied: false,
    );
  }
}

OrganizerProgramDetail _detail({
  List<Map<String, Object?>> pickupPoints = const [],
  List<Map<String, Object?>> hotels = const [],
}) => OrganizerProgramDetail.fromCallableData({
  'program': {
    'programId': 'p-1',
    'organizerId': 'o-1',
    'kind': 'wedding',
    'title': 'Mehta wedding',
    'timezone': 'Asia/Kolkata',
    'status': 'active',
    'startsAtMillis': DateTime(2030, 2, 10).millisecondsSinceEpoch,
    'endsAtMillis': DateTime(2030, 2, 13).millisecondsSinceEpoch,
    'capabilities': <String>[],
    'revision': 3,
  },
  'functions': <Map<String, Object?>>[
    {
      'functionId': 'fn-1',
      'name': 'Sangeet',
      'venueName': 'Ballroom',
      'startsAtMillis': DateTime(2030, 2, 10, 18).millisecondsSinceEpoch,
      'endsAtMillis': DateTime(2030, 2, 10, 23).millisecondsSinceEpoch,
      'status': 'scheduled',
      'invitationMode': 'allGuests',
      'checkInEnabled': true,
      'revision': 2,
    },
  ],
  'pickupPoints': pickupPoints,
  'hotels': hotels,
  'counts': {'guests': 4, 'households': 2, 'inboundLegs': 3, 'activeStaff': 1},
});

Widget _app(_Repository repository, OrganizerProgramDetail detail) =>
    ProviderScope(
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      overrides: [programSetupRepositoryProvider.overrideWithValue(repository)],
      child: MaterialApp(
        theme: AppTheme.light,
        home: ProgramWorkspacePageBody(programDetail: detail),
      ),
    );

void main() {
  testWidgets('logistics section renders stations and hotels', (tester) async {
    final repository = _Repository();
    await tester.pumpWidget(
      _app(
        repository,
        _detail(
          pickupPoints: [
            {
              'pickupPointId': 'pp-1',
              'kind': 'airport',
              'label': 'DEL Terminal 3',
              'iataCode': 'DEL',
              'terminal': 'T3',
              'meetingZone': 'Pillar 12',
              'active': true,
              'revision': 4,
            },
          ],
          hotels: [
            {
              'hotelId': 'h-1',
              'name': 'Taj Palace',
              'address': 'Chanakyapuri',
              'active': true,
              'revision': 6,
            },
          ],
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Logistics'), findsNothing);
    final pickupSection = find.ancestor(
      of: find.text('Pickup points'),
      matching: find.byType(CatchSection),
    );
    final hotelSection = find.ancestor(
      of: find.text('Hotels'),
      matching: find.byType(CatchSection),
    );
    expect(pickupSection, findsOneWidget);
    expect(hotelSection, findsOneWidget);
    expect(
      tester.widget(pickupSection),
      isNot(same(tester.widget(hotelSection))),
    );
    expect(find.text('Pickup points'), findsOneWidget);
    expect(find.text('Hotels'), findsOneWidget);
    expect(find.text('DEL Terminal 3'), findsOneWidget);
    expect(find.text('airport · DEL · T3'), findsOneWidget);
    expect(find.text('Pillar 12'), findsOneWidget);
    expect(find.text('Taj Palace'), findsOneWidget);
    expect(find.text('Chanakyapuri'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('empty logistics state and inactive badges render', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(
      _app(
        repository,
        _detail(
          pickupPoints: [
            {
              'pickupPointId': 'pp-2',
              'kind': 'railway',
              'label': 'NDLS Exit 4',
              'active': false,
              'revision': 1,
            },
          ],
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.textContaining('No pickup points yet'), findsNothing);
    expect(find.text('NDLS Exit 4'), findsOneWidget);
    expect(find.text('Inactive'), findsOneWidget);
    expect(find.textContaining('No hotels yet'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('add pickup point submits kind, label and details', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(_app(repository, _detail()));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Add pickup point'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Add pickup point'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-pickup-label')),
        matching: find.byType(TextField),
      ),
      'Jaipur Intl',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-pickup-iata')),
        matching: find.byType(TextField),
      ),
      'JAI',
    );
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.pickupPoints.single.pickupPointId, isNull);
    expect(repository.pickupPoints.single.kind, 'airport');
    expect(repository.pickupPoints.single.label, 'Jaipur Intl');
    expect(repository.pickupPoints.single.iataCode, 'JAI');
    expect(repository.pickupPoints.single.active, isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('edit pickup point carries id and revision fence', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(
      _app(
        repository,
        _detail(
          pickupPoints: [
            {
              'pickupPointId': 'pp-1',
              'kind': 'airport',
              'label': 'DEL Terminal 3',
              'iataCode': 'DEL',
              'active': true,
              'revision': 4,
            },
          ],
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Edit pickup point'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Edit pickup point'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-pickup-meeting-zone')),
        matching: find.byType(TextField),
      ),
      'Pillar 12',
    );
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.pickupPoints.single.pickupPointId, 'pp-1');
    expect(repository.pickupPoints.single.revision, 4);
    expect(repository.pickupPoints.single.label, 'DEL Terminal 3');
    expect(repository.pickupPoints.single.iataCode, 'DEL');
    expect(repository.pickupPoints.single.meetingZone, 'Pillar 12');
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('add hotel submits name, address and reception contact', (
    tester,
  ) async {
    final repository = _Repository();
    await tester.pumpWidget(_app(repository, _detail()));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Add hotel'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Add hotel'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-hotel-name')),
        matching: find.byType(TextField),
      ),
      'Lakeview',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-hotel-address')),
        matching: find.byType(TextField),
      ),
      'Pichola Rd',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('program-hotel-reception')),
        matching: find.byType(TextField),
      ),
      '+91 90000 00000',
    );
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.hotels.single.hotelId, isNull);
    expect(repository.hotels.single.name, 'Lakeview');
    expect(repository.hotels.single.address, 'Pichola Rd');
    expect(repository.hotels.single.receptionContact, '+91 90000 00000');
    expect(repository.hotels.single.active, isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('edit hotel carries id and revision fence', (tester) async {
    final repository = _Repository();
    await tester.pumpWidget(
      _app(
        repository,
        _detail(
          hotels: [
            {
              'hotelId': 'h-1',
              'name': 'Taj Palace',
              'address': 'Chanakyapuri',
              'active': true,
              'revision': 6,
            },
          ],
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Edit hotel'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Edit hotel'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);
    expect(repository.hotels.single.hotelId, 'h-1');
    expect(repository.hotels.single.revision, 6);
    expect(repository.hotels.single.name, 'Taj Palace');
    expect(repository.hotels.single.address, 'Chanakyapuri');
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
