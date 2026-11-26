import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_route_path_screen.dart';
import 'package:catch_dating_app/hosts/create/create_step_form.dart';
import 'package:catch_dating_app/hosts/create/edit_event_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_screen.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_route_plan_section.dart';
import 'package:catch_dating_app/hosts/create/widgets/edit_event_policy_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

final _validationEvent = widgetbookEditableEvent.copyWith(
  id: 'design-host-validation-event',
  meetingPoint: '',
  meetingLocation: const EventMeetingLocation(
    name: '',
    address: 'Carter Road, Bandra West',
    placeId: 'design-carter-road-empty-label',
    latitude: 19.0706,
    longitude: 72.8223,
    notes: 'Meet by the sea-facing steps',
  ),
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  distanceKm: 0,
);

final _selectedLocationEvent = widgetbookEditableEvent.copyWith(
  id: 'design-host-selected-location-event',
  meetingPoint: 'Carter Road Amphitheatre',
  meetingLocation: const EventMeetingLocation(
    name: 'Carter Road Amphitheatre',
    address: 'Carter Road, Bandra West',
    placeId: 'design-carter-road',
    latitude: 19.0706,
    longitude: 72.8223,
    notes: 'Meet by the sea-facing steps',
  ),
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  locationDetails: 'Meet by the sea-facing steps',
);

