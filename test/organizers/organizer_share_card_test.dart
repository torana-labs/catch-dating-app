import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_share_card.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

import '../test_pump_helpers.dart';
import 'organizers_test_helpers.dart';

void main() {
  testWidgets('renders an editorial club share card', (tester) async {
    final organizer = buildOrganizer(
      memberCount: 24,
      tags: const ['run club', 'singles', 'coffee'],
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: OrganizerShareCard(organizer: organizer)),
      ),
    );

    expect(find.text('ORGANIZER ON CATCH'), findsOneWidget);
    expect(find.text('Stride Social'), findsOneWidget);
    expect(find.text('Bandra, Mumbai'), findsOneWidget);
    expect(find.text('24 followers'), findsOneWidget);
    expect(find.text('CATCH'), findsOneWidget);
  });

  testWidgets('club hero share exports a png with the club link', (
    tester,
  ) async {
    ShareParams? sharedParams;
    final organizer = buildOrganizer(memberCount: 24);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          externalShareLauncherProvider.overrideWithValue((params) async {
            sharedParams = params;
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [OrganizerHeroTopBar(organizer: organizer, isHost: false)],
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.byTooltip('Share organizer'));
    await pumpFeatureUi(tester);

    expect(find.byKey(CatchShareCardSheet.cardPreviewKey), findsOneWidget);
    expect(find.byType(OrganizerShareCard), findsOneWidget);
    expect(find.text('Stride Social'), findsWidgets);

    await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
    await tester.pump();
    await pumpFeatureUi(tester);
    await tester.runAsync(() async {
      for (var i = 0; i < 20 && sharedParams == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    });

    expect(sharedParams?.subject, 'Stride Social');
    expect(sharedParams?.text, contains('/organizers/club-1'));
    expect(sharedParams?.files, hasLength(1));
    expect(sharedParams?.fileNameOverrides, ['catch-organizer-card.png']);
  });
}
