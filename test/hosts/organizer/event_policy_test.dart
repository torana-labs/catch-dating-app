import 'package:catch_dating_app/hosts/organizer/event_policy_body.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  testWidgets('a manager reads the city, timezone, activity, admission, ages '
      'and cancellation', (tester) async {
    final organizer = lanternLane();
    await pumpOrganizerBody(
      tester,
      OrganizerEventPolicyBody(
        city: organizer.location,
        defaults: organizer.hostDefaults,
        editable: false,
        onChanged: (_) => fail('a manager cannot change the policy'),
      ),
    );

    expect(find.byKey(const ValueKey('event-policy-read')), findsOneWidget);
    expect(find.byKey(const ValueKey('event-policy-card')), findsNothing);
    expect(find.text('Age range'), findsOneWidget);
  });

  testWidgets('the owner gets the policy card, and a failed save says why', (
    tester,
  ) async {
    final organizer = lanternLane();
    await pumpOrganizerBody(
      tester,
      OrganizerEventPolicyBody(
        city: organizer.location,
        defaults: organizer.hostDefaults,
        editable: true,
        errorMessage: 'Could not save.',
        onChanged: (_) {},
      ),
    );

    expect(find.byKey(const ValueKey('event-policy-card')), findsOneWidget);
    expect(find.text('Could not save.'), findsOneWidget);
  });
}
