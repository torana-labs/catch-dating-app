import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_lead_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_lead_state.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The function lead's board, always night: the next function and how
/// long until it starts, the counts for the one on now, and the day's run
/// of show. A pure projection over the programme's work access; no command.
class StaffLeadScreen extends ConsumerWidget {
  const StaffLeadScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final clock = now?.call() ?? DateTime.now();
    final access = ref.watch(programWorkEntryProvider(programId, null));
    final state = switch (access) {
      AsyncData(:final value) => StaffLeadState.fromAccess(
        value.value,
        now: clock,
      ),
      AsyncError() => const StaffLeadState.error(),
      _ => const StaffLeadState.loading(),
    };
    final current = state.current;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-lead-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: current?.name ?? (state.title.isEmpty ? null : state.title),
          kicker: [
            ?current?.venueName,
            AppTimeFormatters.time(clock.toLocal()),
          ].join(' · '),
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffLeadLive,
        ),
        body: StaffLeadBody(
          state: state,
          onOpenDoor: (function) => context.pushNamed(
            Routes.hostWorkDoorScreen.name,
            pathParameters: {
              'programId': programId,
              'functionId': function.functionId,
            },
            queryParameters: {'function': function.name},
          ),
          onAlerts: () => context.pushNamed(
            Routes.hostWorkAttentionScreen.name,
            pathParameters: {'programId': programId},
          ),
          onRetry: () =>
              ref.invalidate(programWorkEntryProvider(programId, null)),
        ),
      ),
    );
  }
}
