import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_work_repository.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_attendance_actions_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The reconciliationViewer's attendance report: program-wide RSVP-vs-door
/// totals, then one row per function with its exception counts. Everything
/// here is counts and guest ids — the callable never returns PII.
class ProgramAttendanceReportScreen extends ConsumerStatefulWidget {
  const ProgramAttendanceReportScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<ProgramAttendanceReportScreen> createState() =>
      _ProgramAttendanceReportScreenState();
}

class _ProgramAttendanceReportScreenState
    extends ConsumerState<ProgramAttendanceReportScreen> {
  bool _exporting = false;

  Future<void> _export(
    ProgramAttendanceReport report,
    ProgramWorkAccess? access,
  ) async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      await ref
          .read(programAttendanceActionsProvider.notifier)
          .exportReport(
            programId: widget.programId,
            programTitle: access?.title ?? widget.programId,
            subject: context.l10n.programsAttendanceShareSubject(
              title: access?.title ?? widget.programId,
            ),
            functionNames: {
              for (final fn in access?.functions ?? <ProgramFunction>[])
                fn.functionId: fn.name,
            },
          );
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportAsync = ref.watch(
      programAttendanceReportProvider(widget.programId),
    );
    final access = ref
        .watch(programWorkEntryProvider(widget.programId, null))
        .value
        ?.value;
    final functionNames = <String, String>{
      for (final fn in access?.functions ?? <ProgramFunction>[])
        fn.functionId: fn.name,
    };
    return CatchAsyncBoundary<ProgramAttendanceReport>(
      retainDataOn: const {},
      value: reportAsync,
      onRetry: () =>
          ref.invalidate(programAttendanceReportProvider(widget.programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsAttendanceTitle,
          subtitle: context.l10n.programsAttendanceSubtitle,
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
          title: context.l10n.programsAttendanceTitle,
          subtitle: context.l10n.programsAttendanceSubtitle,
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
            retryLabel: context.l10n.programsAttendanceRefresh,
          ),
        ),
      ),
      builder: (context, report) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsAttendanceTitle,
          subtitle: context.l10n.programsAttendanceSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardSections(
          sections: [
            CatchSectionListItem(
              child: Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchButton.command(
                    label: _exporting
                        ? context.l10n.programsAttendanceExporting
                        : context.l10n.programsAttendanceExport,
                    leading: Icon(CatchIcons.download),
                    onPressed: _exporting
                        ? null
                        : () => _export(report, access),
                  ),
                ],
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsAttendanceProgramTitle,
                subtitle: context.l10n.programsAttendanceProgramSubtitle(
                  time: AppTimeFormatters.time(report.serverTime),
                ),
                child: Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    CatchBadge.functional(
                      label: context.l10n.programsAttendanceInvited(
                        count: report.programInvitedGuests,
                      ),
                    ),
                    CatchBadge.functional(
                      label: context.l10n.programsAttendanceAttending(
                        count: report.programAttendingGuests,
                      ),
                      tone: CatchBadgeTone.brand,
                    ),
                    CatchBadge.functional(
                      label: context.l10n.programsAttendanceCheckedIn(
                        count: report.programCheckedInGuests,
                      ),
                      tone: CatchBadgeTone.success,
                    ),
                    if (report.programNoShowGuests > 0)
                      CatchBadge.functional(
                        label: context.l10n.programsAttendanceNoShow(
                          count: report.programNoShowGuests,
                        ),
                        tone: CatchBadgeTone.warning,
                      ),
                  ],
                ),
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsAttendanceFunctionsTitle,
                subtitle: context.l10n.programsAttendanceFunctionsSubtitle,
                child: report.functions.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.review,
                        message: context.l10n.programsAttendanceEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final fn in report.functions)
                            ProgramFunctionAttendanceRow(
                              key: ValueKey(fn.functionId),
                              attendance: fn,
                              functionName: functionNames[fn.functionId],
                            ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One function's attendance reconciliation: invited vs attended vs
/// checked-in, plus the exception counts needing follow-up.
class ProgramFunctionAttendanceRow extends StatelessWidget {
  const ProgramFunctionAttendanceRow({
    super.key,
    required this.attendance,
    this.functionName,
  });

  final ProgramFunctionAttendance attendance;
  final String? functionName;

  @override
  Widget build(BuildContext context) {
    final attendance = this.attendance;
    return CatchFieldRow.standard(
      leading: Icon(CatchIcons.review),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            functionName ?? attendance.functionId,
            variant: CatchTextVariant.sectionTitle,
          ),
          CatchMetaRow(
            icon: CatchIcons.people,
            label: context.l10n.programsAttendanceRowCounts(
              invited: attendance.invitedGuests,
              attending: attendance.attendingGuests,
              checkedIn: attendance.checkedInGuests,
            ),
          ),
          if (attendance.walkInGuests > 0)
            CatchMetaRow(
              icon: CatchIcons.person,
              label: context.l10n.programsAttendanceWalkIns(
                count: attendance.walkInGuests,
              ),
            ),
          if (attendance.exceptions.count > 0) ...[
            gapH8,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                if (attendance.exceptions.invitedNoResponseGuestIds.isNotEmpty)
                  CatchBadge.functional(
                    label: context.l10n.programsAttendanceNoResponseException(
                      count: attendance
                          .exceptions
                          .invitedNoResponseGuestIds
                          .length,
                    ),
                    tone: CatchBadgeTone.warning,
                  ),
                if (attendance.exceptions.declinedCheckedInGuestIds.isNotEmpty)
                  CatchBadge.functional(
                    label: context.l10n.programsAttendanceDeclinedCheckedIn(
                      count: attendance
                          .exceptions
                          .declinedCheckedInGuestIds
                          .length,
                    ),
                    tone: CatchBadgeTone.danger,
                  ),
                if (attendance.exceptions.noShowGuestIds.isNotEmpty)
                  CatchBadge.functional(
                    label: context.l10n.programsAttendanceNoShow(
                      count: attendance.exceptions.noShowGuestIds.length,
                    ),
                    tone: CatchBadgeTone.warning,
                  ),
                if (attendance.exceptions.walkInGuestIds.isNotEmpty)
                  CatchBadge.functional(
                    label: context.l10n.programsAttendanceWalkInException(
                      count: attendance.exceptions.walkInGuestIds.length,
                    ),
                    tone: CatchBadgeTone.brand,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
