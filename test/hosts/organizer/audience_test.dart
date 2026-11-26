import 'package:catch_dating_app/hosts/organizer/audience_body.dart';
import 'package:catch_dating_app/hosts/organizer/audience_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  testWidgets('all time shows members, events and upcoming; an unreadable '
      'audience offers Try again', (tester) async {
    var retries = 0;
    await pumpOrganizerBody(
      tester,
      OrganizerAudienceBody(
        state: OrganizerAudienceState(
          organizer: lanternLane(),
          eventCount: 12,
          upcomingCount: 3,
          audienceStatus: OrganizerAudienceStatus.unavailable,
        ),
        onRetry: () => retries++,
      ),
    );

    expect(find.text('All time'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Audience'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(retries, 1);
  });

  testWidgets('loading says the audience is on its way', (tester) async {
    await pumpOrganizerBody(
      tester,
      OrganizerAudienceBody(
        state: OrganizerAudienceState(
          organizer: lanternLane(),
          audienceStatus: OrganizerAudienceStatus.loading,
        ),
        onRetry: () {},
      ),
    );

    expect(find.byKey(const ValueKey('audience-channels')), findsNothing);
    expect(find.text('—'), findsWidgets);
  });
}
