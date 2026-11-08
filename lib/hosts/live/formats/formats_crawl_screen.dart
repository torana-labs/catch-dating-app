import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_ticker.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_crawl_move_sheet.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The pub crawl, live, on the night theme: the stop the group is at, the
/// route, the groups and who has not joined, with the move sheet over it.
///
/// It watches [hostFormatsCrawlControllerProvider]. Send and move everyone
/// is the existing event broadcast (`sendEventBroadcast` through
/// `HostComposeCommands`) to everyone booked, with the next stop and when
/// to leave. No command moves a group to a stop or changes a stop, so the
/// broadcast is the whole move. Message opens the compose screen.
class HostFormatsCrawlScreen extends ConsumerStatefulWidget {
  const HostFormatsCrawlScreen({
    super.key,
    required this.organizer,
    required this.event,
    this.now,
    this.moving = false,
  });

  final Organizer organizer;
  final Event event;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  /// Opens with the move sheet up, for previews.
  final bool moving;

  @override
  ConsumerState<HostFormatsCrawlScreen> createState() =>
      _HostFormatsCrawlScreenState();
}

class _HostFormatsCrawlScreenState extends ConsumerState<HostFormatsCrawlScreen>
    with HostFormatsTicker<HostFormatsCrawlScreen> {
  late bool _moving = widget.moving;
  HostFormatsLeave _leave = HostFormatsLeave.inTen;
  String? _requestId;

  @override
  DateTime? get fixedNow => widget.now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(
      hostFormatsCrawlControllerProvider(widget.organizer, event),
    );
    final sending = ref.watch(HostComposeCommands.sendMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostComposeCommands.sendMutation],
      errorContext: AppErrorContext.event,
    );
    final next = state.status == HostFormatsCrawlStatus.running
        ? state.nextStop(now)
        : null;
    final current = state.status == HostFormatsCrawlStatus.running
        ? state.currentIndex(now)
        : -1;
    return PopScope(
      canPop: !_moving,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _moving) setState(() => _moving = false);
      },
      child: CatchRoot(
        theme: CatchThemeMode.night,
        format: CatchFormat.nightsOut,
        child: Builder(
          builder: (context) => CatchScreen(
            key: const ValueKey<String>('host-formats-crawl-screen'),
            topBar: hostFormatsLiveTopBar(
              context,
              event: event,
              now: now,
              kicker: l10n.hostFormatsCrawlTopKicker(
                host: widget.organizer.name,
                count: state.booked,
              ),
            ),
            body: HostFormatsCrawlBody(
              state: state,
              now: now,
              onMove: () => setState(() {
                _moving = true;
                _requestId = null;
              }),
              onMessage: _compose,
              onRetry: () =>
                  ref.invalidate(watchEventAttendeesProvider(event.id)),
            ),
            overlay: _moving && next != null
                ? HostFormatsCrawlMoveSheet(
                    from: current < 0 ? null : state.stops[current],
                    to: next,
                    host: widget.organizer.name,
                    leave: _leave,
                    sending: sending,
                    onLeave: (leave) => setState(() {
                      _leave = leave;
                      _requestId = null;
                    }),
                    onSend: (message) => unawaited(_send(message)),
                  )
                : null,
          ),
        ),
      ),
    );
  }

  void _compose() => context.pushNamed(
    Routes.hostInboxScreen.name,
    queryParameters: {'eventId': widget.event.id},
    extra: widget.organizer,
  );

  Future<void> _send(String message) async {
    final commands = ref.read(hostComposeCommandsProvider);
    // One request id per message, so a retry cannot send it twice.
    final requestId = _requestId ??= commands.newRequestId();
    final sent = context.l10n.hostFormatsMoveSent;
    try {
      await HostComposeCommands.sendMutation.run(
        ref,
        (tx) => tx
            .get(hostComposeCommandsProvider)
            .send(
              requestId: requestId,
              eventId: widget.event.id,
              audience: HostComposeAudience.booked,
              body: message,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(() {
      _moving = false;
      _requestId = null;
    });
    showCatchNotice(context, sent);
  }
}
