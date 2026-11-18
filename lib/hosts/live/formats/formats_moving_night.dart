import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

/// Which rebuilt console a night that moves runs on.
enum HostMovingNightView {
  /// Runs and other nights in pace pods: the run console, then the sweep.
  run,

  /// Crawls and other nights with located stops: the crawl board, then the
  /// sweep.
  crawl,
}

/// The rebuilt console for a night the one-room live console does not fit
/// (`hostLiveConsoleFits`), or null for a night that does not move.
///
/// Pace pods or pace groups get the run console; a crawl or located stops
/// get the crawl board; any other sweep or live-tracking night gets the run
/// console, which works without pods.
HostMovingNightView? hostMovingNightView(
  Event event, {
  EventSuccessPlan? plan,
}) {
  final model = event.eventFormat.interactionModel;
  final route = event.eventFormat.routePlan;
  final paceGroups =
      route?.groupStrategy == RouteGroupStrategy.paceGroups &&
      (route?.paceGroups.isNotEmpty ?? false);
  if (model == EventInteractionModel.pacePods || paceGroups) {
    return HostMovingNightView.run;
  }
  if (model == EventInteractionModel.routeStops ||
      event.itinerary.any((stop) => stop.location != null)) {
    return HostMovingNightView.crawl;
  }
  final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
  if (profile.accountability == EventSuccessAccountability.sweep ||
      hostMovingNightTracksLocation(event)) {
    return HostMovingNightView.run;
  }
  return null;
}

/// The night shares the host's live location with guests.
bool hostMovingNightTracksLocation(Event event) =>
    event.eventFormat.routePlan?.liveTrackingPolicy.enabled ?? false;
