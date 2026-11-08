import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart'
    show HostOrganizerEventDefaultsScreen;
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer's event defaults: what every new event starts with. It
/// watches [hostEventDefaultsControllerProvider], saves how guests pay on
/// change through the progressive setup defaults command, and opens the
/// existing editor for the text and number defaults.
class HostEventDefaultsScreen extends ConsumerWidget {
  const HostEventDefaultsScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostEventDefaultsControllerProvider(organizerId));
    final saving = ref.watch(HostEventCommands.defaultsMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventCommands.defaultsMutation],
      errorContext: AppErrorContext.organizer,
    );
    void saveDefaults(
      ManagerEventSetupPreferences Function(ManagerEventSetupPreferences) next,
    ) {
      final current = ref
          .read(managerEventSetupDefaultsViewProvider(organizerId))
          .value
          ?.defaults;
      if (current == null) return;
      unawaited(
        HostEventCommands.defaultsMutation
            .run(
              ref,
              (tx) => tx
                  .get(hostEventCommandsProvider.notifier)
                  .updateDefaults(
                    current: current,
                    next: next(current.preferences),
                  ),
            )
            .then<void>((_) {}, onError: (Object _) {}),
      );
    }

    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-defaults-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsDefaultsTitle,
          kicker: l10n.hostEventsDefaultsKicker,
        ),
        bodyScrolls: false,
        body: HostEventDefaultsBody(
          state: state,
          saving: saving,
          onCollection: (option) => saveDefaults(
            (preferences) => preferences.copyWith(collectionPreference: option),
          ),
          onChange: (next) => saveDefaults((_) => next),
          onEdit: () => unawaited(
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    HostOrganizerEventDefaultsScreen(organizerId: organizerId),
              ),
            ),
          ),
          onRetry: () => ref.invalidate(
            managerEventSetupDefaultsViewProvider(organizerId),
          ),
        ),
      ),
    );
  }
}
