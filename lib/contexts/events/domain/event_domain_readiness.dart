import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';

extension EventDomainReadiness on Event {
  bool get requiresRunPreferences {
    return switch (activityKind) {
      ActivityKind.socialRun || ActivityKind.running => true,
      _ => false,
    };
  }
}
