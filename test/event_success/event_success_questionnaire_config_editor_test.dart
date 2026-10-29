import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_questionnaire_config_editor.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('previews every question pack before an explicit commit', (
    tester,
  ) async {
    var value = const EventSuccessQuestionnaireConfig.defaultTemplate();

    await _pumpEditor(tester, value: value, onChanged: (next) => value = next);

    expect(find.text("Tonight I'm most up for"), findsOneWidget);
    expect(
      find.text(
        'Easy conversation · Playful competition · Quiet chemistry · Meeting a few new people',
      ),
      findsOneWidget,
    );

    await _openQuestionSetField(tester);
    expect(_choice('Balanced', selected: true), findsOneWidget);

    _invokeChoice(tester, 'Flirty');
    await tester.pump();

    expect(value.templateId, EventSuccessQuestionnairePackLibrary.balancedId);
    expect(find.text('The kind of spark I enjoy is'), findsOneWidget);
    expect(
      find.text('Quick banter · A slow burn · A playful challenge'),
      findsOneWidget,
    );

    await _tapCommitAction(tester, 'Cancel');
    expect(value.templateId, EventSuccessQuestionnairePackLibrary.balancedId);
    expect(find.text("Tonight I'm most up for"), findsOneWidget);

    await _openQuestionSetField(tester);
    _invokeChoice(tester, 'Flirty');
    await tester.pump();
    await _tapCommitAction(tester, 'Done');

    expect(value.templateId, EventSuccessQuestionnairePackLibrary.flirtyId);
    expect(find.text('The kind of spark I enjoy is'), findsOneWidget);
  });

  testWidgets('custom questions use one collapsed field editor at a time', (
    tester,
  ) async {
    var value = const EventSuccessQuestionnaireConfig.customTemplate();

    await _pumpEditor(tester, value: value, onChanged: (next) => value = next);

    expect(find.text('I usually connect with someone through'), findsOneWidget);
    expect(find.text('Conversation'), findsOneWidget);
    expect(_openExplicitSaveFields(tester), isEmpty);

    final firstQuestion = _field('Question 1');
    await tester.ensureVisible(firstQuestion);
    await tester.tap(firstQuestion);
    await tester.pump(kThemeAnimationDuration);
    expect(_openExplicitSaveFields(tester), hasLength(1));

    final firstQuestionInput = find.descendant(
      of: firstQuestion,
      matching: find.byType(TextField),
    );
    await tester.enterText(firstQuestionInput, 'A staged prompt');
    await _tapCommitAction(tester, 'Cancel');
    expect(
      value.customQuestions.first.prompt,
      'I usually connect with someone through',
    );
    expect(find.text('I usually connect with someone through'), findsOneWidget);

    await tester.ensureVisible(firstQuestion);
    await tester.tap(firstQuestion);
    await tester.pump(kThemeAnimationDuration);
    await tester.enterText(firstQuestionInput, 'A committed prompt');
    await _tapCommitAction(tester, 'Done');

    expect(value.customQuestions.first.prompt, 'A committed prompt');
    expect(find.text('A committed prompt'), findsOneWidget);
    expect(_openExplicitSaveFields(tester), isEmpty);
  });
}

Future<void> _pumpEditor(
  WidgetTester tester, {
  required EventSuccessQuestionnaireConfig value,
  required ValueChanged<EventSuccessQuestionnaireConfig> onChanged,
}) {
  var current = value;
  return tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: SingleChildScrollView(
          child: StatefulBuilder(
            builder: (context, setState) =>
                EventSuccessQuestionnaireConfigEditor(
                  value: current,
                  onChanged: (next) {
                    setState(() => current = next);
                    onChanged(next);
                  },
                ),
          ),
        ),
      ),
    ),
  );
}

void _invokeChoice(WidgetTester tester, String label) {
  tester.widgetList<CatchChoiceTile>(_choice(label)).last.onTap!();
}

Future<void> _openQuestionSetField(WidgetTester tester) async {
  final field = _field('Question set');
  await tester.ensureVisible(field);
  await tester.tap(field);
  await tester.pump(kThemeAnimationDuration);
  await tester.pump();
}

Future<void> _tapCommitAction(WidgetTester tester, String label) async {
  final key = label == 'Done' ? 'catch-field-done' : 'catch-field-cancel';
  final action = find.byKey(ValueKey(key));
  await tester.ensureVisible(action);
  tester.widget<CatchFieldCommitButton>(action).onPressed!();
  await tester.pump(kThemeAnimationDuration);
  await tester.pump();
}

List<CatchField> _openExplicitSaveFields(WidgetTester tester) => tester
    .widgetList<CatchField>(find.byType(CatchField))
    .where((field) => field.usesExplicitSave && field.open == true)
    .toList(growable: false);

Finder _field(String title) => find.byWidgetPredicate(
  (widget) => widget is CatchField && widget.title == title,
);

Finder _choice(String label, {bool? selected}) {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchChoiceTile &&
        widget.title == label &&
        (selected == null || widget.selected == selected),
  );
}
