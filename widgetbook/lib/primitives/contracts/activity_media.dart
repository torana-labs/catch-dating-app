import 'package:catch_dating_app/contexts/events/parts/activity_map_pin.dart';
import 'package:catch_dating_app/contexts/events/parts/event_activity_badge.dart';
import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/contexts/events/parts/event_card.dart';
import 'package:catch_dating_app/contexts/events/parts/event_thumbnail.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/map_preview.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: OrganizerCover,
  path: '[Core primitives]/Media',
)
Widget catchOrganizerCoverContractStates(BuildContext context) {
  final fallbackOrganizer = Organizer(
    id: 'contract-cover-fallback',
    name: 'Sea Face Social',
    description: 'A social movement club.',
    location: 'Mumbai',
    area: 'Bandra',
    createdAt: DateTime(2026),
  );
  final photoOrganizer = fallbackOrganizer.copyWith(
    id: 'contract-cover-photo',
    imageUrl:
        'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=720&q=80',
  );
  return WidgetbookContractFrame(
    title: 'OrganizerCover',
    contractId: 'catch.club_cover',
    states: const ['photo', 'fallback', 'compact', 'error-fallback'],
    children: [
      WidgetbookContractStateCard(
        label: 'photo',
        child: SizedBox(
          width: WidgetbookPreviewLayout.organizerCoverWidth,
          height: WidgetbookPreviewLayout.organizerCoverHeight,
          child: OrganizerCover(organizer: photoOrganizer),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'fallback',
        child: SizedBox(
          width: WidgetbookPreviewLayout.organizerCoverWidth,
          height: WidgetbookPreviewLayout.organizerCoverHeight,
          child: OrganizerCover(organizer: fallbackOrganizer),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'compact',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.organizerCoverCompactExtent,
          child: OrganizerCover(organizer: fallbackOrganizer, compact: true),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPoster,
  path: '[Core primitives]/Media',
)
Widget catchOrganizerPosterContractStates(BuildContext context) {
  final organizer = Organizer(
    id: 'contract-organizer-poster',
    name: 'Sea Face Social',
    description: 'Bombay moves together.',
    location: 'Mumbai',
    area: 'Bandra',
    createdAt: DateTime(2026),
  );
  Widget poster({
    CatchPosterVariant variant = CatchPosterVariant.editorial,
    CatchPosterTone tone = CatchPosterTone.paper,
  }) {
    return CatchPoster(
      media: OrganizerPlaceholderCover(organizer: organizer),
      kicker: 'Run club · Mumbai',
      title: organizer.name,
      tagline: organizer.description,
      meta: 'Every Saturday · 6:30 AM',
      variant: variant,
      tone: tone,
    );
  }

  return WidgetbookContractFrame(
    title: 'CatchPoster',
    contractId: 'catch.organizer_poster',
    states: const [
      'editorial-paper',
      'photo-ink',
      'split-signal',
      'minimal-paper',
      'photo',
      'fallback-artwork',
      'with-footer',
      'long-copy',
    ],
    children: [
      WidgetbookContractStateCard(label: 'editorial-paper', child: poster()),
      WidgetbookContractStateCard(
        label: 'photo-ink',
        child: poster(
          variant: CatchPosterVariant.photo,
          tone: CatchPosterTone.ink,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'split-signal',
        child: poster(
          variant: CatchPosterVariant.split,
          tone: CatchPosterTone.signal,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'minimal-paper',
        child: poster(variant: CatchPosterVariant.minimal),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPolaroid,
  path: '[Core primitives]/Media',
)
Widget catchPolaroidContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookContractFrame(
    title: 'CatchPolaroid',
    contractId: 'catch.person_polaroid',
    states: const [
      'photo',
      'fallback-artwork',
      'read-only',
      'reactable',
      'long-copy',
      'text-scale',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'read-only',
        child: CatchPolaroid(
          media: ColoredBox(
            color: t.primarySoft,
            child: Icon(
              CatchIcons.person,
              size: CatchSpacing.s16,
              color: t.primary,
            ),
          ),
          kicker: 'Was at · Sundowner 5K',
          name: 'Maya, 29',
          meta: 'Designer · Bandra',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'reactable',
        child: CatchPolaroid(
          media: ColoredBox(
            color: t.raised,
            child: Icon(
              CatchIcons.person,
              size: CatchSpacing.s16,
              color: t.ink3,
            ),
          ),
          mediaOverlay: Align(
            alignment: Alignment.topRight,
            child: Padding(
              padding: CatchInsets.contentDense,
              child: CatchBadge.solid(label: 'LIKE'),
            ),
          ),
          kicker: 'Crossed paths',
          name: 'A long profile name, 31',
          meta: 'Runner · Lower Parel',
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: MapPreview,
  path: '[Core primitives]/Product composites',
)
Widget catchMapPreviewContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'MapPreview',
    contractId: 'catch.map_preview',
    states: [
      'exact-location',
      'missing-coordinate',
      'network-disabled',
      'android-lite-mode',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'exact-location / network-disabled',
        child: SizedBox(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: MapPreview(
            coordinate: LocationCoordinate(19.076, 72.8777),
            fallbackLabel: 'Bandra meeting point',
            enableNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'missing-coordinate',
        child: SizedBox(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: MapPreview(
            coordinate: null,
            fallbackLabel: 'Location unavailable',
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: EventCard,
  path: '[Core primitives]/Product composites',
)
Widget catchEventCardContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'EventCard',
    contractId: 'catch.event_card',
    states: const ['ticket', 'ticket-status', 'long-copy'],
    children: [
      const WidgetbookContractStateCard(
        label: 'ticket',
        child: EventCard(
          title: 'Sundowner 5K',
          subtitle: 'Marine Drive',
          timeLabel: '7:30 PM',
          countdownLabel: 'Tonight',
          priceLabel: 'Free',
          capacityLabel: '18 going',
          activityKind: ActivityKind.socialRun,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'ticket-status',
        child: EventCard(
          title: 'Doubles ladder',
          subtitle: 'Versova Padel',
          timeLabel: '9:00 AM',
          countdownLabel: 'Tomorrow',
          priceLabel: '₹900',
          capacityLabel: '4 left',
          activityKind: ActivityKind.padel,
          statusLabel: 'Booked',
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'long-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.codeInputWidth,
          child: EventCard(
            title: 'A very long event name that should wrap without clipping',
            subtitle: 'A long venue name near the waterfront',
            timeLabel: '7:30 PM',
            countdownLabel: 'This weekend',
            priceLabel: 'Free',
            capacityLabel: '18 going',
            activityKind: ActivityKind.socialRun,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: EventActivityBadge,
  path: '[Core primitives]/Product composites',
)
Widget eventActivityStampContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'EventActivityBadge',
    contractId: 'catch.event_card.activity_stamp',
    states: const ['default', 'custom-size', 'activity-variants'],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: EventActivityBadge(
          visual: eventActivityVisual(ActivityKind.socialRun, context: context),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-size',
        child: EventActivityBadge(
          visual: eventActivityVisual(ActivityKind.dinner, context: context),
          size: 64,
          iconSize: 30,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'activity-variants',
        child: WidgetbookContractWrap(
          children: [
            EventActivityBadge(
              visual: eventActivityVisual(
                ActivityKind.socialRun,
                context: context,
              ),
            ),
            EventActivityBadge(
              visual: eventActivityVisual(
                ActivityKind.dinner,
                context: context,
              ),
            ),
            EventActivityBadge(
              visual: eventActivityVisual(
                ActivityKind.pickleball,
                context: context,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: EventFallbackThumbnail,
  path: '[Core primitives]/Media',
)
Widget catchEventThumbnailActivityFallbackContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'EventFallbackThumbnail',
    contractId: 'catch.event_card.event_thumbnail.activity_fallback',
    states: ['run', 'dinner', 'large-icon'],
    children: [
      WidgetbookContractStateCard(
        label: 'activity fallbacks',
        child: WidgetbookContractWrap(
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.thumbnailWidth,
              height: WidgetbookPreviewLayout.thumbnailHeight,
              child: EventFallbackThumbnail(
                activityKind: ActivityKind.socialRun,
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.thumbnailWidth,
              height: WidgetbookPreviewLayout.thumbnailHeight,
              child: EventFallbackThumbnail(activityKind: ActivityKind.dinner),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.thumbnailWidth,
              height: WidgetbookPreviewLayout.thumbnailHeight,
              child: EventFallbackThumbnail(
                activityKind: ActivityKind.pickleball,
                iconSize: 92,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: ActivityMapPin,
  path: '[Core primitives]/Activity',
)
Widget catchActivityMapPinContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'ActivityMapPin',
    contractId: 'catch.activity_map_pin',
    states: ['resting', 'selected', 'selected-label', 'custom-size'],
    children: [
      WidgetbookContractStateCard(
        label: 'resting',
        child: ActivityMapPin(activityKind: ActivityKind.socialRun),
      ),
      WidgetbookContractStateCard(
        label: 'selected',
        child: ActivityMapPin(
          activityKind: ActivityKind.pickleball,
          selected: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selected-label',
        child: ActivityMapPin(
          activityKind: ActivityKind.dinner,
          selected: true,
          label: 'Dinner',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-size',
        child: ActivityMapPin(activityKind: ActivityKind.pubQuiz, size: 44),
      ),
    ],
  );
}
