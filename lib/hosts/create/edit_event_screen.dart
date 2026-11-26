import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/events/events.dart'
    show LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/create/create_draft_values.dart';
import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_editor_screen.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_controller.dart';
import 'package:catch_dating_app/hosts/create/edit_event_state.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_calendar_sheet.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_plan_step_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_kernel/business_rules.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The edit route: reads the signed-in host, the organizer and the event,
/// and opens [EditEventScreen] once the host is on the organizer's team.
/// A passed-in event shows while the event loads.
class EditEventRouteScreen extends ConsumerWidget {
  const EditEventRouteScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.initialEvent,
  });

  final String organizerId;
  final String eventId;
  final Event? initialEvent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = EditEventRouteState.resolve(
      uid: catchAsyncStateFromAsyncValue(ref.watch(uidProvider)),
      organizer: catchAsyncStateFromAsyncValue(
        ref.watch(watchOrganizerProvider(organizerId)),
      ),
      event: catchAsyncStateFromAsyncValue(
        ref.watch(watchEventProvider(eventId)),
      ),
      initialEvent: initialEvent,
    );
    if (state.status == EditEventRouteStatus.ready) {
      return EditEventScreen(organizer: state.organizer!, event: state.event!);
    }
    final l10n = context.l10n;
    final Widget body = switch (state.status) {
      EditEventRouteStatus.loading => const CatchLoadingIndicator(),
      EditEventRouteStatus.error => CatchLocalizedErrorState(
        state.error!,
        context: AppErrorContext.event,
        onRetry: () {
          ref.invalidate(watchOrganizerProvider(organizerId));
          ref.invalidate(watchEventProvider(eventId));
        },
      ),
      EditEventRouteStatus.notFound => CatchEmptyState(
        icon: CatchIcons.eventUnavailable,
        title: l10n.hostsEditHostedEventRouteScreenTitleEventNotFound,
        message: l10n.hostsEditHostedEventRouteScreenMessageThisHostedEventIs,
      ),
      EditEventRouteStatus.unauthorized ||
      EditEventRouteStatus.ready => CatchEmptyState(
        icon: CatchIcons.block,
        title: l10n.hostsEditHostedEventRouteScreenTitleActionUnavailable,
        message: l10n.hostsEditHostedEventRouteScreenMessageYouCanEditOnly,
      ),
    };
    return CatchRoot(
      child: CatchScreen(
        key: ValueKey<String>('edit-event-route-${state.status.name}'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostsEditHostedEventScreenTitleEditEvent,
        ),
        bodyScrolls: false,
        body: CatchPageBody.screen(child: body),
      ),
    );
  }
}

/// Editing a saved event with the create editor: the four steps' forms on
/// one page on a phone, the step list, form and preview on an expanded
/// window, with Save changes.
///
/// It owns the session's [editEventControllerProvider], the pickers and the
/// sheets; Save sends the update, shows Event updated and closes.
class EditEventScreen extends ConsumerStatefulWidget {
  const EditEventScreen({
    super.key,
    required this.organizer,
    required this.event,
    this.now,
    this.enableNetworkTiles = true,
  });

  final Organizer organizer;
  final Event event;

  /// A fixed clock for previews and tests.
  final DateTime Function()? now;

  /// False draws the maps' no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  @override
  ConsumerState<EditEventScreen> createState() => _EditEventScreenState();
}

class _EditEventScreenState extends ConsumerState<EditEventScreen> {
  late final EditEventArgs _args = EditEventArgs(
    organizer: widget.organizer,
    event: widget.event,
    now: widget.now,
  );
  bool _calendarOpen = false;
  DateTime? _calendarPick;
  EventItineraryItem? _editing;
  bool _editingNew = false;

  EditEventController get _controller =>
      ref.read(editEventControllerProvider(_args).notifier);

  DateTime get _today =>
      DateUtils.dateOnly(widget.now?.call() ?? DateTime.now());

