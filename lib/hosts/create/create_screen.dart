import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/events/events.dart'
    show LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/create/create_basics_screen.dart';
import 'package:catch_dating_app/hosts/create/create_controller.dart';
import 'package:catch_dating_app/hosts/create/create_editor_screen.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/create_plan_screen.dart';
import 'package:catch_dating_app/hosts/create/create_share_screen.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_screen.dart';
import 'package:catch_dating_app/hosts/create/create_when_screen.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_calendar_sheet.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_plan_step_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_draft_restore.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Creating an event: four steps and the share screen on a phone, one
/// editor with the step list and the live preview on an expanded window.
///
/// It owns the session's [createControllerProvider], the pickers, the
/// sheets, sharing and navigation; the step screens and bodies only take
/// values and callbacks. The host's other events (the calendar's marked
/// days) come from the organizer's events listener.
class CreateScreen extends ConsumerStatefulWidget {
  const CreateScreen({
    super.key,
    required this.organizer,
    required this.userId,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
    this.onSaved,
    this.now,
  });

  final Organizer organizer;
  final String userId;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;

  /// Called with the event id once the create command has a receipt, for a
  /// caller that only needs the event to exist (a response to answer).
  final ValueChanged<String>? onSaved;

  /// A fixed clock for previews and tests.
  final DateTime? now;

  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  late final CreateFlowArgs _args = CreateFlowArgs(
    organizer: widget.organizer,
    userId: widget.userId,
    initialDraft: widget.initialDraft,
    initialPrefill: widget.initialPrefill,
    initialSavedEventId: widget.initialSavedEventId,
    externalBookingMode: widget.externalBookingMode,
  );
  bool _calendarOpen = false;
  DateTime? _calendarPick;
  EventItineraryItem? _editing;
  bool _editingNew = false;
  bool _leaving = false;

  CreateController get _controller =>
      ref.read(createControllerProvider(_args).notifier);

  DateTime get _today => DateUtils.dateOnly(widget.now ?? DateTime.now());

  @override
  Widget build(BuildContext context) {
    final provider = createControllerProvider(_args);
    ref.listen(provider.select((s) => s.error), (_, error) {
      if (error != null && mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    });
    ref.listen(provider.select((s) => s.eventId), (previous, eventId) {
      if (previous == null && eventId != null) widget.onSaved?.call(eventId);
    });
    final state = ref.watch(provider);
    final today = _today;
    final handlers = _handlers(state);
    final Widget? overlay = switch (state.step) {
      CreateStep.when when _calendarOpen => CreateCalendarSheet(
        today: today,
        value: _calendarPick,
        marked: _marked(today),
        onChanged: (day) => setState(() => _calendarPick = day),
        onUse: () {
          final pick = _calendarPick;
          if (pick != null) _controller.setDate(pick);
          setState(() => _calendarOpen = false);
        },
      ),
      CreateStep.plan when _editing != null => CreatePlanStepSheet(
        step: _editing!,
        isNew: _editingNew,
        onDone: (step) {
          _controller.putStep(step);
          setState(() => _editing = null);
        },
        onRemove: () {
          _controller.removeStep(_editing!.id);
          setState(() => _editing = null);
        },
      ),
      _ => null,
    };
    final hasOverlay = overlay != null;
    return PopScope(
      canPop: _leaving || state.published,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (hasOverlay) {
          setState(() {
            _calendarOpen = false;
            _editing = null;
          });
          return;
        }
        handlers.onBack();
      },
      child: CatchRoot(
        child: Builder(
          builder: (context) {
            if (state.loadingSaved) {
              return const CatchScreen(
                body: Center(child: CatchLoadingIndicator()),
              );
            }
            if (state.step == CreateStep.share) {
              return CreateShareScreen(
                state: state,
                handlers: handlers,
                link: _link(state),
              );
            }
            final expanded =
                CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
            if (expanded) {
              return CreateEditorScreen(
                state: state,
                handlers: handlers,
                today: today,
                stillToSet: _stillToSet(context, state),
                overlay: overlay,
              );
            }
            return switch (state.step) {
              CreateStep.basics => CreateBasicsScreen(
                state: state,
                handlers: handlers,
              ),
              CreateStep.when => CreateWhenScreen(
                state: state,
                handlers: handlers,
                today: today,
                calendarSheet: overlay,
              ),
              CreateStep.tickets => CreateTicketsScreen(
                state: state,
                handlers: handlers,
              ),
              CreateStep.plan || CreateStep.share => CreatePlanScreen(
                state: state,
                handlers: handlers,
                stepSheet: overlay,
              ),
            };
          },
        ),
      ),
    );
  }

