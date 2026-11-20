import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event_extensions.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_actions.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_controller.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_scores_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_state.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_tools_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_body.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_crawl_move_sheet.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A rehearsal, practised on the rebuilt console: the one-room live
/// console, the run console or the crawl board, whichever the rehearsed
/// night runs on, on the night theme and the rehearsal's virtual clock.
///
/// It watches [hostRehearsalPracticeControllerProvider], which builds the
/// consoles' own states from the rehearsal's made-up guests. Every button
/// runs a rehearsal command ([HostRehearsalPracticeActions]): steps,
/// pause and finish move the rehearsal's run, placing a late arrival makes
/// that guest arrive, and Tools opens practice tools. Buttons that would
/// message real guests say that practice sends nothing.
class HostRehearsalPracticeScreen extends ConsumerStatefulWidget {
  const HostRehearsalPracticeScreen({
    super.key,
    required this.organizerId,
    required this.sessionId,
  });

  final String organizerId;
  final String sessionId;

  @override
  ConsumerState<HostRehearsalPracticeScreen> createState() =>
      _HostRehearsalPracticeScreenState();
}

class _HostRehearsalPracticeScreenState
    extends ConsumerState<HostRehearsalPracticeScreen> {
  /// The crawl's move sheet is up.
  bool _moving = false;
  HostFormatsLeave _leave = HostFormatsLeave.inTen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(
      hostRehearsalPracticeControllerProvider(widget.sessionId),
    );
    final busy = HostRehearsalPracticeActions.busy(ref, widget.sessionId);
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: HostRehearsalPracticeActions.mutations,
      errorContext: AppErrorContext.event,
    );
    final actions = HostRehearsalPracticeActions(
      context: context,
      ref: ref,
      organizerId: widget.organizerId,
      sessionId: widget.sessionId,
    );
    final now = state.now ?? DateTime.now();
    final session = state.rehearsal?.session;
    void tools() => openHostRehearsalPracticeTools(
      context,
      organizerId: widget.organizerId,
      sessionId: widget.sessionId,
    );
    final crawl = state.crawl;
    final next = crawl.status == HostFormatsCrawlStatus.running
        ? crawl.nextStop(now)
        : null;
    final current = next == null ? -1 : crawl.currentIndex(now);
    final Widget body = switch (state.status) {
      HostRehearsalPracticeStatus.loading => const CatchPageBody(
        child: CatchLoadingIndicator(),
      ),
      HostRehearsalPracticeStatus.error => CatchPageBody(
        child: CatchErrorState(
          title: l10n.hostEventsRehearsalErrorTitle,
          message: l10n.hostEventsErrorBody,
          retryLabel: l10n.hostEventsRetry,
          onRetry: _retry,
        ),
      ),
      HostRehearsalPracticeStatus.ready when session != null => switch (state
          .console) {
        HostRehearsalPracticeConsole.live => HostLiveBody(
          state: state.live,
          now: now,
          changingStep: busy,
          onView: (view) => _openView(view, state),
          onNext: () => actions.next(session),
          onBack: () =>
              actions.control(session, EventRehearsalControlAction.previous),
          onPause: session.status == EventRehearsalStatus.running
              ? () =>
                    actions.control(session, EventRehearsalControlAction.pause)
              : null,
          onResume: session.status == EventRehearsalStatus.paused
              ? () =>
                    actions.control(session, EventRehearsalControlAction.resume)
              : null,
          onFinish: () =>
              actions.control(session, EventRehearsalControlAction.complete),
          onOpenNeed: (need) => switch (need) {
            HostLiveArrivalNeed(:final arrival) => actions.behave(
              session,
              arrival.uid,
              EventRehearsalBehavior.arrive,
            ),
            // Practice raises help and messages through practice tools.
            HostLiveHelpNeed() || HostLiveDeliveryNeed() => tools(),
          },
          onAllNeeds: tools,
          onEnterScores: () => _openView(HostLiveView.scores, state),
          onMessage: actions.nothingSent,
          onRetry: _retry,
          onTools: tools,
        ),
        HostRehearsalPracticeConsole.run => HostFormatsRunBody(
          state: state.run,
          now: now,
          onAccounted: (_) => tools(),
          // Made-up runners have no phone number.
          onCall: (_) {},
          onGuests: () => _openView(HostLiveView.guests, state),
          onTools: tools,
          onClose: () =>
              actions.control(session, EventRehearsalControlAction.complete),
          onRetry: _retry,
        ),
        HostRehearsalPracticeConsole.crawl => HostFormatsCrawlBody(
          state: state.crawl,
          now: now,
          onMove: () => setState(() => _moving = true),
          onMessage: actions.nothingSent,
          onSweep: () =>
              actions.control(session, EventRehearsalControlAction.complete),
          onGuests: () => _openView(HostLiveView.guests, state),
          onTools: tools,
          onRetry: _retry,
        ),
      },
      HostRehearsalPracticeStatus.ready => const CatchPageBody(
        child: CatchLoadingIndicator(),
      ),
    };
    return PopScope(
      canPop: !_moving,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _moving = false);
      },
      child: CatchRoot(
        theme: CatchThemeMode.night,
        format: switch (state.console) {
          HostRehearsalPracticeConsole.live => state.live.format,
          HostRehearsalPracticeConsole.run => CatchFormat.run,
          HostRehearsalPracticeConsole.crawl => CatchFormat.nightsOut,
        },
        child: Builder(
          builder: (context) => CatchScreen(
            key: const ValueKey<String>('host-rehearsal-practice-screen'),
            topBar: CatchTopBar(
              variant: CatchTopBarVariant.live,
              title: state.event?.title ?? l10n.hostEventsRehearsalScreenTitle,
              back: CatchTopBarBack(
                label: l10n.hostLiveBack,
                onPressed: () => unawaited(_leaveRehearsal(session)),
              ),
              live: l10n.hostEventsRehearsalPracticeTag(
                time: AppTimeFormatters.time(now),
              ),
            ),
            bodyScrolls:
                state.console != HostRehearsalPracticeConsole.live ||
                CatchRootScope.sizeClassOf(context) != CatchWindowSize.expanded,
            body: body,
            overlay: _moving && next != null
                ? HostFormatsCrawlMoveSheet(
                    from: current < 0 ? null : crawl.stops[current],
                    to: next,
                    host: crawl.host,
                    leave: _leave,
                    onLeave: (leave) => setState(() => _leave = leave),
                    onSend: (_) {
                      setState(() => _moving = false);
                      actions.nothingSent();
                    },
                    stopNumber: crawl.stops.indexOf(next) + 1,
                  )
                : null,
          ),
        ),
      ),
    );
  }

  void _openView(HostLiveView view, HostRehearsalPracticeState state) {
    final rehearsal = state.rehearsal;
    if (rehearsal == null) return;
    switch (view) {
      case HostLiveView.now:
        Navigator.of(context).popUntil(
          (route) => route.settings.name != hostRehearsalPracticeViewRouteName,
        );
      case HostLiveView.guests:
        unawaited(
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => CatchSheet.standard(
              title: context.l10n.hostLiveViewGuests,
              badge: context.l10n.hostEventRehearsalBadge,
              badgeTone: CatchBadgeTone.danger,
              child: EventRehearsalRosterSection(rehearsal: rehearsal),
            ),
          ),
        );
      case HostLiveView.scores:
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              settings: const RouteSettings(
                name: hostRehearsalPracticeViewRouteName,
              ),
              builder: (_) => HostRehearsalPracticeScoresScreen(
                organizerId: widget.organizerId,
                sessionId: widget.sessionId,
                onGuests: () => _openView(HostLiveView.guests, state),
              ),
            ),
          ),
        );
      // Practice has no room or format board: they read and move a real
      // event's guests.
      case HostLiveView.format || HostLiveView.room:
        return;
    }
  }

  void _retry() => ref.invalidate(eventRehearsalProvider(widget.sessionId));

  Future<void> _leaveRehearsal(EventRehearsalSession? session) async {
    if (session?.hasStarted == true) {
      final l10n = context.l10n;
      final confirmed = await showCatchConfirmDialog(
        copy: catchDialogCopy(l10n),
        context: context,
        title: l10n.hostEventRehearsalLeaveTitle,
        message: l10n.hostEventRehearsalLeaveBody,
        confirmLabel: l10n.hostEventRehearsalLeaveAction,
      );
      if (confirmed != true || !mounted) return;
    }
    if (mounted) await Navigator.of(context).maybePop();
  }
}
