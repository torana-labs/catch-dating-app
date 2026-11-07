import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_needs_screen.dart';
import 'package:catch_dating_app/hosts/live/live_room_screen.dart';
import 'package:catch_dating_app/hosts/live/live_scores_screen.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The live console for a night in one room: the step running now and what
/// is next, the room, what needs the host and tonight's plan, always on
/// the night theme.
///
/// It keeps a one-second clock for the step's time left, watches
/// [hostLiveControllerProvider] and turns the body's callbacks into the
/// existing run-of-show, help, delivery and late-arrival commands, the door
/// and the compose screen. Every read behind it is a listener.
class HostLiveScreen extends ConsumerStatefulWidget {
  const HostLiveScreen({
    super.key,
    required this.organizer,
    required this.event,
    required this.onBack,
    required this.onOpenGuests,
    this.now,
  });

  final Organizer organizer;
  final Event event;
  final VoidCallback onBack;

  /// Opens the door: the guest list for this event.
  final VoidCallback onOpenGuests;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostLiveScreen> createState() => _HostLiveScreenState();
}

class _HostLiveScreenState extends ConsumerState<HostLiveScreen> {
  DateTime? _clockNow;
  Timer? _tick;

  DateTime get _now => widget.now ?? _clockNow ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    _scheduleTick();
  }

  @override
  void didUpdateWidget(HostLiveScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.now != widget.now) _scheduleTick();
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  void _scheduleTick() {
    _tick?.cancel();
    if (widget.now != null) return;
    final clock = ref.read(appClockProvider);
    final current = clock.now();
    _clockNow = current;
    final nextSecond = DateTime(
      current.year,
      current.month,
      current.day,
      current.hour,
      current.minute,
      current.second + 1,
    );
    _tick = clock.timer(nextSecond.difference(current), () {
      if (!mounted) return;
      setState(_scheduleTick);
    });
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final state = ref.watch(hostLiveControllerProvider(event));
    final changingStep =
        ref.watch(EventSuccessController.updateStepMutation).isPending ||
        ref.watch(EventSuccessController.completePlanMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventSuccessController.updateStepMutation,
        EventSuccessController.completePlanMutation,
        EventSuccessController.resolveLateArrivalMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final actions = HostLiveActions(
      context: context,
      ref: ref,
      organizer: widget.organizer,
      event: event,
      now: widget.now,
      onOpenGuests: widget.onOpenGuests,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: Builder(
        builder: (context) => CatchScreen(
          key: const ValueKey<String>('host-live-screen'),
          topBar: hostLiveTopBar(
            context,
            event: event,
            now: _now,
            back: widget.onBack,
          ),
          // The tablet's two panes scroll on their own.
          bodyScrolls:
              CatchRootScope.sizeClassOf(context) != CatchWindowSize.expanded,
          body: HostLiveBody(
            state: state,
            now: _now,
            changingStep: changingStep,
            onView: actions.openView,
            onNext: () => actions.setStep(state, state.activeIndex + 1),
            onBack: () => actions.setStep(state, state.activeIndex - 1),
            onFinish: () => actions.finish(state),
            onOpenNeed: (need) => actions.openNeed(state, need),
            onAllNeeds: actions.openNeeds,
            onEnterScores: () => actions.openView(HostLiveView.scores),
            onMessage: actions.messageEveryone,
            onRetry: () => retryHostLiveReads(ref, event),
          ),
        ),
      ),
    );
  }
}

/// The live top bar: the event's title, back, and the live tag with the
/// time now.
CatchTopBar hostLiveTopBar(
  BuildContext context, {
  required Event event,
  required DateTime now,
  VoidCallback? back,
}) => CatchTopBar(
  variant: CatchTopBarVariant.live,
  title: event.title,
  back: CatchTopBarBack(label: context.l10n.hostLiveBack, onPressed: back),
  live: context.l10n.hostLiveTag(time: AppTimeFormatters.time(now)),
);

