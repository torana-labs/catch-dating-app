import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_capacity_labels.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_card.dart';
import 'package:catch_dating_app/events/shared/event_price_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Explore recommendation card.
///
/// Wraps [EventCard] so the recommendation rail uses the same activity
/// artwork and ticket shape as the Explore event feed. Recommendation reason
/// stays visible in the media label while distance, pace, and capacity are
/// folded into the ticket's bottom mono line.
class RecommendCard extends StatelessWidget {
  const RecommendCard({
    super.key,
    required this.event,
    this.organizerName,
    this.reasonLabel,
    this.width,
  }) : _loading = false;

  RecommendCard.loading({super.key, this.width})
    : event = Event(
        id: 'loading',
        clubId: 'loading',
        name: CatchSkeleton.sampleRecommendationTitle,
        startTime: DateTime.now().add(const Duration(days: 1)),
        endTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
        meetingPoint: CatchSkeleton.sampleLocationText,
        distanceKm: 0,
        pace: PaceLevel.easy,
        capacityLimit: 0,
        description: '',
        priceInPaise: 0,
      ),
      organizerName = CatchSkeleton.sampleOrganizerName,
      reasonLabel = CatchSkeleton.sampleReasonText,
      _loading = true;

  factory RecommendCard.fromRecommendation({
    Key? key,
    required ExploreEventRecommendation recommendation,
    double? width,
  }) {
    return RecommendCard(
      key: key,
      event: recommendation.event,
      organizerName: recommendation.organizerName,
      reasonLabel: recommendation.reasonLabel,
      width: width,
    );
  }

  factory RecommendCard.fromEvent({
    Key? key,
    required Event event,
    double? width,
  }) {
    return RecommendCard(
      key: key,
      event: event,
      organizerName: 'Your organizer',
      reasonLabel: 'From your organizers',
      width: width,
    );
  }

  final Event event;
  final String? organizerName;
  final String? reasonLabel;
  final double? width;
  final bool _loading;

  @override
  Widget build(BuildContext context) {
    final cardWidth = width;
    final card = EventCard(
      title: event.title,
      subtitle: _buildSubtitle(),
      timeLabel: EventFormatters.time(event.startTime),
      countdownLabel: _countdownLabel(),
      priceLabel: eventPriceLabel(context.l10n, event),
      capacityLabel: _capacityLabel(),
      activityKind: event.activityKind,
      statusLabel: reasonLabel,
      clockTime: TimeOfDay.fromDateTime(event.startTime),
      onTap: () => context.pushNamed(
        Routes.dashboardEventDetailScreen.name,
        pathParameters: {'organizerId': event.clubId, 'eventId': event.id},
        extra: event,
      ),
    );

    final rendered = cardWidth == null
        ? card
        : SizedBox(width: cardWidth, child: card);
    return _loading ? CatchSkeleton.content(child: rendered) : rendered;
  }

  String _buildSubtitle() {
    final organizer = organizerName;
    if (organizer == null || organizer.isEmpty) return event.locationName;
    return '$organizer · ${event.locationName}';
  }

  String _countdownLabel() {
    final start = event.startTime;
    final relative = _relativeCountdownLabel(start);
    if (relative != null) return relative;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final eventDay = DateTime(start.year, start.month, start.day);
    final diffDays = eventDay.difference(today).inDays;
    return switch (diffDays) {
      0 => 'Today',
      1 => 'Tomorrow',
      _ => EventFormatters.shortWeekday(start),
    };
  }

  String? _relativeCountdownLabel(DateTime startTime) {
    final delta = startTime.difference(DateTime.now());
    if (delta.inMinutes <= 0 || delta.inHours >= 24) return null;
    if (delta.inHours < 1) return 'In ${delta.inMinutes}m';
    final minutes = delta.inMinutes.remainder(60);
    if (minutes == 0) return 'In ${delta.inHours}h';
    return 'In ${delta.inHours}h ${minutes}m';
  }

  String _capacityLabel() {
    return EventCapacityLabels(event).activityGoingAvailabilityLabel();
  }
}
