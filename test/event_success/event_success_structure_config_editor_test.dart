import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_structure_config_editor.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('edits repeat policy and activity assignment goals', (
    tester,
  ) async {
    var value = const EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.pairs,
      unitSize: 2,
      rotationIntervalMinutes: 15,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (context, setState) {
                return EventSuccessStructureConfigEditor(
                  value: value,
                  targetAttendeeCount: 12,
                  enabled: true,
                  onChanged: (next) {
                    setState(() => value = next);
                  },
                );
              },
            ),
          ),
        ),
      ),
    );

    expect(_choice('Pairs', selected: true), findsNothing);
    await _openField(tester, 'Meeting the same person again');
    expect(_choice('Avoid repeats', selected: true), findsOneWidget);

    _invokeChoice(tester, 'Allow when rounds run long');
    await tester.pump();

    expect(
      value.rotationRepeatStrategy,
      EventSuccessRotationRepeatStrategy.allowWhenExhausted,
    );
    expect(
      _choice('Allow when rounds run long', selected: true),
      findsOneWidget,
    );

    await _openField(tester, 'Skill');
    _invokeChoice(tester, 'Spread evenly', field: 'Skill');
    await tester.pump();

    expect(value.balanceActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.skillBand,
    ]);
    expect(value.clusterActivityAttributes, isEmpty);

    _invokeChoice(tester, 'Keep similar together', field: 'Skill');
    await tester.pump();

    expect(value.balanceActivityAttributes, isEmpty);
    expect(value.clusterActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.skillBand,
    ]);
  });

  testWidgets('cover on an activity attribute has its own choice', (
    tester,
  ) async {
    var value = const EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.teams,
      unitSize: 8,
      balanceActivityAttributes: [
        EventSuccessActivityAssignmentAttribute.roleBand,
      ],
    );
    await _pumpEditor(tester, () => value, (next) => value = next);

    await _openField(tester, 'Role');
    expect(
      _choice('Spread evenly', selected: true, field: 'Role'),
      findsOneWidget,
    );
    _invokeChoice(tester, 'A mix in every group', field: 'Role');
    await tester.pump();

    expect(value.coverActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.roleBand,
    ]);
    expect(value.balanceActivityAttributes, isEmpty);

    _invokeChoice(tester, 'Doesn’t matter', field: 'Role');
    await tester.pump();
    expect(value.coverActivityAttributes, isEmpty);
  });

  testWidgets('gender and age band are offered to teams, off by default, '
      'with consent copy once chosen', (tester) async {
    var value = const EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.teams,
      unitSize: 5,
    );
    await _pumpEditor(tester, () => value, (next) => value = next);

    expect(_field('Gender (opt-in)'), findsOneWidget);
    expect(_field('Age band (opt-in)'), findsOneWidget);
    expect(
      value.objectiveFor(EventSuccessActivityAssignmentAttribute.gender),
      EventSuccessAttributeObjective.none,
    );
    expect(
      find.byKey(const ValueKey('eventSuccessSensitiveAttributeConsent')),
      findsNothing,
    );

    await _openField(tester, 'Gender (opt-in)');
    _invokeChoice(tester, 'Spread evenly', field: 'Gender (opt-in)');
    await tester.pump();

    expect(value.balanceActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.gender,
    ]);
    expect(
      find.byKey(const ValueKey('eventSuccessSensitiveAttributeConsent')),
      findsOneWidget,
    );
  });

  testWidgets('pods do not offer gender or age band', (tester) async {
    var value = const EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.pods,
      unitSize: 4,
    );
    await _pumpEditor(tester, () => value, (next) => value = next);

    expect(_field('Pace'), findsOneWidget);
    expect(_field('Gender (opt-in)'), findsNothing);
    expect(_field('Age band (opt-in)'), findsNothing);
  });

  testWidgets('arrival groups show the unit default and save a choice', (
    tester,
  ) async {
    var value = const EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.tables,
      unitSize: 6,
    );
    await _pumpEditor(tester, () => value, (next) => value = next);

    await _openField(tester, 'People who booked together');
    expect(
      _choice(
        'Keep together',
        selected: true,
        field: 'People who booked together',
      ),
      findsOneWidget,
    );
    expect(value.arrivalGroupPolicy, isNull);

    _invokeChoice(tester, 'Split up', field: 'People who booked together');
    await tester.pump();
    expect(value.arrivalGroupPolicy, EventSuccessArrivalGroupPolicy.spread);
  });

  testWidgets('whole-group flow hides irrelevant size and count controls', (
    tester,
  ) async {
    const value = EventSuccessStructureConfig(
      unitKind: EventSuccessUnitKind.wholeGroup,
      unitSize: 22,
      unitCount: 1,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: EventSuccessStructureConfigEditor(
            sectionTitle: 'How the room is grouped',
            value: value,
            targetAttendeeCount: 22,
            enabled: true,
            onChanged: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('HOW THE ROOM IS GROUPED'), findsOneWidget);
    expect(_field('Group people into'), findsOneWidget);
    expect(_field('Attendance target'), findsNothing);
    expect(_field('Group count'), findsNothing);
    expect(find.text('22 per group'), findsNothing);
    expect(find.text('1 whole group'), findsNothing);
  });
}

Future<void> _pumpEditor(
  WidgetTester tester,
  EventSuccessStructureConfig Function() read,
  ValueChanged<EventSuccessStructureConfig> write,
) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: SingleChildScrollView(
          child: StatefulBuilder(
            builder: (context, setState) => EventSuccessStructureConfigEditor(
              value: read(),
              targetAttendeeCount: 24,
              enabled: true,
              onChanged: (next) => setState(() => write(next)),
            ),
          ),
        ),
      ),
    ),
  );
}

void _invokeChoice(WidgetTester tester, String label, {String? field}) {
  tester.widgetList<CatchChip>(_choice(label, field: field)).last.onPressed!();
}

Future<void> _openField(WidgetTester tester, String title) async {
  final field = _field(title);
  await tester.ensureVisible(field);
  await tester.tap(field);
  await tester.pump(kThemeAnimationDuration);
  await tester.pump();
}

Finder _field(String title) => find.byWidgetPredicate(
  (widget) => widget is CatchField && widget.title == title,
);

Finder _choice(String label, {bool? selected, String? field}) {
  final chip = find.byWidgetPredicate(
    (widget) =>
        widget is CatchChip &&
        widget.mode != null &&
        widget.label == label &&
        (selected == null || widget.selected == selected),
  );
  return field == null
      ? chip
      : find.descendant(of: _field(field), matching: chip);
}
