import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_commands_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_ticker.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_dating_app/hosts/live/formats/widgets/formats_crawl_change_sheet.dart';
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
/// to leave. Change on the next stop opens the stop editor, whose send is
/// one `changeEventCrawlStop`: the stop changes on tonight's plan and
/// everyone booked is told. Message opens the compose screen.
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

  /// The stop editor is up over the move sheet.
  bool _changing = false;

  /// One request id per stop change, so a retry cannot apply it twice.
  String? _changeRequestId;

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
    final changingStop = ref
        .watch(HostFormatsCrawlCommands.changeStopMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostComposeCommands.sendMutation,
        HostFormatsCrawlCommands.changeStopMutation,
      ],
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
        if (didPop) return;
        setState(() {
          if (_changing) {
            _changing = false;
          } else {
            _moving = false;
          }
        });
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
              onRetry: () {
                ref.invalidate(watchEventAttendeesProvider(event.id));
                ref.invalidate(watchEventSuccessPlanProvider(event.id));
              },
            ),
            overlay: _moving && _changing && next != null
                ? HostFormatsCrawlChangeSheet(
                    key: ValueKey<String>(
                      'formats-crawl-change-${next.stop.id}',
                    ),
                    stop: next,
                    number: state.stops.indexOf(next) + 1,
                    sending: changingStop,
                    onChange: (title, address, message) => unawaited(
                      _changeStop(
                        state,
                        next,
                        title: title,
                        address: address,
                        message: message,
                      ),
                    ),
                  )
                : _moving && next != null
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
                    stopNumber: state.stops.indexOf(next) + 1,
                    onChange: state.canChangeStops
                        ? () => setState(() {
                            _changing = true;
                            _changeRequestId = null;
                          })
                        : null,
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

  Future<void> _changeStop(
    HostFormatsCrawlState state,
    HostFormatsStop stop, {
    required String title,
    required String? address,
    required String message,
  }) async {
    final revision = state.liveControlRevision;
    if (revision == null) return;
    final changed = context.l10n.hostFormatsStopChangeSent;
    final requestId = _changeRequestId ??= hostFormatsCrawlRequestId();
    try {
      await HostFormatsCrawlCommands.changeStopMutation.run(
        ref,
        (tx) => tx
            .get(hostFormatsCrawlCommandsProvider.notifier)
            .changeStop(
              eventId: widget.event.id,
              requestId: requestId,
              expectedLiveControlRevision: revision,
              stopId: stop.stop.id,
              title: title,
              address: address,
              message: message,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
      return;
    }
    if (!mounted) return;
    setState(() {
      _changing = false;
      _changeRequestId = null;
    });
    showCatchNotice(context, changed);
  }

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

/// A fresh request id for one crawl stop change.
String hostFormatsCrawlRequestId() =>
    'crawl-${DateTime.now().microsecondsSinceEpoch}';
