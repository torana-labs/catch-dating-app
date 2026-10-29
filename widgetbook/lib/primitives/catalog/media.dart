import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/widgets/activity_map_pin.dart';
import 'package:catch_dating_app/core/widgets/event_activity_badge.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:catch_dating_app/core/widgets/event_card.dart';
import 'package:catch_dating_app/core/widgets/event_thumbnail.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

const _activitySamples = <ActivityKind>[
  ActivityKind.socialRun,
  ActivityKind.pickleball,
  ActivityKind.dinner,
];

@widgetbook.UseCase(
  name: 'Catalog states',
  type: ActivityMapPin,
  path: '[Core catalog]/Activity',
)
Widget catchActivityMapPinCatalogStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'ActivityMapPin',
    catalogId: 'core.widgets.activity_map_pin',
    children: [
      WidgetbookCatalogStateCard(
        label: 'resting / selected / sized',
        child: WidgetbookContractWrap(
          children: [
            ActivityMapPin(activityKind: ActivityKind.socialRun),
            ActivityMapPin(
              activityKind: ActivityKind.pickleball,
              selected: true,
              label: '6 PM',
            ),
            ActivityMapPin(
              activityKind: ActivityKind.dinner,
              selected: true,
              size: 54,
              label: 'Tonight',
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchDistanceOverlay,
  path: '[Core catalog]/Activity',
)
Widget catchDistanceOverlayLabelCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchDistanceOverlay.label',
    catalogId: 'catch.distance_ring',
    children: [
      WidgetbookCatalogStateCard(
        label: 'resting / tappable',
        child: WidgetbookContractWrap(
          children: [
            const CatchDistanceOverlay.label(label: '3 km'),
            CatchDistanceOverlay.label(label: '5 km', onTap: widgetbookNoop),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchHeroImage,
  path: '[Core catalog]/Media',
)
Widget catchHeroImageCatalogStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'CatchHeroImage',
    catalogId: 'catch.detail_media',
    children: [
      WidgetbookCatalogStateCard(
        label: 'fallback / no scrim',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.surfaceCardWidth,
              height: WidgetbookPreviewLayout.compactCardHeight,
              child: ClipRRect(
                borderRadius: BorderRadius.all(Radius.circular(CatchRadius.md)),
                child: CatchHeroImage(),
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.surfaceCardWidth,
              height: WidgetbookPreviewLayout.compactCardHeight,
              child: ClipRRect(
                borderRadius: BorderRadius.all(Radius.circular(CatchRadius.md)),
                child: CatchHeroImage(showScrim: false),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventThumbnail,
  path: '[Core catalog]/Media',
)
Widget catchEventThumbnailCatalogStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'EventThumbnail',
    catalogId: 'core.widgets.event_thumbnail',
    children: [
      WidgetbookCatalogStateCard(
        label: 'fallback / scrims',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            _ThumbnailBox(
              child: EventThumbnail(
                photoUrl: null,
                pace: PaceLevel.easy,
                activityKind: ActivityKind.socialRun,
              ),
            ),
            _ThumbnailBox(
              child: EventThumbnail(
                photoUrl: null,
                pace: PaceLevel.moderate,
                activityKind: ActivityKind.dinner,
                scrim: CatchMediaOverlayVariant.full,
              ),
            ),
            _ThumbnailBox(
              child: EventThumbnail(
                photoUrl: null,
                pace: PaceLevel.fast,
                activityKind: ActivityKind.pickleball,
                scrim: CatchMediaOverlayVariant.none,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchGradedImage,
  path: '[Core catalog]/Media',
)
Widget catchGradedImageCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchGradedImage / CatchGrade',
    catalogId: 'core.widgets.catch_graded_image',
    children: [
      WidgetbookCatalogStateCard(
        label: 'raw / graded',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            _GradeSample(label: 'Raw', graded: false),
            _GradeSample(label: 'Graded', graded: true),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventBackdropImage,
  path: '[Core catalog]/Event cards',
)
Widget eventActivityBackdropCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventActivityVisualSpec / EventBackdropImage',
    catalogId: 'core.widgets.event_backdrop_image',
    children: [
      WidgetbookCatalogStateCard(
        label: 'patterns / dense / icon alignment',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            for (final kind in _activitySamples)
              ClipRRect(
                borderRadius: BorderRadius.circular(CatchRadius.md),
                child: SizedBox(
                  width: WidgetbookPreviewLayout.narrowComponentWidth,
                  height: WidgetbookPreviewLayout.catalogThumbnailHeight,
                  child: EventBackdropImage(
                    visual: eventActivityVisual(kind, context: context),
                    dense: kind != ActivityKind.socialRun,
                    iconAlignment: kind == ActivityKind.dinner
                        ? Alignment.topRight
                        : Alignment.bottomRight,
                  ),
                ),
              ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventCard,
  path: '[Core catalog]/Event cards',
)
Widget catchEventCardCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventCard',
    catalogId: 'core.widgets.event_card',
    children: [
      WidgetbookCatalogStateCard(
        label: 'ticket / status / compact width',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            EventCard(
              width: WidgetbookPreviewLayout.compactComponentWidth,
              title: 'Bandra easy 5K',
              subtitle: 'Hosted by Catch Run Club',
              timeLabel: '7:30 PM',
              countdownLabel: 'Tonight',
              priceLabel: 'Free',
              capacityLabel: '12 going / 4 left',
              activityKind: ActivityKind.socialRun,
              statusLabel: "You're in",
              onTap: widgetbookNoop,
            ),
            EventCard(
              width: WidgetbookPreviewLayout.compactComponentWidth,
              title: 'Pickleball doubles mixer',
              subtitle: 'Courtside social rotations',
              timeLabel: '6 PM',
              countdownLabel: 'Sat',
              priceLabel: '₹799',
              capacityLabel: '8 going / 2 left',
              activityKind: ActivityKind.pickleball,
              onTap: widgetbookNoop,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventActivityBadge,
  path: '[Core catalog]/Event cards',
)
Widget eventVisualAtomsCatalogStates(BuildContext context) {
  final visual = eventActivityVisual(ActivityKind.pickleball, context: context);
  return WidgetbookCatalogFrame(
    title: 'Event visual atoms',
    catalogId: 'core.widgets.event_activity_badge',
    children: [
      WidgetbookCatalogStateCard(
        label: 'stamp / clock / status pill',
        child: WidgetbookContractWrap(
          children: [
            EventActivityBadge(visual: visual),
            CatchClockIndicator(
              accent: visual.accent,
              time: const TimeOfDay(hour: 18, minute: 30),
              size: 42,
              centerDotRadius: 2,
            ),
            CatchBadge.ticketStatus(label: 'Going', color: visual.accent),
            CatchBadge.ticketStatus(
              label: 'Full',
              color: visual.accent,
              emphasis: CatchBadgeEmphasis.strong,
            ),
          ],
        ),
      ),
    ],
  );
}

class _ThumbnailBox extends StatelessWidget {
  const _ThumbnailBox({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(CatchRadius.md),
      child: SizedBox(
        width: WidgetbookPreviewLayout.narrowComponentWidth,
        height: WidgetbookPreviewLayout.catalogThumbnailHeight,
        child: child,
      ),
    );
  }
}

class _GradeSample extends StatelessWidget {
  const _GradeSample({required this.label, required this.graded});

  final String label;
  final bool graded;

  @override
  Widget build(BuildContext context) {
    final child = Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: CatchTokens.of(context).primary),
        Align(
          alignment: Alignment.bottomLeft,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s3),
            child: CatchBadge(label: label, tone: CatchBadgeTone.neutral),
          ),
        ),
      ],
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(CatchRadius.md),
      child: SizedBox(
        width: WidgetbookPreviewLayout.narrowComponentWidth,
        height: WidgetbookPreviewLayout.catalogSliverSpacerHeight,
        child: CatchGradedImage(enabled: graded, child: child),
      ),
    );
  }
}
