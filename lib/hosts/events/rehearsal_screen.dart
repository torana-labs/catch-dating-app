import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_body.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A rehearsal of one night, always on the night theme: the practice
/// badge, the plan's steps and the one to practise now, the practice door
/// and End rehearsal.
///
/// It watches [hostRehearsalControllerProvider]. Open the practice door
/// opens the rehearsal's own practice screens, which keep its state
/// machine; End rehearsal is the existing complete command.
class HostRehearsalScreen extends ConsumerWidget {
  const HostRehearsalScreen({
    super.key,
    required this.organizerId,
    required this.sessionId,
  });

  final String organizerId;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hostRehearsalControllerProvider(sessionId));
    final ending = ref
        .watch(EventRehearsalController.completeMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventRehearsalController.completeMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: Builder(
        builder: (context) => CatchScreen(
          key: const ValueKey<String>('host-rehearsal-screen'),
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            title: context.l10n.hostEventsRehearsalScreenTitle,
            kicker: state.title,
            back: CatchTopBarBack(
              label: context.l10n.hostEventsRehearsalClose,
              close: true,
            ),
          ),
          bodyScrolls: false,
          body: HostRehearsalBody(
            state: state,
            ending: ending,
            onOpenDoor: () => unawaited(
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => HostEventRehearsalScreen(
                    organizerId: organizerId,
                    sessionId: sessionId,
                  ),
                ),
              ),
            ),
            onEnd: () => unawaited(
              EventRehearsalController.completeMutation
                  .run(
                    ref,
                    (tx) => tx
                        .get(eventRehearsalControllerProvider.notifier)
                        .complete(sessionId),
                  )
                  .then<void>((_) {}, onError: (Object _) {}),
            ),
            onRetry: () => ref.invalidate(eventRehearsalProvider(sessionId)),
          ),
        ),
      ),
    );
  }
}
