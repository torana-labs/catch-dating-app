import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_function_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One function (RbProgFunction): its replies, who it invites, the door
/// and where it is.
///
/// Edit saves through `upsertProgramFunction`; Everyone and Hand-picked
/// run `applyProgramFunctionInvitations` (hand-picked keeps the guests
/// invited now); Cancel this function sets its status to cancelled; Open
/// the door opens the staff door for it.
class HostProgrammeFunctionScreen extends ConsumerStatefulWidget {
  const HostProgrammeFunctionScreen({
    super.key,
    required this.programId,
    required this.functionId,
  });

  final String programId;
  final String functionId;

  @override
  ConsumerState<HostProgrammeFunctionScreen> createState() =>
      _HostProgrammeFunctionScreenState();
}

class _HostProgrammeFunctionScreenState
    extends ConsumerState<HostProgrammeFunctionScreen> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeControllerProvider(widget.programId));
    final function = state.function(widget.functionId);
    final program = state.program;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-function-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: function?.name,
          action: program == null || function == null
              ? null
              : CatchTopBarAction(
                  label: l10n.hostProgrammeEdit,
                  onPressed: () => unawaited(
                    editHostProgrammeFunction(
                      context,
                      ref,
                      program: program,
                      function: function,
                    ),
                  ),
                ),
        ),
        body: HostProgrammeFunctionBody(
          state: state,
          functionId: widget.functionId,
          busy: _busy,
          onInvitation: (invitation) => unawaited(_invite(state, invitation)),
          onOpenDoor: () => context.pushNamed(
            Routes.hostWorkDoorScreen.name,
            pathParameters: {
              'programId': widget.programId,
              'functionId': widget.functionId,
            },
            queryParameters: {'function': ?function?.name},
          ),
          onCancel: () => unawaited(_cancel(state)),
          onRetry: () => refreshHostProgramme(ref, widget.programId),
        ),
      ),
    );
  }

  Future<void> _invite(
    HostProgrammeState state,
    HostProgrammeInvitation invitation,
  ) async {
    final function = state.function(widget.functionId);
    if (function == null) return;
    final invited = [
      for (final guest in state.guests?.guests ?? const <ProgramGuestRow>[])
        if (state.reply(guest, function) != HostProgrammeReply.notInvited)
          guest.guestId,
    ];
    setState(() => _busy = true);
    await runHostProgrammeCommand(
      context,
      ref,
      programId: widget.programId,
      reason: 'change who a programme function invites',
      run: (controller) => controller.applyFunctionInvitations(
        programId: widget.programId,
        functionId: function.functionId,
        expectedRevision: function.revision,
        invitationMode: switch (invitation) {
          HostProgrammeInvitation.everyone => 'allGuests',
          HostProgrammeInvitation.handPicked => 'selectedGuests',
        },
        selectedGuestIds: invitation == HostProgrammeInvitation.handPicked
            ? invited
            : null,
      ),
    );
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _cancel(HostProgrammeState state) async {
    final function = state.function(widget.functionId);
    if (function == null) return;
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(l10n),
      title: l10n.hostProgrammeFunctionCancel(name: function.name),
      message: l10n.hostProgrammeFunctionCancelBody,
      confirmLabel: l10n.hostProgrammeFunctionCancelConfirm,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    await runHostProgrammeCommand(
      context,
      ref,
      programId: widget.programId,
      reason: 'cancel a programme function',
      run: (controller) => controller.upsertFunction(
        programId: widget.programId,
        functionId: function.functionId,
        expectedRevision: function.revision,
        name: function.name,
        startsAt: function.startsAt,
        endsAt: function.endsAt,
        venueName: function.venueName,
        status: 'cancelled',
      ),
    );
    if (mounted) setState(() => _busy = false);
  }
}