  CreateHandlers _handlers(CreateFlowState state) {
    final controller = _controller;
    return CreateHandlers(
      onBack: () => unawaited(_back(state)),
      onNext: () => unawaited(controller.next()),
      onSaveDraft: () => unawaited(_saveDraft()),
      onStep: controller.goTo,
      onName: (value) => controller.edit((d) => d.copyWith(name: value)),
      onFormat: controller.setFormat,
      onDescription: (value) =>
          controller.edit((d) => d.copyWith(description: value)),
      onDistance: (value) =>
          controller.edit((d) => d.copyWith(distance: value.trim())),
      onPace: (value) => controller.edit((d) => d.copyWith(paceName: value)),
      onAddPhoto: () => unawaited(controller.addPhotos()),
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
      onSellElsewhere: (value) =>
          controller.edit((d) => d.copyWith(externalBookingMode: value)),
      onPrice: (value) => controller.edit((d) => d.copyWith(price: value)),
      onPlaces: (value) =>
          controller.edit((d) => d.copyWith(capacity: '$value')),
      onAdmission: (value) =>
          controller.edit((d) => d.copyWith(admissionPreset: value.preset)),
      onWaitlist: controller.setWaitlist,
      onApproveEach: controller.setApproveEach,
      onPlanVisible: controller.setPlanVisible,
      onRepeat: controller.setRepeatWeekly,
      onBookingLink: (value) =>
          controller.edit((d) => d.copyWith(externalEventUrl: value.trim())),
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
        _editing = EventItineraryItem(
          id: newPrivateEventRequestId().substring(0, 12),
          kind: EventItineraryKind.activity,
          offsetMinutes: 0,
          durationMinutes: 30,
          title: context.l10n.hostCreateNewStep,
        );
        _editingNew = true;
      }),
      onCopyLink: () => unawaited(_copyLink(state)),
      onPrint: () => unawaited(_shareLink(state)),
      onShareStory: () => unawaited(_shareLink(state)),
      onShareWhatsApp: () => unawaited(_shareLink(state)),
      onDone: () => context.goNamed(Routes.hostTodayScreen.name),
    );
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
        DateUtils.dateOnly(event.startTime),
    ];
  }

  List<String> _stillToSet(BuildContext context, CreateFlowState state) {
    final l10n = context.l10n;
    if (state.eventId != null && state.stillToSet.isNotEmpty) {
      return [
        for (final item in state.stillToSet)
          switch (item) {
            'futureActive' => l10n.hostsPublicationNeedsFuture,
            'organizerVisibility' => l10n.hostsPublicationNeedsOrganizer,
            'duration' => l10n.hostsEventDefaultsUsualDuration,
            'venue' => l10n.hostsPrivateEventDetailPickLocation,
            'format' => l10n.hostsPrivateEventDetailFormat,
            'description' => l10n.hostsEventDetailsStepTitleDescription,
            'admissionTerms' => l10n.hostsPrivateEventAdmissionTerms,
            'distancePace' => l10n.hostsPublicationNeedsDistance,
            _ => l10n.hostsPublicationNeedsReview,
          },
      ];
    }
    return [
      for (final step in state.unsetSteps)
        context.l10n.hostCreateRailTitle(step: step.name),
    ];
  }

  String _link(CreateFlowState state) {
    final eventId = state.eventId;
    if (eventId == null) return '';
    return AppDeepLinks.event(
      organizerId: widget.organizer.id,
      eventId: eventId,
    ).toString();
  }

  Future<void> _copyLink(CreateFlowState state) async {
    await ref.read(clipboardControllerProvider).copyText(_link(state));
    if (!mounted) return;
    ref
        .read(catchNoticeControllerProvider.notifier)
        .show(
          CatchNoticeData(
            id: 'create-link-copied',
            title: context.l10n.hostCreateLinkCopied,
            tone: CatchNoticeTone.success,
          ),
        );
  }

  Future<void> _shareLink(CreateFlowState state) =>
      ref.read(externalShareControllerProvider).shareText(text: _link(state));

  Future<void> _saveDraft() async {
    await _controller.saveDraft();
    if (!mounted || ref.read(createControllerProvider(_args)).error != null) {
      return;
    }
    ref
        .read(catchNoticeControllerProvider.notifier)
        .show(
          CatchNoticeData(
            id: 'create-draft-saved',
            title: context.l10n.hostCreateDraftSaved,
            tone: CatchNoticeTone.success,
          ),
        );
  }

  Future<void> _back(CreateFlowState state) async {
    if (_controller.back()) return;
    final draft = state.draft;
    final touched =
        state.eventId == null &&
        ((draft.name ?? '').trim().isNotEmpty ||
            draft.eventLocalDate != null ||
            draft.activityKind != null);
    if (touched) {
      final decision = await showHostDraftExitDialog(context);
      if (!mounted) return;
      switch (decision) {
        case null || HostDraftExitDecision.keepEditing:
          return;
        case HostDraftExitDecision.discardAndExit:
          break;
        case HostDraftExitDecision.saveDraftAndExit:
          await _controller.saveDraft();
          if (!mounted) return;
      }
    }
    if (_leaving) return;
    setState(() => _leaving = true);
    // Pop once the scope that allows it has rebuilt.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).maybePop();
    });
  }

  Future<void> _pickStart(CreateFlowState state) async {
    final parts = state.draft.eventLocalStartTime?.split(':');
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: parts == null
          ? const TimeOfDay(hour: 19, minute: 30)
          : TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1])),
      title: context.l10n.hostCreateStarts,
    );
    if (time != null && mounted) _controller.setStart(time.hour, time.minute);
  }

  Future<void> _pickEnd(CreateFlowState state) async {
    final start = createMinutes(state.draft.eventLocalStartTime);
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

  Future<void> _pickPlace(CreateFlowState state) async {
    final draft = state.draft;
    final city = defaultCityOptions
        .where(
          (option) => option.effectiveCityId == widget.organizer.locationCityId,
        )
        .firstOrNull;
    final lat = draft.startingPointLat;
    final lng = draft.startingPointLng;
    final result = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          countryIsoCode: city?.countryIsoCode,
          initialLocation: lat == null || lng == null
              ? null
              : LocationCoordinate(lat, lng),
          initialCenter: city == null
              ? null
              : LocationCoordinate(city.latitude, city.longitude),
          initialLabel: draft.meetingPoint,
        ),
        fullscreenDialog: true,
      ),
    );
    if (result == null || !mounted) return;
    final name = (result.displayName ?? draft.meetingPoint ?? '').trim();
    if (name.isEmpty) return;
    _controller.setPlace(
      EventMeetingLocation(
        name: name,
        address: result.address,
        placeId: result.placeId,
        latitude: result.coordinate.latitude,
        longitude: result.coordinate.longitude,
      ),
    );
  }
}
