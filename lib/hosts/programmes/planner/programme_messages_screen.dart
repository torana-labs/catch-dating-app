import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_messages_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Planned messages (RbHostProgramMessages), read from
/// `listOrganizerMoments` with the programme scope. A row opens the
/// message; Plan another message opens a new one.
class HostProgrammeMessagesScreen extends ConsumerWidget {
  const HostProgrammeMessagesScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final programme = ref.watch(hostProgrammeControllerProvider(programId));
    final messages = ref.watch(programPlannedMessagesProvider(programId));
    final status =
        messages.hasError || programme.status == HostProgrammeStatus.error
        ? HostProgrammeStatus.error
        : (messages.hasValue && programme.status == HostProgrammeStatus.ready
              ? HostProgrammeStatus.ready
              : HostProgrammeStatus.loading);
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-messages-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: programme.program?.title,
          title: l10n.hostProgrammeMessagesTitle,
        ),
        body: HostProgrammeMessagesBody(
          status: status,
          messages: messages.value,
          functions: programme.functions,
          onOpen: (message) => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.message,
            id: message.momentId,
          ),
          onPlan: () => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.message,
          ),
          onRetry: () {
            refreshHostProgramme(ref, programId);
            ref.invalidate(programPlannedMessagesProvider(programId));
          },
        ),
      ),
    );
  }
}
