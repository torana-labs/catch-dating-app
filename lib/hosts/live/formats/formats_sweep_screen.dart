import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_close_out_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Marks [person] accounted for: back at the start, or home. The existing
/// accountability resolution, returned; its error shows as a notice where
/// the screen listens to [EventSuccessController.accountabilityResolutionMutation].
Future<void> markHostFormatsAccounted(
  WidgetRef ref, {
  required Event event,
  required HostFormatsOut person,
}) => EventSuccessController.accountabilityResolutionMutation
    .run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .setAccountabilityResolution(
            eventId: event.id,
            attendeeId: person.attendeeId,
            resolution: EventSuccessAccountabilityResolution.returned,
          ),
    )
    .then<void>((_) {}, onError: (Object _) {});

/// Calls a guest on the number they gave.
void callHostFormatsGuest(WidgetRef ref, String phone) => unawaited(
  ref
      .read(externalLinkControllerProvider)
      .open(Uri(scheme: 'tel', path: phone)),
);

/// The return sweep at the end of a night that moves, on the night theme:
/// who is back (a run) or home (a crawl), who is still out, the
/// after-the-night switches and Close the night.
///
/// It watches [hostFormatsSweepControllerProvider]. Back and Home are the
/// existing accountability resolution (`setEventSuccessAccountabilityResolution`,
/// returned). Close the night completes the plan (`controlEventSuccessLive`
/// complete, acknowledging anyone still out after the host confirms) and
/// saves the switches with the existing close-out (`setEventCloseOut`).
class HostFormatsSweepScreen extends ConsumerStatefulWidget {
  const HostFormatsSweepScreen({
    super.key,
    required this.organizer,
    required this.event,
  });

  final Organizer organizer;
  final Event event;

  @override
  ConsumerState<HostFormatsSweepScreen> createState() =>
      _HostFormatsSweepScreenState();
}

class _HostFormatsSweepScreenState
    extends ConsumerState<HostFormatsSweepScreen> {
  final Set<String> _marking = {};
  final Map<HostEventCloseOutOption, bool> _changed = {};

  /// One request id per close-out save, so a retry cannot apply it twice.
  String? _requestId;
  bool _closing = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsSweepControllerProvider(event));
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventSuccessController.accountabilityResolutionMutation,
        EventSuccessController.completePlanMutation,
        HostEventCloseOutCommands.closeOutMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final closeOut = state.closeOut;
    final options = {...?closeOut?.options, ..._changed};
    final ready = state.status == HostFormatsSweepStatus.ready;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: state.kind == HostFormatsSweepKind.crawl
          ? CatchFormat.nightsOut
          : CatchFormat.run,
      child: CatchScreen(
        key: const ValueKey<String>('host-formats-sweep-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          kicker: event.title,
          title: l10n.hostFormatsSweepTitle,
          back: CatchTopBarBack(label: l10n.hostFormatsBackToEvent),
        ),
        bodyScrolls: false,
        body: HostFormatsSweepBody(
          state: state,
          marking: _marking,
          onAccounted: (person) => unawaited(_markAccounted(person)),
          onCall: _call,
          onRetry: () {
            ref.invalidate(watchEventAttendeesProvider(event.id));
            ref.invalidate(watchEventSuccessPlanProvider(event.id));
            ref.invalidate(watchEventCloseOutProvider(event.id));
          },
          options: options,
          onOption: closeOut == null
              ? null
              : (option, on) => setState(() {
                  _changed[option] = on;
                  _requestId = null;
                }),
        ),
        dock: !ready
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostFormatsSweepClose,
                  loading: _closing,
                  onPressed: _closing
                      ? null
                      : () => unawaited(_close(state, options)),
                ),
                secondary: CatchDockAction(
                  label: l10n.hostFormatsSweepMessage,
                  onPressed: _message,
                ),
              ),
      ),
    );
  }

  Future<void> _markAccounted(HostFormatsOut person) async {
    setState(() => _marking.add(person.attendeeId));
    await markHostFormatsAccounted(ref, event: widget.event, person: person);
    if (mounted) setState(() => _marking.remove(person.attendeeId));
  }

  void _call(String phone) => callHostFormatsGuest(ref, phone);

  void _message() => context.pushNamed(
    Routes.hostInboxScreen.name,
    queryParameters: {'eventId': widget.event.id},
    extra: widget.organizer,
  );

  Future<void> _close(
    HostFormatsSweepState state,
    Map<HostEventCloseOutOption, bool> options,
  ) async {
    final l10n = context.l10n;
    final stillOut = state.out.length;
    if (stillOut > 0 && !state.finished) {
      final confirmed = await showCatchAdaptiveDialog<bool>(
        context: context,
        title: l10n.hostFormatsSweepCloseAnywayTitle(count: stillOut),
        message: l10n.hostFormatsSweepCloseAnywayBody,
        actions: [
          CatchDialogAction(
            label: l10n.hostFormatsSweepKeepSweeping,
            value: false,
            isDefault: true,
          ),
          CatchDialogAction(
            label: l10n.hostFormatsSweepCloseAnyway,
            value: true,
            isDestructive: true,
          ),
        ],
      );
      if (confirmed != true || !mounted) return;
    }
    final closed = l10n.hostFormatsSweepClosed;
    setState(() => _closing = true);
    try {
      final revision = state.liveControlRevision;
      if (!state.finished && revision != null) {
        await EventSuccessController.completePlanMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .completePlan(
                eventId: widget.event.id,
                expectedRevision: revision,
                accountabilityAcknowledged: stillOut > 0,
              ),
        );
      }
      final closeOut = state.closeOut;
      if (closeOut != null) {
        final requestId = _requestId ??= hostEventRequestId();
        await HostEventCloseOutCommands.closeOutMutation.run(
          ref,
          (tx) => tx
              .get(hostEventCloseOutCommandsProvider.notifier)
              .closeOut(
                organizerId: widget.event.organizerId,
                eventId: widget.event.id,
                requestId: requestId,
                expectedRevision: closeOut.closeOut.revision,
                thankYou: options[HostEventCloseOutOption.thankYou] ?? false,
                openStayInTouchPicks:
                    options[HostEventCloseOutOption.stayInTouchPicks] ?? false,
                noShowNote:
                    options[HostEventCloseOutOption.noShowNote] ?? false,
              ),
        );
      }
    } on Object {
      // Each mutation's error shows as a notice.
      return;
    } finally {
      if (mounted) setState(() => _closing = false);
    }
    if (!mounted) return;
    setState(() {
      _changed.clear();
      _requestId = null;
    });
    showCatchNotice(context, closed);
    unawaited(Navigator.of(context).maybePop());
  }
}
