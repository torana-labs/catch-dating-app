import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Unified entry point for restricted Host staff.
///
/// `listMyHostAssignments` resolves every live grant the signed-in account
/// holds across event and program scopes, plus the shell the account should
/// land in. A staff member holding exactly one assignment forwards straight
/// into its scope workspace; more than one renders the picker grouped by
/// organizer. Managers keep the full host shell — they reach this screen
/// only when they also carry staff grants and want the scoped view.
///
/// The picker itself grants nothing: every destination re-checks its own
/// server-side access before it renders.
class HostWorkScreen extends ConsumerStatefulWidget {
  const HostWorkScreen({super.key});

  @override
  ConsumerState<HostWorkScreen> createState() => _HostWorkScreenState();
}

class _HostWorkScreenState extends ConsumerState<HostWorkScreen> {
  ProviderSubscription<AsyncValue<HostWorkAssignments>>?
  _autoForwardSubscription;

  @override
  void initState() {
    super.initState();
    _listenForSingleAssignment();
  }

  @override
  void dispose() {
    _autoForwardSubscription?.close();
    super.dispose();
  }

  /// A lone live assignment is the workspace, not a menu item — forward
  /// straight into it once the read settles, mirroring the invite-claim
  /// entry path.
  void _listenForSingleAssignment() {
    _autoForwardSubscription = ref.listenManual(hostWorkAssignmentsProvider, (
      _,
      next,
    ) {
      final result = next.asData?.value;
      if (next.isLoading || result == null) return;
      if (result.shellEntry != HostWorkShellEntry.workShell ||
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
        _openAssignment(context, assignment, replace: true);
      });
    }, fireImmediately: true);
  }

  @override
  Widget build(BuildContext context) {
    final assignmentsAsync = ref.watch(hostWorkAssignmentsProvider);
    return CatchAsyncBoundary<HostWorkAssignments>(
      retainDataOn: const {},
      value: assignmentsAsync,
      onRetry: () => ref.invalidate(hostWorkAssignmentsProvider),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostWorkShellTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostWorkShellTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, result) => HostWorkPageBody(assignments: result),
    );
  }
}

/// The resolved assignment picker, grouped by organizer.
class HostWorkPageBody extends StatelessWidget {
  const HostWorkPageBody({super.key, required this.assignments});

  final HostWorkAssignments assignments;

  @override
  Widget build(BuildContext context) {
    final groups = <String, List<HostWorkAssignment>>{};
    for (final assignment in assignments.assignments) {
      groups.putIfAbsent(assignment.organizerName, () => []).add(assignment);
    }

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostWorkShellTitle,
        subtitle: context.l10n.hostWorkShellSubtitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          if (assignments.isEmpty)
            CatchSectionListItem(
              child: CatchEmptyState(
                icon: CatchIcons.locked,
                title: context.l10n.hostWorkShellEmptyTitle,
                message: context.l10n.hostWorkShellEmptyMessage,
              ),
            ),
          for (final group in groups.entries)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: group.key,
                child: Column(
                  children: [
                    for (final assignment in group.value)
                      CatchFieldRow.standard(
                        leading: Icon(
                          assignment.isProgram
                              ? CatchIcons.people
                              : CatchIcons.ticket,
                        ),
                        body: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CatchText(
                              assignment.title,
                              variant: CatchTextVariant.sectionTitle,
                            ),
                            if (assignment.subtitle case final subtitle?)
                              CatchText(
                                subtitle,
                                variant: CatchTextVariant.bodyS,
                              ),
                            CatchText(
                              _assignmentMeta(context, assignment),
                              variant: CatchTextVariant.bodyS,
                            ),
                          ],
                        ),
                        trailing:
                            assignment.isProgram &&
                                assignment.duties.any(
                                  (duty) =>
                                      duty.duty == HostWorkDuty.programAdmin,
                                ) &&
                                assignment.duties.any(
                                  (duty) =>
                                      duty.duty != HostWorkDuty.programAdmin,
                                )
                            ? CatchIconAction.icon(
                                icon: CatchIcons.people,
                                tooltip: context.l10n.programsTeamTitle,
                                onPressed: () => context.pushNamed(
                                  Routes.hostProgramTeamScreen.name,
                                  pathParameters: {
                                    'programId': assignment.scopeId,
                                  },
                                ),
                              )
                            : Icon(CatchIcons.disclosure),
                        onTap: () => _openAssignment(context, assignment),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

void _openAssignment(
  BuildContext context,
  HostWorkAssignment assignment, {
  bool replace = false,
}) {
  final adminOnly =
      assignment.isProgram &&
      assignment.duties.isNotEmpty &&
      assignment.duties.every((duty) => duty.duty == HostWorkDuty.programAdmin);
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

String _assignmentMeta(BuildContext context, HostWorkAssignment assignment) {
  final l10n = context.l10n;
  final duties = assignment.duties
      .map((duty) => _dutyLabel(l10n, duty.duty))
      .toSet()
      .join(' · ');
  return [
    assignment.isProgram
        ? l10n.hostWorkAssignmentKindProgram
        : l10n.hostWorkAssignmentKindEvent,
    if (duties.isNotEmpty) duties,
    if (assignment.grantExpiresAt case final expiresAt?)
      l10n.hostWorkAssignmentExpires(
        date: AppTimeFormatters.dateTime(expiresAt),
      ),
  ].join(' · ');
}

String _dutyLabel(AppLocalizations l10n, HostWorkDuty duty) {
  return switch (duty) {
    HostWorkDuty.programAdmin => l10n.programsTeamProgramAdmin,
    HostWorkDuty.programCoordinator => l10n.hostWorkDutyProgramCoordinator,
    HostWorkDuty.guestRelations => l10n.hostWorkDutyGuestRelations,
    HostWorkDuty.communications => l10n.hostWorkDutyCommunications,
    HostWorkDuty.functionCheckIn => l10n.hostWorkDutyFunctionCheckIn,
    HostWorkDuty.functionLead => l10n.hostWorkDutyFunctionLead,
    HostWorkDuty.airportGreeter => l10n.hostWorkDutyAirportGreeter,
    HostWorkDuty.hotelDesk => l10n.hostWorkDutyHotelDesk,
    HostWorkDuty.transportDispatcher => l10n.hostWorkDutyTransportDispatcher,
    HostWorkDuty.reconciliationViewer => l10n.hostWorkDutyReconciliationViewer,
    HostWorkDuty.stakeholderViewer => l10n.hostWorkDutyStakeholderViewer,
    HostWorkDuty.eventLead => l10n.hostWorkDutyEventLead,
  };
}
