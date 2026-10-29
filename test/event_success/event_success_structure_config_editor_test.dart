import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_structure_config_editor.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
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

    await _openField(tester, 'Spread people out by');
    _invokeChoice(tester, 'Spread skill');
    await tester.pump();

    expect(value.balanceActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.skillBand,
    ]);
    expect(value.clusterActivityAttributes, isEmpty);
    expect(_choice('Spread skill', selected: true), findsOneWidget);

    await _openField(tester, 'Keep similar people together by');
    _invokeChoice(tester, 'Skill together');
    await tester.pump();

    expect(value.balanceActivityAttributes, isEmpty);
    expect(value.clusterActivityAttributes, [
      EventSuccessActivityAssignmentAttribute.skillBand,
    ]);
    expect(_choice('Skill together', selected: true), findsOneWidget);
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

void _invokeChoice(WidgetTester tester, String label) {
  tester.widgetList<CatchChip>(_choice(label)).last.onPressed!();
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

Finder _choice(String label, {bool? selected}) {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchChip &&
        widget.mode != null &&
        widget.label == label &&
        (selected == null || widget.selected == selected),
  );
}
