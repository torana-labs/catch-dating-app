import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Pace pods for a social run, on the day theme: the pods from the route,
/// the runners in each and the runners who still need one.
///
/// It watches [hostFormatsPodsControllerProvider]. Putting a runner in a
/// pod is the existing membership move: the runner's
/// `EventAssistanceMembershipController` opens their reviewed membership,
/// selects the place decision and submits it. The pod leader and the
/// runner see the change through the same membership view.
class HostFormatsPodsScreen extends ConsumerStatefulWidget {
  const HostFormatsPodsScreen({super.key, required this.event});

  final Event event;

  @override
  ConsumerState<HostFormatsPodsScreen> createState() =>
      _HostFormatsPodsScreenState();
}

class _HostFormatsPodsScreenState extends ConsumerState<HostFormatsPodsScreen> {
  final Set<String> _placing = {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsPodsControllerProvider(event));
    return CatchRoot(
      format: CatchFormat.run,
      child: CatchScreen(
        key: const ValueKey<String>('host-formats-pods-screen'),
        topBar: hostFormatsToolTopBar(
          context,
          event: event,
          title: l10n.hostFormatsPodsTitle,
        ),
        body: HostFormatsPodsBody(
          state: state,
          placing: _placing,
          onPlace: (runner, pod) => unawaited(_place(runner, pod)),
          onRules: () => unawaited(
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => HostFormatsRulesScreen(event: event),
              ),
            ),
          ),
          onRetry: () => ref.invalidate(watchEventAttendeesProvider(event.id)),
        ),
      ),
    );
  }

  Future<void> _place(HostFormatsUnplaced runner, HostFormatsPod pod) async {
    final review = runner.review;
    if (review == null || !runner.movable) return;
    final placed = context.l10n.hostFormatsPlaced(
      name: runner.name,
      pod: pod.label,
    );
    final controller = ref.read(
      eventAssistanceMembershipControllerProvider(
        EventAssistanceGuestScope(
          organizerId: widget.event.organizerId,
          eventId: widget.event.id,
          attendeeId: runner.attendeeId,
        ),
      ).notifier,
    );
    setState(() => _placing.add(runner.attendeeId));
    try {
      controller
        ..open(review)
        ..select(AssistancePlaceGroup(pod.id));
      // provider-graph: ownership-widget-async:_HostFormatsPodsScreenState._place:await:eventAssistanceMembershipControllerProvider.submit watch CAT156 -- The membership controller owns the write and its error; the widget keeps the set of runners being placed so their rows show pending. Move the pending set into the controller in the CAT156 migration.
      await controller.submit();
      if (mounted) showCatchNotice(context, placed);
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _placing.remove(runner.attendeeId));
    }
  }
}
