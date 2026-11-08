import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_live_board_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alert_actions.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The live board (RbProgLiveBoard), always night, from
/// `getProgramLiveBoard`. Alert actions run `resolveProgramAlert`; All
/// alerts opens the staff Alerts screen; the top bar plans a message.
class HostProgrammeLiveBoardScreen extends ConsumerStatefulWidget {
  const HostProgrammeLiveBoardScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeLiveBoardScreen> createState() =>
      _HostProgrammeLiveBoardScreenState();
}

class _HostProgrammeLiveBoardScreenState
    extends ConsumerState<HostProgrammeLiveBoardScreen> {
  String? _busy;

  Future<void> _act(ProgramLiveAlert alert, ProgramAlertAction action) async {
    final l10n = context.l10n;
    setState(() => _busy = alert.alertId);
    final ok = await resolveStaffAlert(ref, widget.programId, alert, action);
    if (!mounted) return;
    setState(() => _busy = null);
    if (!ok) {
      showCatchNotice(
        context,
        l10n.hostStaffAlertsActionFailed,
        tone: CatchNoticeTone.danger,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final programId = widget.programId;
    final programme = ref.watch(hostProgrammeControllerProvider(programId));
    final board = ref.watch(programLiveBoardViewProvider(programId));
    final loaded = board.value?.value;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-live-board-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          title: programme.program?.title ?? l10n.hostProgrammeLiveTitle,
          live: l10n.hostProgrammeLiveBadge,
          actions: [
            CatchButton(
              label: l10n.hostProgrammeLiveMessage,
              size: CatchButtonSize.sm,
              onPressed: () => openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.message,
              ),
            ),
          ],
        ),
        body: HostProgrammeLiveBoardBody(
          status: board.hasError
              ? HostProgrammeStatus.error
              : loaded == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          board: loaded,
          busyAlertId: _busy,
          onAction: (alert, action) => unawaited(_act(alert, action)),
          onAllAlerts: () => context.pushNamed(
            Routes.hostWorkAttentionScreen.name,
            pathParameters: {'programId': programId},
          ),
          onRetry: () =>
              ref.invalidate(programLiveBoardViewProvider(programId)),
        ),
      ),
    );
  }
}
