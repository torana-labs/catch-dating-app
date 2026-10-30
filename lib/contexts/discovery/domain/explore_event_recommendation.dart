import 'package:catch_dating_app/contexts/events/events.dart';

class ExploreEventRecommendation {
  const ExploreEventRecommendation({
    required this.event,
    required this.organizerName,
    required this.reasonLabel,
    required this.score,
  });

  final Event event;
  final String organizerName;
  final String reasonLabel;
  final double score;
}
