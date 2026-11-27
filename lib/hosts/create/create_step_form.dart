import 'package:catch_dating_app/hosts/create/create_basics_body.dart';
import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/create/hosted_event_membership_rules_section.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_route_plan_section.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:flutter/widgets.dart';

/// One step's form, for the expanded editor and the edit page. With [edit]
/// handlers it adds what only an edit shows: the place's name, member
/// pricing, and the route plan of a moving event.
class CreateStepForm extends StatelessWidget {
  const CreateStepForm({
    super.key,
    required this.state,
    required this.handlers,
    required this.step,
    required this.today,
    this.edit,
    this.showTitle = false,
    this.enableNetworkTiles = true,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final CreateStep step;
  final DateTime today;

  /// Set when the editor changes a saved event.
  final CreateEditHandlers? edit;
  final bool showTitle;

  /// False draws the maps' no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  @override
  Widget build(BuildContext context) {
    final edit = state.edit == null ? null : this.edit;
    final facts = state.edit;
    return switch (step) {
      CreateStep.basics => CreateBasicsBody(
        state: state,
        showTitle: showTitle,
        onName: handlers.onName,
        onFormat: handlers.onFormat,
        onDescription: handlers.onDescription,
        onDistance: handlers.onDistance,
        onPace: handlers.onPace,
        onAddPhoto: handlers.onAddPhoto,
        onIncluded: handlers.onIncluded,
        onAccessibility: handlers.onAccessibility,
      ),
      CreateStep.when => CreateWhenBody(
        state: state,
        today: today,
        showTitle: showTitle,
        enableNetworkTiles: enableNetworkTiles,
        onDate: handlers.onDate,
        onPickDate: handlers.onPickDate,
        onStart: handlers.onStart,
        onEnd: handlers.onEnd,
        onPlace: handlers.onPlace,
        onDirections: handlers.onDirections,
        onRepeat: edit == null ? handlers.onRepeat : null,
        onPlaceName: edit?.onPlaceName,
      ),
      CreateStep.tickets => CreateTicketsBody(
        state: state,
        showTitle: showTitle,
        onSellElsewhere: handlers.onSellElsewhere,
        onPrice: handlers.onPrice,
        onPlaces: handlers.onPlaces,
        policy: handlers.policy,
        onWaitlist: handlers.onWaitlist,
        onApproveEach: handlers.onApproveEach,
        onBookingLink: handlers.onBookingLink,
        trailing: [
          // Paid membership pricing is INR-only (Razorpay).
          if (edit != null && facts != null && facts.currencyCode == 'INR')
            HostedEventMembershipRulesSection(eventId: facts.event.id),
        ],
      ),
      CreateStep.plan || CreateStep.share => CreatePlanBody(
        state: state,
        showTitle: showTitle,
        onTemplate: handlers.onTemplate,
        onBlank: handlers.onBlank,
        onEdit: handlers.onEditStep,
        onAdd: handlers.onAddStep,
        onPlanVisible: edit == null ? handlers.onPlanVisible : null,
        trailing: [
          if (edit != null && facts != null)
            // The route plan of a moving event, or of any event that
            // already has one.
            if (facts.event.eventFormat.activityKind ==
                    ActivityKind.openActivity ||
                editRoutePlanOf(state.draft) != null)
              CreateRoutePlanSection(
                activityKind: facts.event.eventFormat.activityKind,
                plan: editRoutePlanOf(state.draft),
                onChanged: state.canChange ? edit.onRoutePlan : null,
                initialCenter: _routeCenter(state),
                enableNetworkTiles: enableNetworkTiles,
              ),
        ],
      ),
    };
  }
}

/// Where the route map opens: the event's place, or the market's city.
LocationCoordinate _routeCenter(CreateFlowState state) {
  final lat = state.draft.startingPointLat;
  final lng = state.draft.startingPointLng;
  if (lat != null && lng != null) return LocationCoordinate(lat, lng);
  final city = defaultCityDataForMarket();
  return LocationCoordinate(city.latitude, city.longitude);
}
