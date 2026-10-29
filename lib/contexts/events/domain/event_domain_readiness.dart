import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

extension EventDomainReadiness on Event {
  bool get requiresRunPreferences {
    return switch (activityKind) {
      ActivityKind.socialRun || ActivityKind.running => true,
      _ => false,
    };
  }
}
