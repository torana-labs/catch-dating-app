import 'package:catch_dating_app/hosts/organizer/live_guide_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  testWidgets('a manager reads whether the guide is on', (tester) async {
    await pumpOrganizerBody(
      tester,
      OrganizerLiveGuideBody(
        defaults: lanternLane().hostDefaults,
        editable: false,
        onChanged: (_) => fail('a manager cannot change the guide'),
      ),
    );

    expect(find.byKey(const ValueKey('live-guide-read')), findsOneWidget);
    expect(find.text('Live event guide'), findsOneWidget);
  });

  testWidgets('the owner turns the guide on, and a failed save says why', (
    tester,
  ) async {
    final updates = <Object>[];
    await pumpOrganizerBody(
      tester,
      OrganizerLiveGuideBody(
        defaults: lanternLane().hostDefaults,
        editable: true,
        errorMessage: 'Could not save.',
        onChanged: updates.add,
      ),
    );

    expect(find.byKey(const ValueKey('live-guide-read')), findsNothing);
    expect(find.text('Could not save.'), findsOneWidget);
    // The guide's own on/off switch sits in the field titled with its name.
    final guideToggle = find.descendant(
      of: find.ancestor(
        of: find.text('Live event guide'),
        matching: find.byWidgetPredicate((widget) => widget is CatchField),
      ),
      matching: find.byType(CatchToggleInput),
    );
    await tester.tap(guideToggle);
    expect(updates, hasLength(1));
  });
}
