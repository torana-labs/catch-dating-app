import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/actions/event_success_controller.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_moving_night.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_ticker.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_dating_app/hosts/live/formats/host_event_live_location_field.dart';
import 'package:catch_dating_app/hosts/live/live_tools_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A social run, live, on the night theme: the step on now with how many
/// runners are back, the pace pods, who is still out and Close the route.
///
/// It watches [hostFormatsRunControllerProvider]. Back is the existing
/// accountability resolution; Call dials the number the runner gave; Close
/// the route opens [HostFormatsSweepScreen], which completes the night. On
/// a night that tracks the host's location, the existing location field
/// sits under the step.
class HostFormatsRunScreen extends ConsumerStatefulWidget {
  const HostFormatsRunScreen({
    super.key,
    required this.organizer,
    required this.event,
    this.onBack,
    this.onOpenGuests,
    this.now,
  });

  final Organizer organizer;
  final Event event;

  /// Null pops the nearest navigator.
  final VoidCallback? onBack;

  /// Opens the door, where late guests are checked in; null hides Guests.
  final VoidCallback? onOpenGuests;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostFormatsRunScreen> createState() =>
      _HostFormatsRunScreenState();
}

class _HostFormatsRunScreenState extends ConsumerState<HostFormatsRunScreen>
    with HostFormatsTicker<HostFormatsRunScreen> {
  final Set<String> _marking = {};

  @override
  DateTime? get fixedNow => widget.now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsRunControllerProvider(event));
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventSuccessController.accountabilityResolutionMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.run,
      child: CatchScreen(
        key: const ValueKey<String>('host-formats-run-screen'),
        topBar: hostFormatsLiveTopBar(
          context,
          event: event,
          now: now,
          onBack: widget.onBack,
          kicker: state.stepCount == 0
              ? null
              : l10n.hostFormatsRunStep(
                  index: state.stepIndex + 1,
                  total: state.stepCount,
                ),
        ),
        body: HostFormatsRunBody(
          state: state,
          now: now,
          marking: _marking,
          onAccounted: (person) => unawaited(_markAccounted(person)),
          onCall: (phone) => callHostFormatsGuest(ref, phone),
          onGuests: widget.onOpenGuests,
          onTools: () => openHostLiveTools(context, widget.event),
          onClose: () => unawaited(
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => HostFormatsSweepScreen(
                  organizer: widget.organizer,
                  event: event,
                ),
              ),
            ),
          ),
          onRetry: () {
            ref.invalidate(watchEventAttendeesProvider(event.id));
            ref.invalidate(watchEventSuccessPlanProvider(event.id));
          },
          location: hostMovingNightTracksLocation(event)
              ? HostEventLiveLocationField(event: event)
              : null,
        ),
      ),
    );
  }

  Future<void> _markAccounted(HostFormatsOut person) async {
    setState(() => _marking.add(person.attendeeId));
    await markHostFormatsAccounted(ref, event: widget.event, person: person);
    if (mounted) setState(() => _marking.remove(person.attendeeId));
  }
}
