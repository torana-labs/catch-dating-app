import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

String routeMovementLabel(AppLocalizations l10n, RouteMovementMode value) =>
    switch (value) {
      RouteMovementMode.run => l10n.hostsRouteEventPlanMovementRun,
      RouteMovementMode.walk => l10n.hostsRouteEventPlanMovementWalk,
      RouteMovementMode.ride => l10n.hostsRouteEventPlanMovementRide,
      RouteMovementMode.mixed => l10n.hostsRouteEventPlanMovementMixed,
    };

String routeShapeLabel(AppLocalizations l10n, RouteShape value) =>
    switch (value) {
      RouteShape.loop => l10n.hostsRouteEventPlanShapeLoop,
      RouteShape.outAndBack => l10n.hostsRouteEventPlanShapeOutAndBack,
      RouteShape.pointToPoint => l10n.hostsRouteEventPlanShapePointToPoint,
    };

String routeGroupLabel(AppLocalizations l10n, RouteGroupStrategy value) =>
    switch (value) {
      RouteGroupStrategy.together => l10n.hostsRouteEventPlanGroupTogether,
      RouteGroupStrategy.paceGroups => l10n.hostsRouteEventPlanGroupPaceGroups,
      RouteGroupStrategy.selfDirected =>
        l10n.hostsRouteEventPlanGroupSelfDirected,
    };

String routeCadenceLabel(AppLocalizations l10n, RouteStopCadence value) =>
    switch (value) {
      RouteStopCadence.continuous => l10n.hostsRouteEventPlanCadenceContinuous,
      RouteStopCadence.flexibleStops => l10n.hostsRouteEventPlanCadenceFlexible,
      RouteStopCadence.hostedStops => l10n.hostsRouteEventPlanCadenceHosted,
    };

String routeStopLabel(AppLocalizations l10n, RouteStopKind value) =>
    switch (value) {
      RouteStopKind.water => l10n.hostsRouteEventPlanStopWater,
      RouteStopKind.regroup => l10n.hostsRouteEventPlanStopRegroup,
      RouteStopKind.venue => l10n.hostsRouteEventPlanStopVenue,
      RouteStopKind.photoSpot => l10n.hostsRouteEventPlanStopPhoto,
      RouteStopKind.viewpoint => l10n.hostsRouteEventPlanStopViewpoint,
      RouteStopKind.hazard => l10n.hostsRouteEventPlanStopHazard,
      RouteStopKind.turnaround => l10n.hostsRouteEventPlanStopTurnaround,
    };