  @override
  Widget build(BuildContext context) {
    final mutation = ref.watch(
      HostEventBookingController.updateHostedEventMutation,
    );
    // The update command's own pending and error states.
    final state = ref
        .watch(editEventControllerProvider(_args))
        .copyWith(
          working: mutation.isPending,
          error: mutation.hasError ? (mutation as MutationError).error : null,
        );
    final today = _today;
    final handlers = _handlers(state);
    final edit = _editHandlers(state);
    final Widget? overlay = switch (_editing) {
      final step? => CreatePlanStepSheet(
        step: step,
        isNew: _editingNew,
        onPickPlace: (draft) => unawaited(_pickPlaceForStep(draft)),
        showRouteDistance:
            (state.draft.routePlan?['path'] as List?)?.isNotEmpty ?? false,
        onDone: (step) {
          _controller.putStep(step);
          setState(() => _editing = null);
        },
        onRemove: () {
          _controller.removeStep(step.id);
          setState(() => _editing = null);
        },
      ),
      null when _calendarOpen => CreateCalendarSheet(
        today: today,
        value: _calendarPick,
        marked: _marked(today),
        // An edit picks a date at most a year out, as it always has.
        last: today.add(BusinessRules.eventEditDatePickerWindow),
        onChanged: (day) => setState(() => _calendarPick = day),
        onUse: () {
          final pick = _calendarPick;
          if (pick != null) _controller.setDate(pick);
          setState(() => _calendarOpen = false);
        },
      ),
      null => null,
    };
    return PopScope(
      canPop: !state.working && overlay == null,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || overlay == null) return;
        setState(() {
          _calendarOpen = false;
          _editing = null;
        });
      },
      child: CatchRoot(
        child: Builder(
          builder: (context) {
            final expanded =
                CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
            if (expanded) {
              return CreateEditorScreen(
                state: state,
                handlers: handlers,
                today: today,
                stillToSet: const <String>[],
                overlay: overlay,
                edit: edit,
                header: EditEventScopeNotice(state: state),
              );
            }
            return CatchScreen(
              key: const ValueKey<String>('edit-event'),
              topBar: CatchTopBar(
                variant: CatchTopBarVariant.tool,
                back: CatchTopBarBack(
                  label: context.l10n.hostEventsBack,
                  onPressed: state.working ? null : handlers.onBack,
                ),
                title: context.l10n.hostsEditHostedEventScreenTitleEditEvent,
                kicker: widget.event.name,
              ),
              body: CatchPageBody(
                child: EditEventBody(
                  state: state,
                  handlers: handlers,
                  edit: edit,
                  today: today,
                  enableNetworkTiles: widget.enableNetworkTiles,
                ),
              ),
              dock: CatchDock(
                placement: CatchDockPlacement.bar,
                primary: CatchDockAction(
                  label: context.l10n.hostsEventEditSaveChanges,
                  loading: state.working,
                  onPressed: state.canChange ? edit.onSave : null,
                ),
              ),
              overlay: overlay,
            );
          },
        ),
      ),
    );
  }

  CreateHandlers _handlers(CreateFlowState state) {
    final controller = _controller;
    void ignore([Object? _]) {}
    return CreateHandlers(
      onBack: () {
        if (!state.working) Navigator.of(context).maybePop();
      },
      onNext: () => unawaited(_save()),
      onSaveDraft: ignore,
      onStep: controller.goTo,
      onName: (value) => controller.edit((d) => d.copyWith(name: value)),
      // A saved event keeps its format, photos and where it sells.
      onFormat: ignore,
      onDescription: (value) =>
          controller.edit((d) => d.copyWith(description: value)),
      onDistance: (value) =>
          controller.edit((d) => d.copyWith(distance: value.trim())),
      onPace: (value) => controller.edit((d) => d.copyWith(paceName: value)),
      onAddPhoto: ignore,
      onDate: controller.setDate,
      onPickDate: () => setState(() {
        _calendarPick = DateTime.tryParse(state.draft.eventLocalDate ?? '');
        _calendarOpen = true;
      }),
      onStart: () => unawaited(_pickStart(state)),
      onEnd: () => unawaited(_pickEnd(state)),
      onPlace: () => unawaited(_pickPlace(state)),
      onDirections: (value) =>
          controller.edit((d) => d.copyWith(locationDetails: value)),
      onSellElsewhere: ignore,
      onPrice: (value) => controller.edit((d) => d.copyWith(price: value)),
      onPlaces: (value) =>
          controller.edit((d) => d.copyWith(capacity: '$value')),
      policy: controller.policyHandlers,
      onIncluded: (value) =>
          controller.edit((d) => d.copyWith(included: value)),
      onAccessibility: (value) =>
          controller.edit((d) => d.copyWith(accessibility: value)),
      onTemplate: () => controller.useTemplate(
        createPlanTemplate(
          context.l10n,
          state.format ?? CreateFormat.other,
          state.draft.durationMinutes,
        ),
      ),
      onBlank: () => controller.useTemplate(const []),
      onEditStep: (step) => setState(() {
        _editing = step;
        _editingNew = false;
      }),
      onAddStep: () => setState(() {
        final last = state.draft.itinerary.lastOrNull;
        _editing = EventItineraryItem(
          id: 'step-${DateTime.now().microsecondsSinceEpoch}',
          kind: EventItineraryKind.activity,
          offsetMinutes: last == null
              ? 0
              : last.offsetMinutes + (last.durationMinutes ?? 0),
          durationMinutes: 30,
          title: context.l10n.hostCreateNewStep,
        );
        _editingNew = true;
      }),
      onCopyLink: ignore,
      onPrint: ignore,
      onShareStory: ignore,
      onShareWhatsApp: ignore,
      onDone: ignore,
    );
  }

  CreateEditHandlers _editHandlers(CreateFlowState state) {
    final controller = _controller;
    return CreateEditHandlers(
      onSave: () => unawaited(_save()),
      onPlaceName: (value) =>
          controller.edit((d) => d.copyWith(meetingPoint: value)),
      onRoutePlan: controller.setRoutePlan,
    );
  }

  Future<void> _save() async {
    final mutation = HostEventBookingController.updateHostedEventMutation;
    if (ref.read(mutation).isPending) return;
    final request = _controller.checkedRequest();
    if (request == null) return;
    try {
      await mutation.run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .updateHostedEvent(
              event: request.nextEvent,
              includePolicy: request.includePolicy,
              inviteCode: request.inviteCode,
            ),
      );
    } on Object {
      // The error shows under the scope notice from the mutation state.
      return;
    }
    if (!mounted) return;
    showCatchNotice(context, context.l10n.hostsEventEditUpdated);
    Navigator.of(context).maybePop();
  }

  List<DateTime> _marked(DateTime today) {
    final events = ref
        .watch(
          watchActiveEventsForOrganizerProvider(
            ActiveOrganizerEventsQuery(
              organizerId: widget.organizer.id,
              day: today,
            ),
          ),
        )
        .value;
    return [
      for (final event in events ?? const <Event>[])
        if (event.id != widget.event.id) DateUtils.dateOnly(event.startTime),
    ];
  }

  Future<void> _pickStart(CreateFlowState state) async {
    final minutes = createMinutesOf(state.draft.eventLocalStartTime);
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: minutes == null
          ? const TimeOfDay(hour: 19, minute: 30)
          : TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60),
      title: context.l10n.hostCreateStarts,
    );
    if (time != null && mounted) _controller.setStart(time.hour, time.minute);
  }

  Future<void> _pickEnd(CreateFlowState state) async {
    final start = createMinutesOf(state.draft.eventLocalStartTime);
    if (start == null) return;
    final end = (start + state.draft.durationMinutes) % (24 * 60);
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: TimeOfDay(hour: end ~/ 60, minute: end % 60),
      title: context.l10n.hostCreateEnds,
    );
    if (time != null && mounted) _controller.setEnd(time.hour, time.minute);
  }

  /// The map picker, opening on [current] or else the organizer's city.
  Future<LocationPickerResult?> _pickOnMap({
    LocationCoordinate? current,
    String? label,
  }) {
    final city = defaultCityOptions
        .where(
          (option) => option.effectiveCityId == widget.organizer.locationCityId,
        )
        .firstOrNull;
    final draft = ref.read(editEventControllerProvider(_args)).draft;
    final lat = draft.startingPointLat;
    final lng = draft.startingPointLng;
    return Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: city?.countryIsoCode,
          initialLocation: current,
          initialCenter:
              current ??
              (lat == null || lng == null
                  ? null
                  : LocationCoordinate(lat, lng)) ??
              (city == null
                  ? null
                  : LocationCoordinate(city.latitude, city.longitude)),
          initialLabel: label,
          loadMapTiles: widget.enableNetworkTiles,
        ),
        fullscreenDialog: true,
      ),
    );
  }

  Future<void> _pickPlace(CreateFlowState state) async {
    final draft = state.draft;
    final lat = draft.startingPointLat;
    final lng = draft.startingPointLng;
    final result = await _pickOnMap(
      current: lat == null || lng == null ? null : LocationCoordinate(lat, lng),
      label: draft.meetingPoint,
    );
    if (result == null || !mounted) return;
    _controller.setPlace(
      EventMeetingLocation(
        name: (result.displayName ?? '').trim(),
        address: result.address,
        placeId: result.placeId,
        latitude: result.coordinate.latitude,
        longitude: result.coordinate.longitude,
      ),
    );
  }

  /// Picks [draft]'s own place and hands the step back to the open sheet.
  Future<void> _pickPlaceForStep(EventItineraryItem draft) async {
    final picked = await _pickStepPlace(draft.location);
    if (picked == null || !mounted || _editing?.id != draft.id) return;
    setState(() => _editing = draft.copyWith(location: picked));
  }

  Future<EventMeetingLocation?> _pickStepPlace(
    EventMeetingLocation? current,
  ) async {
    final result = await _pickOnMap(
      current: current == null
          ? null
          : LocationCoordinate(current.latitude, current.longitude),
      label: current?.name,
    );
    if (result == null || !mounted) return null;
    return EventMeetingLocation(
      name:
          result.displayName ??
          current?.name ??
          context.l10n.eventsMapPinTileTitlePinnedLocation,
      address: result.address,
      placeId: result.placeId,
      latitude: result.coordinate.latitude,
      longitude: result.coordinate.longitude,
    ).normalized();
  }
}
