import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_close_out_repository.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Close out the night: who came of who booked, Came or Didn't come for
/// each booked guest nobody checked in, and the after-closing switches,
/// with Close out and Later in the dock.
///
/// It watches [hostEventCloseOutControllerProvider], records each mark
/// through the attendance outbox, as the door does, and saves the switches
/// through `setEventCloseOut` (the thank-you is an event moment). Later
/// leaves without saving.
class HostEventCloseOutScreen extends ConsumerStatefulWidget {
  const HostEventCloseOutScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventCloseOutScreen> createState() =>
      _HostEventCloseOutScreenState();
}

class _HostEventCloseOutScreenState
    extends ConsumerState<HostEventCloseOutScreen> {
  final Map<String, bool> _marks = {};
  final Map<HostEventCloseOutOption, bool> _changed = {};

  /// One request id per close-out, so a retry cannot apply it twice.
  String? _requestId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventCloseOutControllerProvider(request));
    final closing = ref
        .watch(HostEventCloseOutCommands.closeOutMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostEventCommands.attendanceMutation,
        HostEventCloseOutCommands.closeOutMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final options = {...state.options, ..._changed};
    final ready = state.status == HostEventCloseOutStatus.ready;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-close-out-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsCloseOutTitle,
          kicker: state.eventTitle,
        ),
        bodyScrolls: false,
        body: HostEventCloseOutBody(
          state: state,
          marks: _marks,
          onMark: _mark,
          onRetry: () {
            ref.invalidate(watchEventProvider(request.eventId));
            ref.invalidate(watchEventAttendeesProvider(request.eventId));
            ref.invalidate(watchEventCloseOutProvider(request.eventId));
          },
          options: options,
          onOption: ready
              ? (option, on) => setState(() {
                  _changed[option] = on;
                  _requestId = null;
                })
              : null,
        ),
        dock: !ready
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostEventsCloseOutConfirm,
                  loading: closing,
                  onPressed: closing
                      ? null
                      : () => unawaited(_closeOut(state, options)),
                ),
                secondary: CatchDockAction(
                  label: l10n.hostEventsCloseOutLater,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ),
      ),
    );
  }

  Future<void> _closeOut(
    HostEventCloseOutState state,
    Map<HostEventCloseOutOption, bool> options,
  ) async {
    final organizerId = state.organizerId;
    if (organizerId == null) return;
    final saved = context.l10n.hostEventsCloseOutSaved;
    final requestId = _requestId ??= hostEventRequestId();
    try {
      await HostEventCloseOutCommands.closeOutMutation.run(
        ref,
        (tx) => tx
            .get(hostEventCloseOutCommandsProvider.notifier)
            .closeOut(
              organizerId: organizerId,
              eventId: widget.request.eventId,
              requestId: requestId,
              expectedRevision: state.closeOut.revision,
              thankYou: options[HostEventCloseOutOption.thankYou] ?? false,
              openStayInTouchPicks:
                  options[HostEventCloseOutOption.stayInTouchPicks] ?? false,
              noShowNote: options[HostEventCloseOutOption.noShowNote] ?? false,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(() {
      _changed.clear();
      _requestId = null;
    });
    showCatchNotice(context, saved);
  }

  void _mark(EventAttendee attendee, bool came) {
    setState(() => _marks[attendee.id] = came);
    unawaited(
      HostEventCommands.attendanceMutation
          .run(
            ref,
            (tx) => tx
                .get(hostEventCommandsProvider.notifier)
                .setAttendance(attendee: attendee, came: came),
          )
          .then<void>((_) {}, onError: (Object _) {}),
    );
  }
}
