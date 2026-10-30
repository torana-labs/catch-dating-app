import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizers_test_helpers.dart';

void main() {
  group('OrganizerHeroTopBar', () {
    test('resolves default hero variants from club media state', () {
      final organizerPhoto = _photo('cover', 0);
      final logoPhoto = _photo('logo', 0);

      expect(
        organizerHeroVariantFor(buildOrganizer(clubPhotos: [organizerPhoto])),
        OrganizerHeroVariant.poster,
      );
      expect(
        organizerHeroVariantFor(
          buildOrganizer(imageUrl: 'https://example.com/old.jpg'),
        ),
        OrganizerHeroVariant.poster,
      );
      expect(
        organizerHeroVariantFor(buildOrganizer(logoPhoto: logoPhoto)),
        OrganizerHeroVariant.masthead,
      );
      expect(
        organizerHeroVariantFor(buildOrganizer()),
        OrganizerHeroVariant.poster,
      );
    });

    testWidgets('photo clubs render the poster hero shell', (tester) async {
      final organizer = buildOrganizer(clubPhotos: [_photo('cover', 0)]);

      await _pumpHeroModule(
        tester,
        organizer,
        organizerHeroVariantFor(organizer),
      );

      expect(find.byType(CatchPoster), findsOneWidget);
      expect(find.byType(OrganizerCover), findsOneWidget);
      expect(find.byType(OrganizerPlaceholderCover), findsOneWidget);
      expect(
        find.byKey(const ValueKey('club-detail-hero-poster-frame')),
        findsOneWidget,
      );
      expect(find.text('Stride Social'), findsOneWidget);
      expect(find.text('Bandra, Mumbai'), findsOneWidget);
    });

    testWidgets('clubs without photos render artwork in the poster shell', (
      tester,
    ) async {
      final organizer = buildOrganizer();

      await _pumpHeroModule(
        tester,
        organizer,
        organizerHeroVariantFor(organizer),
      );

      expect(find.byType(CatchPoster), findsOneWidget);
      expect(find.byType(OrganizerPlaceholderCover), findsOneWidget);
      expect(
        find.byKey(const ValueKey('club-detail-hero-poster-frame')),
        findsOneWidget,
      );
    });

    testWidgets('logo-only clubs render the masthead hero shell', (
      tester,
    ) async {
      final organizer = buildOrganizer(logoPhoto: _photo('logo', 0));

      await _pumpHeroModule(
        tester,
        organizer,
        organizerHeroVariantFor(organizer),
      );

      expect(
        find.byKey(const ValueKey('club-detail-hero-masthead')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('club-detail-hero-logo-seal')),
        findsOneWidget,
      );
      expect(find.byType(CatchAvatar), findsOneWidget);
      expect(find.byType(CatchPoster), findsNothing);
      expect(find.byType(OrganizerPlaceholderCover), findsNothing);
      expect(find.text('Stride Social'), findsOneWidget);
    });

    testWidgets('embedded preview renders the hero without route chrome', (
      tester,
    ) async {
      final organizer = buildOrganizer();

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                OrganizerHeroTopBar(
                  organizer: organizer,
                  isHost: false,
                  presentationMode:
                      OrganizerHeroPresentationMode.embeddedReadOnlyPreview,
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const ValueKey('club-detail-hero-module')),
        findsOneWidget,
      );
      expect(find.byType(SliverAppBar), findsNothing);
      expect(find.byTooltip('Back'), findsNothing);
      expect(find.byTooltip('Share club'), findsNothing);
    });
  });
}

Future<void> _pumpHeroModule(
  WidgetTester tester,
  Organizer organizer,
  OrganizerHeroVariant variant,
) async {
  const mediaHeight = CatchLayout.organizerDetailHeroNoCoverPhoneHeight;
  const captionExtent = CatchLayout.organizerDetailHeroCaptionExtent;
  const moduleHeight =
      mediaHeight +
      captionExtent +
      (CatchLayout.organizerInteractionMediaInset * 2);

  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: Center(
          child: SizedBox(
            width: 390,
            height: moduleHeight,
            child: OrganizerHeroHeader(
              organizer: organizer,
              variant: variant,
              mediaHeight: mediaHeight,
              captionExtent: captionExtent,
              kickerLabel: 'BANDRA · MUMBAI',
              locationLabel: 'Bandra, Mumbai',
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

UploadedPhoto _photo(String id, int position) {
  return UploadedPhoto.fromUpload(
    url: 'https://example.com/$id.jpg',
    storagePath: 'test/organizers/$id.jpg',
    position: position,
    now: DateTime(2026, 7, 6, 9),
  );
}
