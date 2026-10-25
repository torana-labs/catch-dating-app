import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/domain/club_host_defaults.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_host_section.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'clubs_test_helpers.dart';

void main() {
  group('ClubHostSection', () {
    testWidgets('uses activity accent seal and established meta', (
      tester,
    ) async {
      final club = buildClub(
        createdAt: DateTime(2025, 1, 16),
        hostDefaults: const ClubHostDefaults(
          primaryActivityKind: ActivityKind.dinner,
        ),
        hostProfiles: const [
          ClubHostProfile(
            uid: 'owner-1',
            displayName: 'Asha Owner',
            role: ClubHostRole.owner,
          ),
          ClubHostProfile(uid: 'host-2', displayName: 'Dev Host'),
        ],
      );

      await pumpTestApp(
        tester,
        ClubHostSection(
          club: club,
          canViewProfile: true,
          isMessageHostPending: false,
          messageableHostUids: const {},
          onViewProfile: (_) {},
          onMessageHost: null,
        ),
      );

      expect(find.text('OWNER · EST. JAN 2025'), findsOneWidget);
      expect(find.text('HOST · EST. JAN 2025'), findsOneWidget);
      expect(find.textContaining('VIEW PROFILE'), findsNothing);
      expect(find.textContaining('PUBLIC PROFILE'), findsNothing);

      final context = tester.element(find.byType(ClubHostSection));
      final expectedSealColor = ActivityPalette.resolve(
        context,
        ActivityKind.dinner,
      ).accent;
      final seal = tester.widget<Icon>(find.byIcon(CatchIcons.verified));
      expect(seal.color, expectedSealColor);
    });
  });
}
