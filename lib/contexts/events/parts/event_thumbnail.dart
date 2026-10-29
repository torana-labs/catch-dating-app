import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/contexts/events/parts/event_backdrop_image.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

export 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart'
    show activityKindGlyph;

/// Shared image/fallback primitive for any event-card surface.
///
/// Renders [photoUrl] when present, otherwise the shared activity visual
/// backdrop for [activityKind] so no-photo states match Explore cards and the
/// event detail header.
class EventThumbnail extends StatelessWidget {
  const EventThumbnail({
    super.key,
    required this.photoUrl,
    required this.pace,
    required this.activityKind,
    this.scrim = CatchMediaOverlayVariant.bottom,
    this.fit = BoxFit.cover,
    this.iconAlignment = Alignment.bottomRight,
    this.preferActivityArtwork = false,
    this.fallbackIconSize,
    this.fallbackIconOpacity = CatchOpacity.fallbackArtworkIcon,
    this.fallbackPatternOpacity = CatchOpacity.ticketPerforationLine,
  });

  final String? photoUrl;
  final PaceLevel pace;
  final ActivityKind activityKind;
  final CatchMediaOverlayVariant scrim;
  final BoxFit fit;
  final Alignment iconAlignment;
  final bool preferActivityArtwork;
  final double? fallbackIconSize;
  final double fallbackIconOpacity;
  final double fallbackPatternOpacity;

  @override
  Widget build(BuildContext context) {
    final url = photoUrl?.trim();
    final hasPhoto = !preferActivityArtwork && url != null && url.isNotEmpty;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (hasPhoto)
          CatchGradedImage(
            child: CatchNetworkImage(
              url,
              fit: fit,
              errorBuilder: (context, _, _) => EventFallbackThumbnail(
                activityKind: activityKind,
                iconAlignment: iconAlignment,
                iconSize: fallbackIconSize,
                iconOpacity: fallbackIconOpacity,
                patternOpacity: fallbackPatternOpacity,
              ),
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return EventFallbackThumbnail(
                  activityKind: activityKind,
                  iconAlignment: iconAlignment,
                  iconSize: fallbackIconSize,
                  iconOpacity: fallbackIconOpacity,
                  patternOpacity: fallbackPatternOpacity,
                );
              },
            ),
          )
        else
          EventFallbackThumbnail(
            activityKind: activityKind,
            iconAlignment: iconAlignment,
            iconSize: fallbackIconSize,
            iconOpacity: fallbackIconOpacity,
            patternOpacity: fallbackPatternOpacity,
          ),
        if (scrim != CatchMediaOverlayVariant.none)
          CatchMediaOverlay.thumbnail(variant: scrim),
      ],
    );
  }
}

class EventFallbackThumbnail extends StatelessWidget {
  const EventFallbackThumbnail({
    super.key,
    required this.activityKind,
    this.iconAlignment = Alignment.bottomRight,
    this.iconSize,
    this.iconOpacity = CatchOpacity.fallbackArtworkIcon,
    this.patternOpacity = CatchOpacity.ticketPerforationLine,
  });

  final ActivityKind activityKind;
  final Alignment iconAlignment;
  final double? iconSize;
  final double iconOpacity;
  final double patternOpacity;

  @override
  Widget build(BuildContext context) {
    return EventBackdropImage(
      visual: eventActivityVisual(activityKind, context: context),
      dense: true,
      iconAlignment: iconAlignment,
      iconSize: iconSize ?? CatchLayout.eventThumbnailBackdropIconSize,
      iconOpacity: iconOpacity,
      patternOpacity: patternOpacity,
    );
  }
}
