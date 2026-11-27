import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_answers_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_group_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_guest_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// The guest list commands the planner and the staff guest list share: add
// a guest, save or delete a group, and change a guest's answers. Each
// writes through `ProgramWorkspaceController`, then reads the programme,
// the guest list and its full group and household lists again so a new
// empty group or a moved guest shows at once.

void _refreshGuestLists(ProviderContainer container, String programId) {
  container
    ..invalidate(programGuestGroupListProvider(programId))
    ..invalidate(programHouseholdListProvider(programId));
}

/// Opens Add a guest and saves what it returns with `upsertProgramGuest`.
Future<void> addHostProgrammeGuest(
  BuildContext context,
  WidgetRef ref, {
  required String programId,
  required List<ProgramHouseholdRow> households,
  required List<ProgramGuestGroupRow> groups,
}) async {
  // Captured before any await: the screen may close while the write runs.
  final container = ProviderScope.containerOf(context, listen: false);
  final draft = await showCatchBottomSheet<HostProgrammeGuestDraft>(
    context: context,
    builder: (_) =>
        HostProgrammeGuestSheet(households: households, groups: groups),
  );
  if (draft == null || !context.mounted) return;
  final saved = await runHostProgrammeCommand(
    context,
    ref,
    programId: programId,
    reason: 'add a programme guest',
    run: (controller) => controller.upsertGuest(
      programId: programId,
      displayName: draft.displayName,
      householdId: draft.householdId,
      groupIds: draft.groupIds.isEmpty ? null : draft.groupIds,
      phoneE164: draft.phoneE164,
      email: draft.email,
    ),
  );
  if (saved) _refreshGuestLists(container, programId);
}

/// Opens the group sheet for [group] (null for a new one) and saves it with
/// `upsertProgramGuestGroup`, or deletes it with `deleteProgramGuestGroup`
/// after a confirmation. Both are fenced by the group revision.
Future<void> editHostProgrammeGroup(
  BuildContext context,
  WidgetRef ref, {
  required String programId,
  required List<ProgramHotel> hotels,
  ProgramGuestGroupRow? group,
}) async {
  // Captured before any await: the screen may close while the write runs.
  final container = ProviderScope.containerOf(context, listen: false);
  final decision = await showCatchBottomSheet<HostProgrammeGroupDecision>(
    context: context,
    builder: (_) => HostProgrammeGroupSheet(hotels: hotels, group: group),
  );
  if (decision == null || !context.mounted) return;
  if (decision.delete) {
    if (group == null) return;
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(l10n),
      title: l10n.programsGuestsGroupDeleteTitle,
      message: l10n.programsGuestsGroupDeleteMessage(label: group.label),
      confirmLabel: l10n.programsGuestsGroupDelete,
      danger: true,
    );
    if (confirmed != true || !context.mounted) return;
    final deleted = await runHostProgrammeCommand(
      context,
      ref,
      programId: programId,
      reason: 'delete a programme guest group',
      run: (controller) => controller.deleteGuestGroup(
        programId: programId,
        groupId: group.groupId,
        expectedRevision: group.revision,
      ),
    );
    if (deleted) _refreshGuestLists(container, programId);
    return;
  }
  final saved = await runHostProgrammeCommand(
    context,
    ref,
    programId: programId,
    reason: 'save a programme guest group',
    run: (controller) => controller.upsertGuestGroup(
      programId: programId,
      label: decision.label!,
      dimension: decision.dimension!,
      groupId: group?.groupId,
      expectedRevision: group?.revision,
      hotelId: decision.hotelId == group?.hotelId ? null : decision.hotelId,
      clearHotel: group?.hotelId != null && decision.hotelId == null,
    ),
  );
  if (saved) _refreshGuestLists(container, programId);
}

/// Opens [guest]'s answers for [answers] and records each change with
/// `recordProgramFunctionRsvp` (an uninvited function takes one too).
Future<void> editHostProgrammeAnswers(
  BuildContext context,
  WidgetRef ref, {
  required String programId,
  required ProgramGuestRow guest,
  required List<HostProgrammeAnswer> answers,
  String? household,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (sheetContext) => HostProgrammeAnswersSheet(
    guestName: guest.displayName,
    household: household,
    answers: answers,
    onAnswer: (functionId, reply) => runHostProgrammeCommand(
      sheetContext,
      ref,
      programId: programId,
      reason: 'record a guest answer',
      run: (controller) => controller.recordFunctionRsvp(
        programId: programId,
        functionId: functionId,
        guestId: guest.guestId,
        rsvpStatus: hostProgrammeRsvpStatus(reply),
        allowUninvited: true,
      ),
    ),
  ),
);

/// [guest]'s answer for a function from the guest list's join rows, the way
/// the staff guest list reads it: no row is no reply, an uninvited row is
/// not invited.
HostProgrammeReply hostProgrammeJoinReply(ProgramFunctionGuestRow? row) {
  if (row == null) return HostProgrammeReply.noReply;
  if (!row.invited) return HostProgrammeReply.notInvited;
  return switch (row.rsvpStatus) {
    'attending' => HostProgrammeReply.coming,
    'maybe' => HostProgrammeReply.maybe,
    'declined' => HostProgrammeReply.declined,
    _ => HostProgrammeReply.noReply,
  };
}
