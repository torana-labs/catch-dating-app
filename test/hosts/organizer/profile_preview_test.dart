import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/hosts/organizer/profile_preview_sheet.dart';
import 'package:catch_dating_app/hosts/organizer/settings_body.dart';
import 'package:catch_dating_app/hosts/organizer/settings_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  testWidgets('the preview shows the profile as guests see it and the '
      'organizers the host runs', (tester) async {
    await pumpOrganizerBody(
      tester,
      HostProfilePreviewSheet(
        profile: HostProfile(
          uid: organizerOwnerUid,
          displayName: 'Meher',
          roleTitle: 'Quizmaster',
          bio: 'Runs the Tuesday quiz.',
          status: HostProfileStatus.active,
          createdAt: DateTime(2023),
          updatedAt: DateTime(2023),
        ),
        organizers: [lanternLane()],
      ),
    );

    expect(find.text('Meher'), findsOneWidget);
    expect(find.text('Quizmaster'), findsOneWidget);
    expect(find.text('Runs the Tuesday quiz.'), findsOneWidget);
    expect(find.text('Organizers you host'), findsOneWidget);
    expect(find.text('Lantern Lane Social'), findsOneWidget);
  });

  testWidgets('Settings offers the preview beside the name once there is a '
      'profile', (tester) async {
    final actions = <OrganizerSettingsAction>[];
    await pumpOrganizerBody(
      tester,
      OrganizerSettingsBody(
        state: const OrganizerSettingsState(name: 'Meher', hasProfile: true),
        onMessages: (_) {},
        onAction: actions.add,
      ),
    );

    await tester.tap(
      find.byKey(const ValueKey('settings-row-profile-preview')),
    );
    expect(actions, [OrganizerSettingsAction.previewProfile]);
  });
}
