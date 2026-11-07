import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/people/compose_body.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Writing one message to an event's guests: who it goes to, the message
/// and the event, then Send to N.
///
/// It watches [hostComposeControllerProvider], keeps the draft, the
/// audience and the event, and sends with the existing event broadcast
/// command under a request id that changes whenever the draft does.
class HostComposeScreen extends ConsumerStatefulWidget {
  const HostComposeScreen({
    super.key,
    this.organizerId,
    this.eventId,
    this.now,
  });

  /// The organizer writing; null uses the one selected in the Host app.
  final String? organizerId;

  /// The event to message; null starts on the next event.
  final String? eventId;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostComposeScreen> createState() => _HostComposeScreenState();
}

class _HostComposeScreenState extends ConsumerState<HostComposeScreen> {
  final _message = TextEditingController();
  HostComposeAudience _audience = HostComposeAudience.booked;
  String? _eventId;
  String? _requestId;
  late final DateTime _openedAt =
      widget.now ?? ref.read(appClockProvider).now();

  @override
  void initState() {
    super.initState();
    _eventId = widget.eventId;
    _message.addListener(_draftChanged);
  }

  @override
  void dispose() {
    _message
      ..removeListener(_draftChanged)
      ..dispose();
    super.dispose();
  }

  void _draftChanged() {
    _requestId = null;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scope = ref.watch(hostPeopleOrganizerProvider(widget.organizerId));
    final organizer = scope.organizer;
    final organizerId = widget.organizerId ?? organizer?.id;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostComposeCommands.sendMutation],
      errorContext: AppErrorContext.event,
    );
    final sending = ref.watch(HostComposeCommands.sendMutation).isPending;
    final state = organizerId == null
        ? const HostComposeState.loading()
        : ref.watch(
            hostComposeControllerProvider(
              HostComposeRequest(
                organizerId: organizerId,
                eventId: _eventId,
                now: _openedAt,
              ),
            ),
          );
    final recipients = state.recipients(_audience);
    final event = state.event;
    final ready =
        state.status == HostComposeStatus.ready &&
        event != null &&
        recipients > 0 &&
        _message.text.trim().isNotEmpty;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-compose-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.moment,
          back: CatchTopBarBack(
            label: l10n.hostPeopleClose,
            close: true,
            onPressed: sending ? null : () => Navigator.of(context).maybePop(),
          ),
        ),
        body: HostComposeBody(
          state: state,
          organizerName: organizer?.name ?? '',
          audience: _audience,
          message: _message,
          sending: sending,
          onAudience: (audience) => setState(() {
            _audience = audience;
            _requestId = null;
          }),
          onEvent: (event) => setState(() {
            _eventId = event.id;
            _requestId = null;
          }),
          onRetry: () {
            if (organizerId != null) retryHostComposeReads(ref, organizerId);
          },
        ),
        dock: state.status == HostComposeStatus.ready
            ? CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostPeopleComposeSend(count: recipients),
                  icon: CatchIcons.send,
                  loading: sending,
                  onPressed: ready && !sending
                      ? () => unawaited(_send(event))
                      : null,
                ),
              )
            : null,
      ),
    );
  }

  Future<void> _send(Event event) async {
    final requestId = _requestId ??= ref
        .read(hostComposeCommandsProvider)
        .newRequestId();
    try {
      final result = await HostComposeCommands.sendMutation.run(
        ref,
        (tx) => tx
            .get(hostComposeCommandsProvider)
            .send(
              requestId: requestId,
              eventId: event.id,
              audience: _audience,
              body: _message.text.trim(),
            ),
      );
      if (!mounted) return;
      showCatchNotice(
        context,
        context.l10n.hostPeopleComposeSent(count: result.recipientCount),
        tone: CatchNoticeTone.success,
      );
      await Navigator.of(context).maybePop(result);
    } on Object {
      // The mutation is watched for errors, which the screen shows.
    }
  }
}
