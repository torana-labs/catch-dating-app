import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guest_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_answers_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_state.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The guest list for programme staff on the work shell (Guests on their
/// jobs): every household with its members and their answer for each
/// function, the guests with no household and the guest groups.
///
/// It reads `getProgramWorkAccess` (not the manager-only organizer read)
/// and the live guest list. Anyone who may open it (a manager or the guest
/// relations duty) changes a guest's answers through
/// `recordProgramFunctionRsvp`; the guest relations and communications
/// duties send a household's RSVP link (`issueProgramHouseholdRsvpLink`,
/// then the share sheet); a manager or a coordinator adds guests and edits
/// groups with their hotels. Others see the access notice.
class StaffGuestsScreen extends ConsumerStatefulWidget {
  const StaffGuestsScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  ConsumerState<StaffGuestsScreen> createState() => _StaffGuestsScreenState();
}

class _StaffGuestsScreenState extends ConsumerState<StaffGuestsScreen> {
  String? _sharing;

  Future<void> _shareLink(ProgramHouseholdRow household) async {
    final subject = context.l10n.programsGuestsRsvpLinkSubject(
      household: household.label,
    );
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    setState(() => _sharing = household.householdId);
    try {
      // provider-graph: ownership-widget-async:_StaffGuestsScreenState._shareLink:await:programWorkspaceControllerProvider.issueHouseholdRsvpLink watch CAT156 -- The workspace controller issues the RSVP link and owns its error; the widget holds a local sharing flag while the share sheet opens. Move the flag into the controller in the CAT156 migration.
      final link = await ref
          .read(programWorkspaceControllerProvider.notifier)
          .issueHouseholdRsvpLink(
            programId: widget.programId,
            householdId: household.householdId,
          );
      final url = AppConfig.publicSiteUrl.resolve(
        '/rsvp/${Uri.encodeComponent(link.token)}',
      );
      // provider-graph: ownership-widget-async:_StaffGuestsScreenState._shareLink:await:externalShareControllerProvider.shareText watch CAT156 -- Sharing the issued link through the platform share controller; mechanical share-sheet feedback under the same local sharing flag.
      await ref
          .read(externalShareControllerProvider)
          .shareText(text: url.toString(), subject: subject, origin: origin);
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'share a household RSVP link');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _sharing = null);
    }
  }

  void _retry() {
    final programId = widget.programId;
    ref
      ..invalidate(programWorkEntryProvider(programId, null))
      ..invalidate(programGuestListProvider(programId));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final programId = widget.programId;
    final now = widget.now?.call() ?? DateTime.now();
    final accessValue = ref.watch(programWorkEntryProvider(programId, null));
    final guestsValue = ref.watch(programGuestListProvider(programId));
    final access = accessValue.value?.value;
    final manages =
        access != null &&
        (access.isManager ||
            access.hasDuty(ProgramStaffDuty.programCoordinator, now: now));
    final state = switch ((access, accessValue.error ?? guestsValue.error)) {
      (_, final error?) => StaffGuestsState(
        status: StaffGuestsStatus.error,
        title: access?.title,
        error: error,
      ),
      (final access?, null) => StaffGuestsState.from(
        access: access,
        page: guestsValue.value,
        now: now,
        groups: manages
            ? ref.watch(programGuestGroupListProvider(programId)).value
            : null,
        households: manages
            ? ref.watch(programHouseholdListProvider(programId)).value
            : null,
      ),
      (null, null) => const StaffGuestsState(status: StaffGuestsStatus.loading),
    };
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-guests-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.programsGuestsTitle,
          kicker: state.title,
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
        ),
        body: StaffGuestsBody(
          state: state,
          onRetry: _retry,
          sharingHouseholdId: _sharing,
          onShareLink: (household) => unawaited(_shareLink(household)),
          onEditGuest: (guest, household) => unawaited(
            editHostProgrammeAnswers(
              context,
              ref,
              programId: programId,
              guest: guest,
              household: household,
              answers: [
                for (final function in state.functions)
                  HostProgrammeAnswer(
                    functionId: function.functionId,
                    name: function.name,
                    reply: state.reply(guest, function),
                  ),
              ],
            ),
          ),
          onAddGuest: () => unawaited(
            addHostProgrammeGuest(
              context,
              ref,
              programId: programId,
              households: state.allHouseholds,
              groups: state.groups,
            ),
          ),
          onEditGroup: (group) => unawaited(
            editHostProgrammeGroup(
              context,
              ref,
              programId: programId,
              hotels: state.hotels,
              group: group,
            ),
          ),
        ),
      ),
    );
  }
}