/// What the console's rows and buttons do, shared by its four screens: the
/// existing run-of-show commands, the help and delivery reviews, placing a
/// late arrival, the door, the compose screen and the other views.
class HostLiveActions {
  const HostLiveActions({
    required this.context,
    required this.ref,
    required this.organizer,
    required this.event,
    required this.onOpenGuests,
    this.now,
  });

  final BuildContext context;
  final WidgetRef ref;
  final Organizer organizer;
  final Event event;
  final VoidCallback onOpenGuests;

  /// The fixed clock handed on to the screens this one opens.
  final DateTime? now;

  void setStep(HostLiveState state, int index) {
    if (index < 0 || index >= state.steps.length) return;
    runHostLiveCommand(
      EventSuccessController.updateStepMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .updateActiveStep(
              eventId: event.id,
              activeStepIndex: index,
              expectedRevision: state.liveControlRevision,
            ),
      ),
    );
  }

  void finish(HostLiveState state) => runHostLiveCommand(
    EventSuccessController.completePlanMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .completePlan(
            eventId: event.id,
            expectedRevision: state.liveControlRevision,
            accountabilityAcknowledged: false,
          ),
    ),
  );

  void openNeed(HostLiveState state, HostLiveNeed need) {
    switch (need) {
      case HostLiveHelpNeed(:final request):
        unawaited(
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventAssistanceHelpSheet(
              scope: request.scope,
              query: EventAssistanceCaseQuery(
                organizerId: event.organizerId,
                eventId: event.id,
              ),
            ),
          ),
        );
      case HostLiveDeliveryNeed(:final delivery):
        unawaited(
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventAssistanceDeliverySheet(
              scope: delivery.scope,
              query: EventAssistanceDeliveryQuery(
                organizerId: event.organizerId,
                eventId: event.id,
              ),
            ),
          ),
        );
      case HostLiveArrivalNeed(:final arrival):
        runHostLiveCommand(
          EventSuccessController.resolveLateArrivalMutation.run(
            ref,
            (tx) => tx
                .get(eventSuccessControllerProvider.notifier)
                .resolveLateArrival(
                  eventId: event.id,
                  uid: arrival.uid,
                  expectedRevision: state.presenceRevision,
                ),
          ),
        );
    }
  }

  void openView(HostLiveView view) {
    switch (view) {
      case HostLiveView.now:
        Navigator.of(context).popUntil(
          (route) => route.settings.name != hostLiveSubscreenRouteName,
        );
      case HostLiveView.guests:
        onOpenGuests();
      case HostLiveView.scores:
        _push(
          HostLiveScoresScreen(
            organizer: organizer,
            event: event,
            onOpenGuests: onOpenGuests,
            now: now,
          ),
        );
      case HostLiveView.room:
        _push(
          HostLiveRoomScreen(
            organizer: organizer,
            event: event,
            onOpenGuests: onOpenGuests,
            now: now,
          ),
        );
    }
  }

  void openNeeds() => _push(
    HostLiveNeedsScreen(
      organizer: organizer,
      event: event,
      onOpenGuests: onOpenGuests,
      now: now,
    ),
  );

  void messageEveryone() => context.pushNamed(
    Routes.hostInboxScreen.name,
    queryParameters: {'eventId': event.id},
    extra: organizer,
  );

  void _push(Widget screen) {
    final navigator = Navigator.of(context);
    final route = MaterialPageRoute<void>(
      settings: const RouteSettings(name: hostLiveSubscreenRouteName),
      builder: (_) => screen,
    );
    // A view replaces another view; Now sits under them all.
    if (ModalRoute.of(context)?.settings.name == hostLiveSubscreenRouteName) {
      unawaited(navigator.pushReplacement(route));
    } else {
      unawaited(navigator.push(route));
    }
  }
}

/// Runs a console command and lets it fail quietly here: its mutation is
/// watched for errors, which the screen shows as a notice.
void runHostLiveCommand(Future<Object?> command) =>
    unawaited(command.then<void>((_) {}, onError: (Object _) {}));

/// The name the console's Needs, Scores and Room screens are pushed under,
/// so Now can pop back to itself.
const hostLiveSubscreenRouteName = 'host-live-view';
