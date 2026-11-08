import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_team_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_team_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_invite_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The team (RbProgTeam): everyone working the programme, by job.
///
/// Invite runs `inviteProgramStaff` with one job for up to 14 days (or to
/// the day after the programme); Remove runs `revokeProgramStaff`.
class HostProgrammeTeamScreen extends ConsumerWidget {
  const HostProgrammeTeamScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeTeamControllerProvider(programId));
    final program = state.programme.program;
    final archived = program?.status == ProgramStatus.archived;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-team-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: l10n.hostProgrammeViewTeam,
          actions: [
            CatchButton(
              key: const ValueKey<String>('host-programme-team-invite'),
              label: l10n.hostProgrammeTeamInviteShort,
              size: CatchButtonSize.sm,
              leading: CatchIcon(CatchIcons.addPerson),
              onPressed: program == null || archived
                  ? null
                  : () => unawaited(_invite(context, ref, program.endsAt)),
            ),
          ],
        ),
        body: HostProgrammeTeamBody(
          state: state,
          onView: (view) => openHostProgrammeView(context, programId, view),
          onRemove: archived
              ? null
              : (member) => unawaited(_remove(context, ref, member)),
          onRetry: () => refreshHostProgrammeTeam(ref, programId),
        ),
      ),
    );
  }

  Future<void> _invite(
    BuildContext context,
    WidgetRef ref,
    DateTime endsAt,
  ) async {
    final invite = await showCatchBottomSheet<HostProgrammeInvite>(
      context: context,
      builder: (_) => const HostProgrammeInviteSheet(),
    );
    if (invite == null || !context.mounted) return;
    final now = ref.read(appClockProvider).now();
    final latest = now.add(const Duration(days: 14));
    final after = endsAt.add(const Duration(days: 1));
    final expiresAt = after.isBefore(latest) && after.isAfter(now)
        ? after
        : latest;
    final ok = await runHostProgrammeCommand(
      context,
      ref,
      programId: programId,
      reason: 'invite programme staff',
      done: context.l10n.hostProgrammeTeamInvited(name: invite.name),
      run: (controller) => controller.inviteStaff(
        programId: programId,
        phoneNumber: invite.phone,
        displayName: invite.name,
        expiresAt: expiresAt,
        duties: [
          ProgramDutyAssignment(
            duty: invite.duty,
            pickupPointIds: const {},
            hotelIds: const {},
            functionIds: const {},
            expiresAt: expiresAt,
          ),
        ],
      ),
    );
    if (ok) refreshHostProgrammeTeam(ref, programId);
  }

  Future<void> _remove(
    BuildContext context,
    WidgetRef ref,
    ProgramStaffMember member,
  ) async {
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(l10n),
      title: l10n.hostProgrammeTeamRemoveTitle(name: member.displayName),
      message: l10n.hostProgrammeTeamRemoveBody,
      confirmLabel: l10n.hostProgrammeTeamRemove,
      danger: true,
    );
    if (confirmed != true || !context.mounted) return;
    final ok = await runHostProgrammeCommand(
      context,
      ref,
      programId: programId,
      reason: 'remove programme staff',
      run: (controller) =>
          controller.revokeStaff(programId: programId, member: member),
    );
    if (ok) refreshHostProgrammeTeam(ref, programId);
  }
}
