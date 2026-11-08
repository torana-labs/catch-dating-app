import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alerts_body.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The alerts for this person's jobs at a programme, always night, from
/// `listProgramStaffAttention`: the server returns only the alerts stamped
/// for duties the caller holds. Read only; nothing here sends a command.
class StaffAlertsScreen extends ConsumerWidget {
  const StaffAlertsScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final feed = catchAsyncStateFromAsyncValue(
      ref.watch(programStaffAttentionProvider(programId)),
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
          status: switch (feed) {
            CatchAsyncState(hasData: true) => StaffAlertsStatus.content,
            CatchAsyncState(hasError: true) => StaffAlertsStatus.error,
            _ => StaffAlertsStatus.loading,
          },
          feed: feed.value,
          now: now?.call() ?? DateTime.now(),
          onRetry: () =>
              ref.invalidate(programStaffAttentionProvider(programId)),
        ),
      ),
    );
  }
}
