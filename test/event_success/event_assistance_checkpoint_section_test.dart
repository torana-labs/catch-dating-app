import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_checkpoint_fixtures.dart';

void main() {
  final decisions = <AssistanceCheckpointObservation>[];
  Future<void> mount(
    WidgetTester tester,
    Map<String, Object?> wire, {
    Map<String, String> names = const {'a': 'Alex Morgan', 'b': 'Priya Sharma'},
  }) async {
    decisions.clear();
    final view = checkpointResult(wire).view;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            child: CatchPageBody(
              child: EventAssistanceCheckpointSection(
                reviewIdentity: view,
                availability: view.availability,
                names: names,
                progressRevision: view.scope.progressRevision,
                phase: EventAssistanceCheckpointPhase.ready,
                contextMessage: 'Everyone',
                canReport: view.canReport,
                onConfirm: decisions.add,
                onRetry: () {},
                onReload: () {},
                onDone: () {},
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  Future<void> tap(WidgetTester tester, Finder target) async {
    await tester.ensureVisible(target);
    await tester.tap(target);
    await pumpFeatureUi(tester);
  }

  testWidgets('removing a saved observation requires an explicit correction', (
    tester,
  ) async {
    await mount(tester, checkpointWire(observed: ['a']));
    await tap(tester, find.byKey(const ValueKey('checkpoint.guest.a')));
    expect(find.text('Removing an earlier observation'), findsOneWidget);
    final save = find.byKey(const ValueKey('checkpoint.confirm'));
    expect(tester.widget<CatchButton>(save).onPressed, isNull);
    final field = find.descendant(
      of: find.byKey(const ValueKey('checkpoint.correction')),
      matching: find.byType(EditableText),
    );
    await tester.ensureVisible(field);
    await tester.enterText(field, '  Selected the wrong guest.  ');
    await pumpFeatureUi(tester);
    expect(decisions, isEmpty);
    await tap(tester, save);
    expect(decisions.single.accountedFor, isEmpty);
    expect(decisions.single.correctionReason, 'Selected the wrong guest.');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'unavailable names keep original observations without editable identity',
    (tester) async {
      await mount(
        tester,
        checkpointWire(
          observed: ['a'],
          unavailableVisits: {'a': 'registrationMissing'},
        ),
        names: const {'b': 'Priya Sharma'},
      );
      final row = tester.widget<CatchField>(
        find.byKey(const ValueKey('checkpoint.guest.a')),
      );
      expect(row.states.contains(WidgetState.selected), isTrue);
      expect(find.text('Guest record unavailable'), findsOneWidget);
      await tap(tester, find.byKey(const ValueKey('checkpoint.guest.a')));
      await tap(tester, find.byKey(const ValueKey('checkpoint.guest.b')));
      await tap(tester, find.byKey(const ValueKey('checkpoint.confirm')));
      expect(decisions.single.accountedFor, ['a', 'b']);
      expect(decisions.single.correctionReason, isNull);
    },
  );

  testWidgets(
    'empty recorded roster is reportable; absent roster is unavailable',
    (tester) async {
      await mount(tester, checkpointWire(ids: []), names: const {});
      await tap(tester, find.byKey(const ValueKey('checkpoint.confirm')));
      expect(decisions.single.accountedFor, isEmpty);
      await mount(tester, checkpointWire(reason: 'rosterNotRecorded'));
      expect(find.text('Save checkpoint report'), findsNothing);
      expect(
        find.text('No guest roster was recorded for this departure.'),
        findsOneWidget,
      );
      expect(decisions, isEmpty);
    },
  );
}
