import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_publish_body.dart';
import 'package:catch_dating_app/hosts/events/event_publish_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Who can see and book the event. It watches
/// [hostEventPublishControllerProvider] and commits a choice through the
/// progressive setup publication command; the setup view listener then
/// shows the result.
class HostEventPublishScreen extends ConsumerWidget {
  const HostEventPublishScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostEventPublishControllerProvider(request));
    final saving = ref.watch(HostEventCommands.publicationMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventCommands.publicationMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-publish-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsLinkPublish,
          kicker: state.eventTitle,
        ),
        bodyScrolls: false,
        body: HostEventPublishBody(
          state: state,
          saving: saving,
          onPublished: (published) {
            final revision = state.setupRevision;
            if (revision == null) return;
            unawaited(
              HostEventCommands.publicationMutation
                  .run(
                    ref,
                    (tx) => tx
                        .get(hostEventCommandsProvider.notifier)
                        .setPublication(
                          organizerId: request.organizerId,
                          eventId: request.eventId,
                          expectedSetupRevision: revision,
                          published: published,
                        ),
                  )
                  .then<void>((_) {}, onError: (Object _) {}),
            );
          },
          onRetry: () => ref.invalidate(
            privateEventSetupViewProvider(
              organizerId: request.organizerId,
              eventId: request.eventId,
            ),
          ),
        ),
      ),
    );
  }
}
