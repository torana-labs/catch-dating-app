import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchNetworkImage,
  path: '[Core primitives]/Media',
)
Widget catchNetworkImageContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchNetworkImage',
    contractId: 'catch.network_image',
    states: ['bundled-asset', 'fitted', 'fallback', 'semantic-label'],
    children: [
      WidgetbookContractStateCard(
        label: 'bundled-asset',
        child: ClipRRect(
          borderRadius: BorderRadius.all(Radius.circular(CatchRadius.md)),
          child: SizedBox(
            width: WidgetbookPreviewLayout.networkIconExtent,
            height: WidgetbookPreviewLayout.networkIconExtent,
            child: CatchNetworkImage(
              'assets/branding/catch_icon.png',
              fit: BoxFit.contain,
              semanticLabel: 'Catch app icon',
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'fitted',
        child: ClipRRect(
          borderRadius: BorderRadius.all(Radius.circular(CatchRadius.md)),
          child: SizedBox(
            width: WidgetbookPreviewLayout.networkLandscapeWidth,
            height: WidgetbookPreviewLayout.networkLandscapeHeight,
            child: CatchNetworkImage(
              'assets/branding/catch_icon.png',
              fit: BoxFit.cover,
              cacheWidth: 440,
              cacheHeight: 248,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'fallback',
        child: ClipRRect(
          borderRadius: BorderRadius.all(Radius.circular(CatchRadius.md)),
          child: SizedBox(
            width: WidgetbookPreviewLayout.networkLandscapeWidth,
            height: WidgetbookPreviewLayout.networkLandscapeHeight,
            child: CatchNetworkImage('assets/branding/not-found.png'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchImageFallbackSurface,
  path: '[Core primitives]/Media',
)
Widget catchNetworkImageFallbackContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchImageFallbackSurface',
    contractId: 'catch.network_image.fallback',
    states: const ['default', 'custom-icon', 'custom-color', 'hero'],
    children: [
      const WidgetbookContractStateCard(
        label: 'default',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.networkFallbackExtent,
          child: CatchImageFallbackSurface(),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-icon',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.networkFallbackExtent,
          child: CatchImageFallbackSurface(icon: CatchIcons.photos),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-color',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.networkFallbackExtent,
          child: CatchImageFallbackSurface(
            backgroundColor: t.primarySoft,
            iconColor: t.primary,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'hero',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchImageFallbackSurface.hero(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDistanceOverlay,
  path: '[Core primitives]/Activity',
)
Widget catchDistanceOverlayContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchDistanceOverlay',
    contractId: 'catch.distance_ring',
    states: const [
      'ring-only',
      'with-label',
      'tappable-label',
      'custom-size',
      'long-label',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'ring-only',
        child: CatchDistanceOverlay(),
      ),
      const WidgetbookContractStateCard(
        label: 'with-label',
        child: CatchDistanceOverlay(label: '2 km'),
      ),
      WidgetbookContractStateCard(
        label: 'tappable-label',
        child: CatchDistanceOverlay(label: '3 km', onTap: widgetbookNoop),
      ),
      const WidgetbookContractStateCard(
        label: 'custom-size',
        child: CatchDistanceOverlay(size: 132, label: '5 km'),
      ),
      const WidgetbookContractStateCard(
        label: 'long-label',
        child: SizedBox(
          width: WidgetbookPreviewLayout.distanceRingLongLabelWidth,
          child: CatchDistanceOverlay(label: 'within walking distance'),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchGradedImage,
  path: '[Core primitives]/Media',
)
Widget catchGradedImageContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final dinner = ActivityPalette.of(context).forKind(ActivityKind.dinner);
  Widget swatch(Color color) => SizedBox(
    width: WidgetbookPreviewLayout.surfaceCardWidth,
    height: WidgetbookPreviewLayout.compactPanelHeight,
    child: DecoratedBox(decoration: BoxDecoration(color: color)),
  );

  return WidgetbookContractFrame(
    title: 'CatchGradedImage',
    contractId: 'catch.graded_image',
    states: const ['enabled', 'disabled', 'light-image', 'dark-image'],
    children: [
      WidgetbookContractStateCard(
        label: 'enabled',
        child: CatchGradedImage(child: swatch(dinner.accent)),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchGradedImage(enabled: false, child: swatch(dinner.accent)),
      ),
      WidgetbookContractStateCard(
        label: 'light-image',
        child: CatchGradedImage(child: swatch(t.raised)),
      ),
      WidgetbookContractStateCard(
        label: 'dark-image',
        child: CatchGradedImage(child: swatch(CatchTokens.editorialBlack)),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchHeroImage,
  path: '[Core primitives]/Media',
)
Widget catchHeroImageContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchHeroImage',
    contractId: 'catch.detail_media',
    states: ['photo', 'image-error', 'fallback-gradient', 'scrim', 'no-scrim'],
    children: [
      WidgetbookContractStateCard(
        label: 'photo',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchHeroImage(
            imageUrl: 'assets/fixtures/club_hero_portrait.jpg',
            semanticLabel: 'Event photo',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'image-error',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchHeroImage(
            imageUrl: 'assets/fixtures/missing-hero-photo.jpg',
            semanticLabel: 'Event photo',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'fallback-gradient',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchHeroImage(),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'scrim',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchHeroImage(showScrim: true),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'no-scrim',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchHeroImage(showScrim: false),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMediaOverlay,
  path: '[Core primitives]/Media',
)
Widget catchScrimContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final walking = ActivityPalette.of(context).forKind(ActivityKind.walking);

  return WidgetbookContractFrame(
    title: 'CatchMediaOverlay',
    contractId: 'catch.detail_media.scrim',
    states: [
      'detail-hero',
      'photo-frame',
      'hero-tint',
      'bottom',
      'full',
      'none',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'detail hero',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediaPanelWidth,
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(color: CatchTokens.editorialBlack),
            child: CatchMediaOverlay.detailHero(),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'photo frame',
        child: SizedBox(
          width: WidgetbookPreviewLayout.narrowComponentWidth,
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [walking.accent, CatchTokens.editorialBlack],
              ),
            ),
            child: CatchMediaOverlay.photoFrame(),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'profile hero tint',
        child: SizedBox(
          width: WidgetbookPreviewLayout.narrowComponentWidth,
          height: WidgetbookPreviewLayout.tallNarrowPanelHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(color: t.ink),
            child: CatchMediaOverlay.heroTint(base: t.ink),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'scrim styles',
        child: WidgetbookContractWrap(
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.thumbnailWidth,
              height: WidgetbookPreviewLayout.thumbnailHeight,
              child: CatchMediaOverlay.thumbnail(
                variant: CatchMediaOverlayVariant.bottom,
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.thumbnailWidth,
              height: WidgetbookPreviewLayout.thumbnailHeight,
              child: CatchMediaOverlay.thumbnail(
                variant: CatchMediaOverlayVariant.full,
              ),
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'none',
        child: SizedBox(
          width: WidgetbookPreviewLayout.thumbnailWidth,
          height: WidgetbookPreviewLayout.thumbnailHeight,
          child: CatchMediaOverlay.thumbnail(
            variant: CatchMediaOverlayVariant.none,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: FeaturedEventPoster,
  path: '[Core primitives]/Product composites',
)
Widget catchCoverStoryContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'FeaturedEventPoster',
    contractId: 'catch.cover_story',
    states: const [
      'event-cover',
      'brand-cover',
      'with-chrome',
      'with-cta',
      'body-copy',
      'no-ghost-glyph',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'event-cover',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            activityKind: ActivityKind.socialRun,
            kicker: 'Tonight',
            title: 'Run the bridge before dinner',
            data: '7:30 PM - Free',
            data2: '18 going - 4 left',
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'brand-cover',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            title: 'Find the room where you actually talk',
            body: 'Hosted evenings, clubs, and small-group events.',
            showGhostGlyph: false,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-chrome',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            activityKind: ActivityKind.dinner,
            title: 'Supper club after work',
            location: 'Mumbai',
            onLocation: widgetbookNoop,
            showSearch: true,
            onSearch: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-cta',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            activityKind: ActivityKind.pickleball,
            kicker: 'Open court',
            title: 'Meet your next doubles partner',
            cta: 'Join the game',
            onCta: widgetbookNoop,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'body-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            activityKind: ActivityKind.pubQuiz,
            title: 'Trivia without the awkward table',
            body: 'Small teams rotate every round so everyone gets a turn.',
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'no-ghost-glyph',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: FeaturedEventPoster(
            activityKind: ActivityKind.yoga,
            title: 'Stretch into Sunday',
            showGhostGlyph: false,
          ),
        ),
      ),
    ],
  );
}
