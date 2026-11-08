import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_household_body.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One household (RbProgHousehold): who is in it and what each of them
/// answered.
///
/// Send their link again mints the household RSVP token with
/// `issueProgramHouseholdRsvpLink` and hands the link to the share sheet;
/// Call opens the phone.
class HostProgrammeHouseholdScreen extends ConsumerStatefulWidget {
  const HostProgrammeHouseholdScreen({
    super.key,
    required this.programId,
    required this.householdId,
  });

  final String programId;
  final String householdId;

  @override
  ConsumerState<HostProgrammeHouseholdScreen> createState() =>
      _HostProgrammeHouseholdScreenState();
}

class _HostProgrammeHouseholdScreenState
    extends ConsumerState<HostProgrammeHouseholdScreen> {
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeControllerProvider(widget.programId));
    final household = state.guests == null
        ? null
        : state.household(widget.householdId);
    final archived = state.program?.status == ProgramStatus.archived;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-household-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToGuests),
          kicker: state.program?.title,
          title: household?.label,
        ),
        body: HostProgrammeHouseholdBody(
          state: state,
          householdId: widget.householdId,
          sending: _sending,
          onCall: (phone) => unawaited(
            ref
                .read(externalLinkControllerProvider)
                .open(Uri(scheme: 'tel', path: phone)),
          ),
          onSendLink: household == null || archived
              ? null
              : () => unawaited(_sendLink(household.label)),
          onRetry: () => refreshHostProgramme(ref, widget.programId),
        ),
      ),
    );
  }

  Future<void> _sendLink(String label) async {
    final subject = context.l10n.hostProgrammeHouseholdLinkSubject(
      household: label,
    );
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    setState(() => _sending = true);
    try {
      // provider-graph: ownership-widget-async:_HostProgrammeHouseholdScreenState._sendLink:await:programWorkspaceControllerProvider.issueHouseholdRsvpLink watch CAT156 -- The workspace controller issues the RSVP link and owns its error; the widget holds a local sending flag while the share sheet opens. Move the flag into the controller in the CAT156 migration.
      final link = await ref
          .read(programWorkspaceControllerProvider.notifier)
          .issueHouseholdRsvpLink(
            programId: widget.programId,
            householdId: widget.householdId,
          );
      final url = AppConfig.publicSiteUrl.resolve(
        '/rsvp/${Uri.encodeComponent(link.token)}',
      );
      // provider-graph: ownership-widget-async:_HostProgrammeHouseholdScreenState._sendLink:await:externalShareControllerProvider.shareText watch CAT156 -- Sharing the issued link through the platform share controller; mechanical share-sheet feedback under the same local sending flag.
      await ref
          .read(externalShareControllerProvider)
          .shareText(text: url.toString(), subject: subject, origin: origin);
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'send a household RSVP link');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}
