import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/widgets/event_thumbnail.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:flutter/material.dart';

/// Hero visual for the event detail screen.
///
/// Wraps [EventThumbnail] so real event photos lead when available, with
/// the shared activity artwork retained as the no-photo fallback.
class EventPhotoHeader extends StatelessWidget {
  const EventPhotoHeader({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    return Hero(
      tag: eventPhotoHeroTag(event.id),
      transitionOnUserGestures: true,
      child: EventThumbnail(
        photoUrl: event.primaryPhotoUrl,
        pace: event.pace,
        activityKind: event.activityKind,
      ),
    );
  }
}
