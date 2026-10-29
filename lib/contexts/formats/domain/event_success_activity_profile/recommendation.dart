part of '../event_success_activity_profile.dart';

class EventSuccessModuleRecommendation {
  const EventSuccessModuleRecommendation({
    required this.module,
    required this.level,
    required this.reason,
  });

  final EventSuccessModule module;
  final EventSuccessRecommendationLevel level;
  final String reason;

  bool get selectable => level.selectable;
  bool get selectedByDefault => level.selectedByDefault;
}
