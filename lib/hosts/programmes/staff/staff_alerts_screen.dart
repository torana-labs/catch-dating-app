import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alert_actions.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alerts_body.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The alerts for this person's jobs at a programme, always night, from
/// `getProgramLiveBoard`: the server returns only the alerts stamped for
/// duties the caller holds (planners and coordinators also see flights).
/// Take it, Done and Reopen run `resolveProgramAlert`.
class StaffAlertsScreen extends ConsumerStatefulWidget {
  const StaffAlertsScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  ConsumerState<StaffAlertsScreen> createState() => _StaffAlertsScreenState();
}

class _StaffAlertsScreenState extends ConsumerState<StaffAlertsScreen> {
  StaffAlertsFilter _filter = StaffAlertsFilter.open;
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
    final board = catchAsyncStateFromAsyncValue(
      ref.watch(programLiveBoardViewProvider(programId)),
    );
    final title = catchAsyncStateFromAsyncValue(
      ref.watch(programWorkEntryProvider(programId, null)),
    ).value?.value.title;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-alerts-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: l10n.hostStaffAlertsTitle,
          kicker: title,
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffAlertsLive,
        ),
        body: StaffAlertsBody(
          status: switch (board) {
            CatchAsyncState(hasData: true) => StaffAlertsStatus.content,
            CatchAsyncState(hasError: true) => StaffAlertsStatus.error,
            _ => StaffAlertsStatus.loading,
          },
          board: board.value?.value,
          now: widget.now?.call() ?? DateTime.now(),
          filter: _filter,
          busyAlertId: _busy,
          onFilter: (value) => setState(() => _filter = value),
          onAction: (alert, action) => unawaited(_act(alert, action)),
          onRetry: () =>
              ref.invalidate(programLiveBoardViewProvider(programId)),
        ),
      ),
    );
  }
}
