import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_setup_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_courts_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_ticker.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_top_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The court board for court rotations (pickleball, padel), always on the
/// night theme: the round on court, its clock, who sits out and how fair
/// the morning has been, on a phone or a tablet at the desk.
///
/// It watches [hostFormatsCourtsControllerProvider] and turns Rotate now
/// into the existing rotation publish (`publishEventSuccessRotationRound`,
/// fenced by the plan's live-control revision) after a confirmation. Set up
/// opens the court setup.
class HostFormatsCourtsScreen extends ConsumerStatefulWidget {
  const HostFormatsCourtsScreen({super.key, required this.event, this.now});

  final Event event;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostFormatsCourtsScreen> createState() =>
      _HostFormatsCourtsScreenState();
}

class _HostFormatsCourtsScreenState
    extends ConsumerState<HostFormatsCourtsScreen>
    with HostFormatsTicker<HostFormatsCourtsScreen> {
  @override
  DateTime? get fixedNow => widget.now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = widget.event;
    final state = ref.watch(hostFormatsCourtsControllerProvider(event));
    final rotating = ref
        .watch(EventSuccessController.publishRotationRoundMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventSuccessController.publishRotationRoundMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.courts,
      child: Builder(
        builder: (context) => CatchScreen(
          key: const ValueKey<String>('host-formats-courts-screen'),
          topBar: hostFormatsLiveTopBar(
            context,
            event: event,
            now: now,
            kicker: state.courts.isEmpty
                ? null
                : l10n.hostFormatsCourtsKicker(
                    players: state.players,
                    courts: state.courts.length,
                  ),
            action: CatchTopBarAction(
              label: l10n.hostFormatsCourtsSetUp,
              onPressed: _openSetup,
            ),
          ),
          bodyScrolls:
              CatchRootScope.sizeClassOf(context) != CatchWindowSize.expanded,
          body: HostFormatsCourtsBody(
            state: state,
            now: now,
            rotating: rotating,
            onRotate: () => unawaited(_rotate(state)),
            onSetUp: _openSetup,
            onRetry: () =>
                ref.invalidate(watchEventSuccessPlanProvider(event.id)),
          ),
        ),
      ),
    );
  }

  void _openSetup() => unawaited(
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => HostFormatsCourtsSetupScreen(event: widget.event),
      ),
    ),
  );

  Future<void> _rotate(HostFormatsCourtsState state) async {
    final l10n = context.l10n;
    final round = state.nextRoundIndex;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(l10n),
      title: l10n.hostFormatsRotateConfirmTitle(number: round + 1),
      message: l10n.hostFormatsRotateConfirmBody,
      confirmLabel: l10n.hostFormatsRotateConfirm,
    );
    if (confirmed != true || !mounted) return;
    try {
      await EventSuccessController.publishRotationRoundMutation.run(
        ref,
        (tx) => tx
            .get(eventSuccessControllerProvider.notifier)
            .publishGuidedRotationRound(
              eventId: widget.event.id,
              roundIndex: round,
              expectedRevision: state.liveControlRevision,
              confirmed: true,
            ),
      );
    } on Object {
      // The mutation's error shows as a notice.
    }
  }
}
