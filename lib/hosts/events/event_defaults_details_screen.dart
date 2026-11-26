import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_controller.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_details_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Edits the text and number event defaults: usual length, time zone, usual
/// venue, how long an offer holds, the offer message, the collection method,
/// currency, payment instructions and the reusable payment page.
///
/// It watches [hostEventDefaultsControllerProvider] and the defaults save,
/// and hands each change to [onChange]. The event defaults screen that opens
/// it saves through its journaled command, so a save this phone could not
/// confirm is offered again there before any other change.
class HostEventDefaultsDetailsScreen extends ConsumerWidget {
  const HostEventDefaultsDetailsScreen({
    super.key,
    required this.organizerId,
    required this.onChange,
  });

  final String organizerId;

  /// Saves the defaults with one change; null while a save cannot be made.
  final ValueChanged<ManagerEventSetupPreferences>? onChange;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostEventDefaultsControllerProvider(organizerId));
    final saving = ref.watch(HostEventCommands.defaultsMutation).isPending;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-defaults-details-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsDefaultsTitle,
          kicker: l10n.hostEventsDefaultsKicker,
        ),
        bodyScrolls: false,
        body: HostEventDefaultsDetailsBody(
          state: state,
          onChange: saving ? null : onChange,
          onRetry: () => ref.invalidate(
            managerEventSetupDefaultsViewProvider(organizerId),
          ),
        ),
      ),
    );
  }
}
