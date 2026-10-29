import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('setup body uses explanatory cards for live guide choices', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    var attendeePrompt = '';
    var draftChanges = 0;
    var draft =
        EventSuccessHostDraft.fromActivity(
              ActivityKind.pickleball,
              targetAttendeeCount: 16,
            )
            .withModuleSelection(
              EventSuccessModuleCatalog.guidedRotations.id,
              true,
            )
            .withModuleSelection(EventSuccessModuleCatalog.liveReveal.id, true)
            .withModuleSelection(
              EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
              true,
            )
            .copyWith(
              structureConfig: const EventSuccessStructureConfig(
                unitKind: EventSuccessUnitKind.pairs,
                unitSize: 2,
                rotationIntervalMinutes: 15,
              ),
            );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (context, setState) {
                return EventSuccessSetupBody(
                  draft: draft,
                  eventFormat: EventFormatSnapshot.fromActivityKind(
                    ActivityKind.pickleball,
                  ),
                  targetAttendeeCount: 16,
                  attendeePrompt: attendeePrompt,
                  onChanged: (update) {
                    draftChanges += 1;
                    setState(() => draft = update(draft));
                  },
                  onAttendeePromptChanged: (next) =>
                      setState(() => attendeePrompt = next),
                );
              },
            ),
          ),
        ),
      ),
    );

    expect(_field('Format'), findsOneWidget);
    expect(find.text('Pickleball'), findsOneWidget);
    expect(find.text('Customize'), findsOneWidget);
    expect(_section('Before the event'), findsNothing);
    expect(_section('When people arrive'), findsNothing);
    expect(_section('During the event'), findsNothing);
    expect(
      tester.getTopLeft(_field('Format')).dy,
      lessThan(tester.getTopLeft(_field('Your goal for the event')).dy),
    );

    await tester.tap(find.text('Customize'));
    await tester.pump();

    expect(_section('Before the event'), findsOneWidget);
    expect(_section('When people arrive'), findsOneWidget);
    expect(_section('During the event'), findsOneWidget);
    expect(_section('After the event'), findsNothing);
    expect(
      tester.getTopLeft(_section('Before the event')).dy,
      lessThan(tester.getTopLeft(_section('When people arrive')).dy),
    );
    expect(
      tester.getTopLeft(_section('When people arrive')).dy,
      lessThan(tester.getTopLeft(_section('During the event')).dy),
    );
    for (final title in [
      EventSuccessModuleCatalog.crowdBalance.title,
      EventSuccessModuleCatalog.checkIn.title,
      EventSuccessModuleCatalog.wingmanRequests.title,
      EventSuccessModuleCatalog.contextualOpeners.title,
      EventSuccessModuleCatalog.decomposedFeedback.title,
      EventSuccessModuleCatalog.hostAnalytics.title,
      EventSuccessModuleCatalog.safetyControls.title,
    ]) {
      expect(_field(title), findsNothing);
    }

    expect(
      tester.widget<CatchField>(_field('Switch partners every')).initiallyOpen,
      isFalse,
    );
    expect(
      find.ancestor(
        of: _field('Switch partners every'),
        matching: find.byKey(const ValueKey('eventSuccessRotationConfig')),
      ),
      findsOneWidget,
    );
    await _openField(tester, 'Switch partners every');
    expect(_choice('15 min', selected: true), findsOneWidget);
    await _openField(tester, 'Reveal countdown');
    expect(_choice('10s', selected: true), findsOneWidget);
    expect(
      _fieldToggle(EventSuccessModuleCatalog.liveReveal.title),
      findsOneWidget,
    );
    expect(find.byType(ExpansionTile), findsNothing);

    await _tapToggle(tester, EventSuccessModuleCatalog.liveReveal.title);
    await tester.pump();
    expect(
      draft.isModuleSelected(EventSuccessModuleCatalog.liveReveal.id),
      isFalse,
    );

    await tester.ensureVisible(find.text('Done'));
    await tester.pump();
    await tester.tap(find.text('Done'));
    await tester.pump();
    expect(
      _fieldToggle(EventSuccessModuleCatalog.liveReveal.title),
      findsNothing,
    );
    expect(
      draft.isModuleSelected(EventSuccessModuleCatalog.liveReveal.id),
      isFalse,
    );

    await tester.ensureVisible(find.text('Customize'));
    await tester.pump();
    await tester.tap(find.text('Customize'));
    await tester.pump();
    expect(
      _fieldToggle(EventSuccessModuleCatalog.liveReveal.title),
      findsOneWidget,
    );
    expect(
      draft.isModuleSelected(EventSuccessModuleCatalog.liveReveal.id),
      isFalse,
    );

    await _tapToggle(tester, EventSuccessModuleCatalog.liveReveal.title);
    await tester.pump();
    expect(
      draft.isModuleSelected(EventSuccessModuleCatalog.liveReveal.id),
      isTrue,
    );
    expect(draftChanges, 2);

    await _openField(tester, 'Conversation check defaults');
    expect(_choice('Ask everyone to choose', selected: true), findsOneWidget);
    await _tapChoice(tester, 'Preselect assigned people');
    await tester.pump();
    expect(
      draft.conversationGraphConsentMode,
      EventSuccessConversationGraphConsentMode.optOut,
    );
    expect(
      _choice('Preselect assigned people', selected: true),
      findsOneWidget,
    );

    await _openField(tester, 'Switch partners every');
    await _tapChoice(tester, '20 min');
    await tester.pump();
    expect(draft.structureConfig.rotationIntervalMinutes, 20);
    expect(_choice('20 min', selected: true), findsOneWidget);

    await _openField(tester, 'Reveal countdown');
    await _tapChoice(tester, '15s');
    await tester.pump();
    expect(draft.structureConfig.revealCountdownSeconds, 15);
    expect(_choice('15s', selected: true), findsOneWidget);

    expect(_field('How the room is grouped'), findsNothing);
    expect(_field('Group people into'), findsOneWidget);
    expect(_field('Match clue questions'), findsOneWidget);
    expect(
      find.ancestor(
        of: _field('Match clue questions'),
        matching: find.byType(CatchSection),
      ),
      findsOneWidget,
    );
    final flowFieldBounds = tester.getRect(_field('Group people into'));
    final matchClueBounds = tester.getRect(_field('Match clue questions'));
    expect(matchClueBounds.left, flowFieldBounds.left);
    expect(matchClueBounds.right, flowFieldBounds.right);
    await _openField(tester, 'Match clue questions');
    expect(_choice('Clues only', selected: true), findsOneWidget);

    _invokeChoiceInField(
      tester,
      'Match clue questions',
      'Clues + soft pairing',
    );
    await tester.pump();
    expect(
      draft.isModuleSelected(
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
      ),
      isTrue,
    );
    expect(draft.compatibilityAffectsRanking, isTrue);
    expect(_choice('Clues + soft pairing', selected: true), findsOneWidget);

    _invokeChoiceInField(tester, 'Match clue questions', 'Off');
    await tester.pump();
    expect(
      draft.isModuleSelected(
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
      ),
      isFalse,
    );
    expect(draft.compatibilityAffectsRanking, isFalse);
    expect(_choice('Off', selected: true), findsOneWidget);
  });

  testWidgets(
    'grouping stays hidden for a whole-group guide without grouping tools',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(360, 1600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      var draft = EventSuccessHostDraft.fromActivity(
        ActivityKind.socialRun,
        targetAttendeeCount: 20,
      );
      for (final module in [
        EventSuccessModuleCatalog.microPods,
        EventSuccessModuleCatalog.guidedRotations,
        EventSuccessModuleCatalog.liveReveal,
      ]) {
        draft = draft.withModuleSelection(module.id, false);
      }
      draft = draft.copyWith(
        structureConfig: const EventSuccessStructureConfig(
          unitKind: EventSuccessUnitKind.wholeGroup,
          unitSize: 20,
          unitCount: 1,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: EventSuccessSetupBody(
                draft: draft,
                eventFormat: EventFormatSnapshot.fromActivityKind(
                  ActivityKind.socialRun,
                ),
                targetAttendeeCount: 20,
                attendeePrompt: null,
                onChanged: (_) {},
                onAttendeePromptChanged: (_) {},
              ),
            ),
          ),
        ),
      );

      expect(_field('Format'), findsOneWidget);
      expect(_section('During the event'), findsNothing);
      await tester.tap(find.text('Customize'));
      await tester.pump();

      expect(find.text('How the room is grouped'), findsNothing);
      expect(_field('Group people into'), findsNothing);
      expect(_field('Switch partners every'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<void> _tapChoice(WidgetTester tester, String label) async {
  final finder = _choice(label);
  await tester.ensureVisible(finder);
  await tester.pump();
  _invokeChoiceWidget(tester, finder);
}

void _invokeChoiceInField(
  WidgetTester tester,
  String fieldTitle,
  String label,
) {
  final choice = find.descendant(
    of: _field(fieldTitle),
    matching: _choice(label),
  );
  _invokeChoiceWidget(tester, choice);
}

void _invokeChoiceWidget(WidgetTester tester, Finder finder) {
  final widget = tester.widgetList<Widget>(finder).last;
  if (widget case final CatchChip chip) {
    chip.onPressed!();
  } else if (widget case final CatchChoiceTile card) {
    card.onTap!();
  }
}

Future<void> _openField(WidgetTester tester, String title) async {
  final field = find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == title,
  );
  await tester.ensureVisible(field.last);
  await tester.tap(field.last);
  await tester.pump(kThemeAnimationDuration);
  await tester.pump();
}

Future<void> _tapToggle(WidgetTester tester, String label) async {
  final finder = _fieldToggle(label);
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
}

Finder _fieldToggle(String label) {
  return _field(label);
}

Finder _field(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == label,
  );
}

Finder _section(String title) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchSection && widget.title == title,
  );
}

Finder _choice(String label, {bool? selected}) {
  return find.byWidgetPredicate(
    (widget) =>
        (widget is CatchChip &&
            widget.mode != null &&
            widget.label == label &&
            (selected == null || widget.selected == selected)) ||
        (widget is CatchChoiceTile &&
            widget.title == label &&
            (selected == null || widget.selected == selected)),
    skipOffstage: false,
  );
}
