import 'package:catch_dating_app/hosts/create/create_basics_body.dart';
import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_route_plan_section.dart';
import 'package:catch_dating_app/hosts/create/widgets/edit_event_policy_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_membership_rules_section.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// One step's form, for the expanded editor and the edit page. With [edit]
/// handlers it adds what only an edit shows: the place's name, what is
/// included and accessibility, the event policy and member pricing, and the
/// route plan of a moving event.
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
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final disabled = <WidgetState>{if (!state.canChange) WidgetState.disabled};
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
        trailing: [
          // What is included and how accessible it is, shown on the event.
          if (edit != null) ...[
            CatchText(
              l10n.hostsEventGuestDetailsTitle,
              variant: CatchTextVariant.labelAction,
            ),
            CatchFieldLanes.single(
              child: CatchField.input(
                key: CreateEventFormKeys.included,
                copy: copy,
                title: l10n.hostsEventIncludedTitle,
                helperText: l10n.hostsEventGuestDetailsVisibility,
                placeholder: l10n.hostsEventIncludedHint,
                contract: CatchContractConstraints
                    .createEventCallablePayloadEventFormatActivityDetailsPublicDetailsIncluded,
                labelMode: CatchFieldLabelTextMode.optional,
                initialValue: state.draft.included ?? '',
                states: disabled,
                minLines: 2,
                maxLines: 4,
                keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                onChanged: edit.onIncluded,
              ),
            ),
            CatchFieldLanes.single(
              child: CatchField.input(
                key: CreateEventFormKeys.accessibility,
                copy: copy,
                title: l10n.hostsEventAccessibilityTitle,
                placeholder: l10n.hostsEventAccessibilityHint,
                contract: CatchContractConstraints
                    .createEventCallablePayloadEventFormatActivityDetailsPublicDetailsAccessibility,
                labelMode: CatchFieldLabelTextMode.optional,
                initialValue: state.draft.accessibility ?? '',
                states: disabled,
                minLines: 2,
                maxLines: 4,
                keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                onChanged: edit.onAccessibility,
              ),
            ),
          ],
        ],
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
        onAdmission: handlers.onAdmission,
        onWaitlist: handlers.onWaitlist,
        onApproveEach: handlers.onApproveEach,
        onBookingLink: handlers.onBookingLink,
        trailing: [
          if (edit != null && facts != null) ...[
            EditEventPolicySection(state: state, handlers: edit),
            // Paid membership pricing is INR-only (Razorpay).
            if (facts.currencyCode == 'INR')
              HostedEventMembershipRulesSection(eventId: facts.event.id),
          ],
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
