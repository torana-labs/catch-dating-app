import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('attendee map is read-only and keeps assigned distinct', (
    tester,
  ) async {
    await _pumpMap(tester, assignments: [_assignment()]);

    expect(find.text('Room map'), findsOneWidget);
    expect(find.text('Assigned'), findsOneWidget);
    expect(find.text('Confirmed'), findsOneWidget);
    expect(
      find.text('Select an attendee, then choose a destination.'),
      findsNothing,
    );
    expect(find.text('Confirm position'), findsNothing);
    expect(find.byType(Draggable<String>), findsNothing);
  });

  testWidgets('tap placement exposes every outcome without precision drag', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1200);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    String? reassignedUnitId;
    EventSuccessSpatialScope? reassignedScope;
    var confirmed = false;
    var released = false;

    await _pumpMap(
      tester,
      assignments: [_assignment()],
      onPreview: (_) async => const [
        EventSuccessSpatialDestination(
          unitId: 'round',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.declaredConstraint,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'rect',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.capacity,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'row',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.safetyKeepApart,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'court',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.declaredConstraint,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'zone',
          valid: true,
          reason: null,
          recommendedScope: EventSuccessSpatialScope.pinned,
        ),
      ],
      onReassign: (_, unitId, scope) async {
        reassignedUnitId = unitId;
        reassignedScope = scope;
      },
      onConfirm: (_) async => confirmed = true,
      onRelease: (_) async => released = true,
    );

    await tester.tap(find.text('Guest one'));
    await tester.pump();

    expect(find.byTooltip('This unit is at capacity.'), findsOneWidget);
    expect(
      find.byTooltip('A safety separation keeps this destination unavailable.'),
      findsOneWidget,
    );
    expect(find.byType(Draggable<String>), findsNothing);

    await tester.tap(find.byTooltip('More'));
    await tester.pump();
    await tester.tap(find.text('Confirm position'));
    await tester.pump();
    await tester.tap(find.byTooltip('More'));
    await tester.pump();
    await tester.tap(find.text('Release pinned placement'));
    await tester.pump();
    expect(confirmed, isTrue);
    expect(released, isTrue);

    await tester.tap(find.text('5'));
    await tester.pump();
    expect(reassignedUnitId, isNull);
    expect(find.text('Move to 5'), findsOneWidget);

    await tester.tap(find.text('Move to 5'));
    await tester.pump();
    expect(reassignedUnitId, 'zone');
    expect(reassignedScope, EventSuccessSpatialScope.pinned);
  });

  testWidgets('large Host surfaces add drag without replacing tap controls', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1000, 1400);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await _pumpMap(
      tester,
      assignments: [_assignment()],
      onPreview: (_) async => const [
        EventSuccessSpatialDestination(
          unitId: 'zone',
          valid: true,
          reason: null,
          recommendedScope: EventSuccessSpatialScope.pinned,
        ),
      ],
      onReassign: (_, _, _) async {},
    );
    await tester.tap(find.text('Guest one'));
    await tester.pump();

    expect(find.byType(Draggable<String>), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(
      find.text(
        'On larger screens, drag is also available. Tap controls always work.',
      ),
      findsOneWidget,
    );
  });
}

Future<void> _pumpMap(
  WidgetTester tester, {
  required List<EventSuccessAssignment> assignments,
  EventSuccessSpatialPreview? onPreview,
  EventSuccessSpatialReassign? onReassign,
  Future<void> Function(EventSuccessAssignment assignment)? onConfirm,
  Future<void> Function(EventSuccessAssignment assignment)? onRelease,
}) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(
      body: SingleChildScrollView(
        child: EventSuccessRoomMap(
          layout: _layout,
          assignments: assignments,
          onPreview: onPreview,
          onReassign: onReassign,
          onConfirmPosition: onConfirm,
          onReleasePinned: onRelease,
        ),
      ),
    ),
  ),
);

const _layout = EventSuccessLayout(
  layoutId: 'layout-1',
  label: 'Main room',
  units: [
    EventSuccessLayoutUnit(
      id: 'round',
      label: '1',
      shape: EventSuccessLayoutShape.round,
      capacity: 4,
      gridX: 0,
      gridY: 0,
      order: 1,
    ),
    EventSuccessLayoutUnit(
      id: 'rect',
      label: '2',
      shape: EventSuccessLayoutShape.rect,
      capacity: 4,
      gridX: 1,
      gridY: 0,
      order: 2,
    ),
    EventSuccessLayoutUnit(
      id: 'row',
      label: '3',
      shape: EventSuccessLayoutShape.row,
      capacity: 4,
      gridX: 2,
      gridY: 0,
      order: 3,
    ),
    EventSuccessLayoutUnit(
      id: 'court',
      label: '4',
      shape: EventSuccessLayoutShape.court,
      capacity: 4,
      gridX: 0,
      gridY: 1,
      order: 4,
    ),
    EventSuccessLayoutUnit(
      id: 'zone',
      label: '5',
      shape: EventSuccessLayoutShape.zone,
      capacity: 4,
      gridX: 2,
      gridY: 1,
      order: 5,
    ),
  ],
);

EventSuccessAssignment _assignment() => EventSuccessAssignment(
  id: 'event-1_micro_pods_user-1',
  eventId: 'event-1',
  clubId: 'club-1',
  uid: 'user-1',
  moduleId: 'micro_pods',
  label: 'Pod A',
  displayTitle: 'Guest one',
  peerUids: const [],
  unitKind: 'pods',
  unitIndex: 0,
  layoutUnitId: 'round',
  source: 'server_v1',
  createdAt: DateTime(2026),
  updatedAt: DateTime(2026),
);
