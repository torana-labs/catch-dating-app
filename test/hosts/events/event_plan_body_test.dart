import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/hosts/events/event_plan_body.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/widgets/event_plan_step_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import 'events_fixtures.dart';

Future<void> _pump(WidgetTester tester, Widget body, {Widget? overlay}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(bodyScrolls: false, body: body, overlay: overlay),
      ),
    ),
  );
  await tester.pump();
}

HostEventPlanState _editable() {
  final ready = planReady();
  return HostEventPlanState(
    status: ready.status,
    eventTitle: ready.eventTitle,
    plan: ready.plan,
    formatLabel: ready.formatLabel,
    playbookTitle: ready.playbookTitle,
    steps: ready.steps,
    unitKind: ready.unitKind,
    unitSize: ready.unitSize,
    unitCount: ready.unitCount,
    options: ready.options,
    editable: true,
    stepsEditable: true,
    liveControlRevision: 3,
  );
}

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('steps open the editor and Add a step adds one', (tester) async {
    final state = _editable();
    final opened = <Object>[];
    await _pump(
      tester,
      HostEventPlanBody(
        state: state,
        options: state.options,
        onOption: (_, _) {},
        onRetry: () {},
        onEditStep: opened.add,
        onAddStep: () => opened.add('add'),
      ),
    );
    await tester.tap(
      find.byKey(const ValueKey<String>('host-event-plan-step-1')),
    );
    await tester.tap(
      find.byKey(const ValueKey<String>('host-event-plan-add-step')),
    );
    expect(opened, [1, 'add']);
  });

  testWidgets('a locked plan reads its steps without editing', (tester) async {
    final state = planReady();
    await _pump(
      tester,
      HostEventPlanBody(
        state: state,
        options: state.options,
        onOption: (_, _) {},
        onRetry: () {},
        onEditStep: (_) => fail('locked steps do not open'),
        onAddStep: () => fail('locked steps do not add'),
      ),
    );
    expect(
      find.byKey(const ValueKey<String>('host-event-plan-add-step')),
      findsNothing,
    );
  });

  test('the first edit sends the steps with derived ids', () {
    final state = _editable();
    final steps = state.planSteps;
    expect(steps, hasLength(state.steps.length));
    expect(steps.first.stepId, 'playbook-0');
    expect(steps.first.title, state.steps.first.step.title);
  });

  test('stored overrides replace the playbook run of show', () {
    final plan = eventsPlan().copyWith(
      stepOverrides: const [
        EventSuccessPlanStep(
          stepId: 'host-1',
          title: 'Quiz break',
          durationMinutes: 12,
        ),
      ],
    );
    final steps = EventSuccessRuntime(
      plan: plan,
      event: tonightEvent,
      now: eventsDoors,
    ).runOfShowSteps;
    expect(steps.map((step) => step.title), ['Quiz break']);
    expect(steps.single.id, 'host-1');
    expect(steps.single.durationMinutes, 12);
  });

  testWidgets('the step sheet saves the typed step', (tester) async {
    final saved = <EventSuccessPlanStep>[];
    var removed = 0;
    await _pump(
      tester,
      const SizedBox.shrink(),
      overlay: HostEventPlanStepSheet(
        step: const EventSuccessPlanStep(
          stepId: 'playbook-0',
          title: 'Arrivals',
          durationMinutes: 15,
        ),
        isNew: false,
        onSave: saved.add,
        onRemove: () => removed++,
      ),
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey<String>('host-event-plan-step-title')),
        matching: find.byType(EditableText),
      ),
      'Doors',
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey<String>('host-event-plan-step-save')),
    );
    await tester.tap(
      find.byKey(const ValueKey<String>('host-event-plan-step-remove')),
    );
    expect(saved.single.title, 'Doors');
    expect(saved.single.stepId, 'playbook-0');
    expect(saved.single.durationMinutes, 15);
    expect(removed, 1);
  });
}
