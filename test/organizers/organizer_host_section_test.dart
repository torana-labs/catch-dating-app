import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_host_section.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizers_test_helpers.dart';

void main() {
  group('OrganizerHostSection', () {
    testWidgets('uses activity accent seal and established meta', (
      tester,
    ) async {
      final organizer = buildOrganizer(
        createdAt: DateTime(2025, 1, 16),
        hostDefaults: const OrganizerHostDefaults(
          primaryActivityKind: ActivityKind.dinner,
        ),
        hostProfiles: const [
          OrganizerHostProfile(
            uid: 'owner-1',
            displayName: 'Asha Owner',
            role: OrganizerHostRole.owner,
          ),
          OrganizerHostProfile(uid: 'host-2', displayName: 'Dev Host'),
        ],
      );

      await pumpTestApp(
        tester,
        OrganizerHostSection(
          organizer: organizer,
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

      final context = tester.element(find.byType(OrganizerHostSection));
      final expectedSealColor = ActivityPalette.resolve(
        context,
        ActivityKind.dinner,
      ).accent;
      final seal = tester.widget<Icon>(find.byIcon(CatchIcons.verified));
      expect(seal.color, expectedSealColor);
    });
  });
}