@widgetbook.UseCase(
  name: 'Route and section states',
  type: EditEventRouteScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostEditEventRouteAndFormStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EditEventRouteScreen',
    contractId: 'screen.host.event.edit',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            organizerValue: const AsyncLoading<Organizer?>(),
            eventValue: const AsyncLoading<Event?>(),
            child: EditEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
              eventId: widgetbookEditableEvent.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            organizerValue: AsyncError<Organizer?>(
              StateError('Club fetch failed'),
              StackTrace.empty,
            ),
            child: EditEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
              eventId: widgetbookEditableEvent.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            organizerValue: AsyncError<Organizer?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
            child: EditEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
              eventId: widgetbookEditableEvent.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event not found',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            eventValue: const AsyncData<Event?>(null),
            child: EditEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
              eventId: widgetbookEditableEvent.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'unauthorized host',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            uid: HostOperationsFixtures.guestUid,
            child: EditEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
              eventId: widgetbookEditableEvent.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'editable prefilled form',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookEditableEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'schedule locked form',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookPrivateEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'cancelled disabled form',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: HostOperationsFixtures.cancelledEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'private access loading',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            privateAccessValue: const AsyncLoading<EventPrivateAccess?>(),
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookPrivateEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'validation errors',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: _validationEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'selected location',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: _selectedLocationEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _HostEditEventScope(
              child: EditEventScreen(
                organizer: widgetbookOrganizer,
                event: widgetbookEditableEvent,
                enableNetworkTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _HostEditEventScope(
              child: EditEventScreen(
                organizer: widgetbookOrganizer,
                event: widgetbookEditableEvent,
                enableNetworkTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            themeMode: ThemeMode.dark,
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookEditableEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Direct screen states',
  type: EditEventScreen,
  path: '[P1 product surfaces]/Host edit event',
)
Widget editHostedEventScreenCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EditEventScreen',
    contractId: 'screen.host.event.edit.form',
    children: [
      WidgetbookPageStateCard(
        label: 'editable',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookEditableEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'policy locked',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: EditEventScreen(
              organizer: widgetbookOrganizer,
              event: widgetbookPrivateEvent,
              enableNetworkTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Scope notice states',
  type: EditEventScopeNotice,
  path: '[P1 product surfaces]/Host edit event',
)
Widget editEventScopeNoticeCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EditEventScopeNotice',
    contractId: 'component.host.event.edit_scope_notice',
    children: [
      WidgetbookPageStateCard(
        label: 'fully editable',
        child: WidgetbookHostDeviceFrame(
          child: EditEventScopeNotice(
            state: _editState(widgetbookEditableEvent),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'schedule locked',
        child: WidgetbookHostDeviceFrame(
          child: EditEventScopeNotice(
            state: _editState(widgetbookPrivateEvent),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'cancelled with a save error',
        child: WidgetbookHostDeviceFrame(
          child: EditEventScopeNotice(
            state: _editState(
              HostOperationsFixtures.cancelledEvent,
            ).copyWith(error: StateError('Event update failed')),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Policy states',
  type: EditEventPolicySection,
  path: '[P1 product surfaces]/Host edit event',
)
Widget editEventPolicySectionCatalogStates(BuildContext context) {
  EditEventPolicySection section(EventDraft Function(EventDraft) change) {
    final state = _editState(widgetbookEditableEvent);
    return EditEventPolicySection(
      state: state.copyWith(draft: change(state.draft)),
      handlers: _editHandlers,
    );
  }

  return WidgetbookPageCatalogFrame(
    title: 'EditEventPolicySection',
    contractId: 'component.host.event.policy_section.editable',
    children: [
      WidgetbookPageStateCard(
        label: 'open capacity',
        child: WidgetbookHostDeviceFrame(child: section((d) => d)),
      ),
      WidgetbookPageStateCard(
        label: 'open capacity with cohort caps',
        child: WidgetbookHostDeviceFrame(
          child: section(
            (d) => d.copyWith(
              admissionPreset: editFixedCohortCapsPreset,
              maxMen: '12',
              maxWomen: '12',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'invite only',
        child: WidgetbookHostDeviceFrame(
          child: section(
            (d) => d.copyWith(
              admissionPreset: EventAdmissionPreset.inviteOnly.name,
              inviteCode: 'SEAFACE',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'request to join',
        child: WidgetbookHostDeviceFrame(
          child: section(
            (d) => d.copyWith(
              admissionPreset: EventAdmissionPreset.requestToJoin.name,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'balanced singles with demand pricing',
        child: WidgetbookHostDeviceFrame(
          child: section(
            (d) => d.copyWith(
              admissionPreset: EventAdmissionPreset.balancedSingles.name,
              dynamicPricingEnabled: true,
              dynamicPricingStep: '250',
              dynamicPricingMax: '1500',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'locked policy',
        child: WidgetbookHostDeviceFrame(
          child: EditEventPolicySection(
            state: _editState(widgetbookPrivateEvent),
            handlers: _editHandlers,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Step form states',
  type: CreateStepForm,
  path: '[P1 product surfaces]/Host edit event',
)
Widget createStepFormCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateStepForm',
    contractId: 'screen.host.event.edit.form',
    children: [
      for (final step in const [
        CreateStep.basics,
        CreateStep.when,
        CreateStep.tickets,
        CreateStep.plan,
      ])
        WidgetbookPageStateCard(
          label: 'edit ${step.name}',
          child: WidgetbookHostDeviceFrame(
            child: _HostEditEventScope(
              child: SingleChildScrollView(
                child: CreateStepForm(
                  state: _editState(widgetbookEditableEvent),
                  handlers: _createHandlers,
                  step: step,
                  today: HostOperationsFixtures.now,
                  edit: _editHandlers,
                  showTitle: true,
                  enableNetworkTiles: false,
                ),
              ),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Edit page',
  type: EditEventBody,
  path: '[P1 product surfaces]/Host edit event',
)
Widget editEventBodyCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EditEventBody',
    contractId: 'screen.host.event.edit.form',
    children: [
      WidgetbookPageStateCard(
        label: 'editable',
        child: WidgetbookHostDeviceFrame(
          child: _HostEditEventScope(
            child: SingleChildScrollView(
              child: EditEventBody(
                state: _editState(widgetbookEditableEvent),
                handlers: _createHandlers,
                edit: _editHandlers,
                today: HostOperationsFixtures.now,
                enableNetworkTiles: false,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route plan states',
  type: CreateRoutePlanSection,
  path: '[P1 product surfaces]/Host edit event',
)
Widget createRoutePlanSectionCatalogStates(BuildContext context) {
  const center = LocationCoordinate(19.0706, 72.8223);
  return WidgetbookPageCatalogFrame(
    title: 'CreateRoutePlanSection',
    contractId: 'component.host.event.route_plan_section',
    children: [
      WidgetbookPageStateCard(
        label: 'off',
        child: WidgetbookHostDeviceFrame(
          child: CreateRoutePlanSection(
            activityKind: ActivityKind.openActivity,
            plan: null,
            onChanged: (_) {},
            initialCenter: center,
            enableNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'social run plan',
        child: WidgetbookHostDeviceFrame(
          child: CreateRoutePlanSection(
            activityKind: ActivityKind.socialRun,
            plan: RouteEventPlan.socialRun,
            onChanged: (_) {},
            initialCenter: center,
            enableNetworkTiles: false,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route path states',
  type: CreateRoutePathScreen,
  path: '[P1 product surfaces]/Host edit event',
)
Widget createRoutePathScreenCatalogStates(BuildContext context) {
  const center = LocationCoordinate(19.0706, 72.8223);
  return const WidgetbookPageCatalogFrame(
    title: 'CreateRoutePathScreen',
    contractId: 'component.host.event.route_path_screen',
    children: [
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookHostDeviceFrame(
          child: CreateRoutePathScreen(
            initialCenter: center,
            enableNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'drawn route',
        child: WidgetbookHostDeviceFrame(
          child: CreateRoutePathScreen(
            initialCenter: center,
            initialPath: [
              RoutePoint(latitude: 19.0706, longitude: 72.8223),
              RoutePoint(latitude: 19.0756, longitude: 72.8253),
              RoutePoint(latitude: 19.0801, longitude: 72.8291),
            ],
            enableNetworkTiles: false,
          ),
        ),
      ),
    ],
  );
}

/// The editor's state for [event], opened the day before the fixtures' now.
CreateFlowState _editState(Event event) {
  final now = HostOperationsFixtures.now;
  return CreateFlowState(
    organizer: widgetbookOrganizer,
    draft: editDraftFromEvent(event, savedAt: now),
    eventId: event.id,
    edit: CreateEditFacts(
      event: event,
      scheduleLocked: editEventScheduleLocked(event, now),
      policyLocked: editEventPolicyLocked(event, now),
    ),
  );
}

void _ignore([Object? _, Object? _]) {}

Future<EventMeetingLocation?> _noPlace(EventMeetingLocation? _) async => null;

final _createHandlers = CreateHandlers(
  onBack: _ignore,
  onNext: _ignore,
  onSaveDraft: _ignore,
  onStep: _ignore,
  onName: _ignore,
  onFormat: _ignore,
  onDescription: _ignore,
  onDistance: _ignore,
  onPace: _ignore,
  onAddPhoto: _ignore,
  onDate: _ignore,
  onPickDate: _ignore,
  onStart: _ignore,
  onEnd: _ignore,
  onPlace: _ignore,
  onDirections: _ignore,
  onSellElsewhere: _ignore,
  onPrice: _ignore,
  onPlaces: _ignore,
  onAdmission: _ignore,
  onTemplate: _ignore,
  onBlank: _ignore,
  onEditStep: _ignore,
  onAddStep: _ignore,
  onCopyLink: _ignore,
  onPrint: _ignore,
  onShareStory: _ignore,
  onShareWhatsApp: _ignore,
  onDone: _ignore,
);

const _editHandlers = CreateEditHandlers(
  onSave: _ignore,
  onPlaceName: _ignore,
  onIncluded: _ignore,
  onAccessibility: _ignore,
  onRoutePlan: _ignore,
  onAdmission: _ignore,
  onInviteCode: _ignore,
  onCohortCaps: _ignore,
  onMaxMen: _ignore,
  onMaxWomen: _ignore,
  onDemandPricing: _ignore,
  onDemandStep: _ignore,
  onDemandMax: _ignore,
  onAgeRange: _ignore,
  onCancellationPolicy: _ignore,
  onPickStepPlace: _noPlace,
);

class _HostEditEventScope extends StatelessWidget {
  const _HostEditEventScope({
    required this.child,
    this.uid,
    this.organizerValue,
    this.eventValue,
    this.privateAccessValue,
    this.themeMode = ThemeMode.light,
  });

  final Widget child;
  final String? uid;
  final AsyncValue<Organizer?>? organizerValue;
  final AsyncValue<Event?>? eventValue;
  final AsyncValue<EventPrivateAccess?>? privateAccessValue;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid ?? widgetbookHostUid;
    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
          watchOrganizerProvider(widgetbookOrganizer.id).overrideWithValue(
            organizerValue ?? AsyncData<Organizer?>(widgetbookOrganizer),
          ),
          watchEventProvider(widgetbookEditableEvent.id).overrideWithValue(
            eventValue ?? AsyncData<Event?>(widgetbookEditableEvent),
          ),
          watchEventProvider(
            widgetbookPrivateEvent.id,
          ).overrideWithValue(AsyncData<Event?>(widgetbookPrivateEvent)),
          watchEventPrivateAccessProvider(
            widgetbookPrivateEvent.id,
          ).overrideWithValue(
            privateAccessValue ??
                AsyncData<EventPrivateAccess?>(
                  HostOperationsFixtures.privateAccess,
                ),
          ),
        ],
        child: WidgetbookThemedHostPreview(themeMode: themeMode, child: child),
      ),
    );
  }
}
