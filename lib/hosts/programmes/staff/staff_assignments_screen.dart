import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_assignments_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Where restricted staff start: every programme and event this account
/// works at, from `listMyHostAssignments`.
///
/// One live assignment is the workspace, not a menu item: once the read
/// settles it replaces this route with that workspace. The list grants
/// nothing; every destination checks its own access on the server.
class StaffAssignmentsScreen extends ConsumerStatefulWidget {
  const StaffAssignmentsScreen({super.key});

  @override
  ConsumerState<StaffAssignmentsScreen> createState() =>
      _StaffAssignmentsScreenState();
}

class _StaffAssignmentsScreenState
    extends ConsumerState<StaffAssignmentsScreen> {
  ProviderSubscription<AsyncValue<HostWorkAssignments>>? _forward;

  @override
  void initState() {
    super.initState();
    _forward = ref.listenManual(hostWorkAssignmentsProvider, (_, next) {
      final result = next.asData?.value;
      if (next.isLoading ||
          result == null ||
          result.shellEntry != HostWorkShellEntry.workShell ||
          result.assignments.length != 1) {
        return;
      }
      final assignment = result.assignments.single;
      if (assignment.isProgram &&
          assignment.duties.any(
            (duty) => duty.duty == HostWorkDuty.programAdmin,
          )) {
        return;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || ModalRoute.of(context)?.isCurrent != true) return;
        _open(assignment, replace: true);
      });
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _forward?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final assignments = ref.watch(hostWorkAssignmentsProvider);
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('staff-assignments-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: l10n.hostStaffWorkKicker,
          title: l10n.hostStaffWorkTitle,
        ),
        body: StaffAssignmentsBody(
          status: switch (assignments) {
            AsyncData() => StaffAssignmentsStatus.content,
            AsyncError() => StaffAssignmentsStatus.error,
            _ => StaffAssignmentsStatus.loading,
          },
          assignments:
              assignments.asData?.value.assignments ??
              const <HostWorkAssignment>[],
          onOpen: _open,
          onTeam: (assignment) => context.pushNamed(
            Routes.hostProgramTeamScreen.name,
            pathParameters: {'programId': assignment.scopeId},
          ),
          onRetry: () => ref.invalidate(hostWorkAssignmentsProvider),
        ),
      ),
    );
  }

  void _open(HostWorkAssignment assignment, {bool replace = false}) {
    final adminOnly =
        assignment.isProgram &&
        assignment.duties.isNotEmpty &&
        assignment.duties.every(
          (duty) => duty.duty == HostWorkDuty.programAdmin,
        );
    final route = adminOnly
        ? Routes.hostProgramTeamScreen
        : assignment.isProgram
        ? Routes.hostWorkProgramScreen
        : Routes.hostWorkEventScreen;
    final pathParameters = {
      assignment.isProgram ? 'programId' : 'eventId': assignment.scopeId,
    };
    if (replace) {
      context.replaceNamed(route.name, pathParameters: pathParameters);
    } else {
      context.pushNamed(route.name, pathParameters: pathParameters);
    }
  }
}
