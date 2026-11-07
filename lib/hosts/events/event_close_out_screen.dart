import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_controller.dart';
import 'package:catch_dating_app/hosts/events/event_commands.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Close out the night: who came of who booked, and Came or Didn't come
/// for each booked guest nobody checked in.
///
/// It watches [hostEventCloseOutControllerProvider] and records each mark
/// through the attendance outbox, as the door does. There is no close-out
/// command beyond attendance, so the screen has no dock.
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventCloseOutControllerProvider(request));
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventCommands.attendanceMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-close-out-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
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
          },
        ),
      ),
    );
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
