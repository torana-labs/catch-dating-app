import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Door workspace for one program function. `functionCheckIn` and
/// `functionLead` staff land here from the work shell; the durable journal
/// owns every attendance transition and queued work replays through the
/// program operations outbox when the venue network drops.
class ProgramFunctionDoorScreen extends ConsumerStatefulWidget {
  const ProgramFunctionDoorScreen({
    super.key,
    required this.programId,
    required this.functionId,
    this.functionName,
    this.now,
  });

  final String programId;
  final String functionId;

  /// Carried through the route query so loading and error frames can title
  /// the function before the scoped view resolves, like station labels on the
  /// arrivals and dispatch routes.
  final String? functionName;
  final DateTime Function()? now;

  @override
  ConsumerState<ProgramFunctionDoorScreen> createState() =>
      _ProgramFunctionDoorScreenState();
}

class _ProgramFunctionDoorScreenState
    extends ConsumerState<ProgramFunctionDoorScreen> {
  final _walkInName = TextEditingController();
  final _walkInPartySize = TextEditingController();

  @override
  void dispose() {
    _walkInName.dispose();
    _walkInPartySize.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = uidState.isSettledData ? uidState.value : null;
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(widget.programId)),
    );
    final outbox =
        operations.value?.outbox ?? const ProgramOperationOutboxSummary([]);
    final doorAsync = ref.watch(
      programFunctionDoorViewWithSnapshotProvider(
        widget.programId,
        widget.functionId,
      ),
    );
    final title = widget.functionName ?? context.l10n.programsDoorTitle;
    return CatchAsyncBoundary<ProgramReadView<ProgramDoorView>>(
      retainDataOn: const {},
      value: doorAsync,
      onRetry: () => ref.invalidate(
        programFunctionDoorViewProvider(widget.programId, widget.functionId),
      ),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: title,
          subtitle: context.l10n.programsDoorTitle,
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
          title: title,
          subtitle: context.l10n.programsDoorTitle,
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
      builder: (context, result) => ProgramDoorPageBody(
        view: result.value,
        snapshotAt: result.snapshotAt,
        outbox: outbox,
        operationsBusy: operations.value?.busy ?? false,
        showOperationsNotice:
            operations.hasError || operations.value?.hasStatus == true,
        programId: widget.programId,
        walkInName: _walkInName,
        walkInPartySize: _walkInPartySize,
        onGuestAction: (guest, action) =>
            _onGuestAction(context, accountId, guest, action),
        onSubmitWalkIn: () => _submitWalkIn(accountId),
      ),
    );
  }

  Future<void> _onGuestAction(
    BuildContext context,
    String? accountId,
    ProgramDoorGuest guest,
    ProgramDoorRowAction action,
  ) async {
    if (accountId == null) return;
    int? partySize;
    if (action == ProgramDoorRowAction.partySize) {
      partySize = await showCatchBottomSheet<int?>(
        context: context,
        builder: (_) => ProgramDoorPartySizeSheet(guest: guest),
      );
      if (partySize == null || partySize == guest.partySize) return;
    }
    await ref
        .read(
          programOperationsControllerProvider(
            widget.programId,
            accountId,
          ).notifier,
        )
        .doorAction(
          functionId: widget.functionId,
          guestId: guest.guestId,
          action: switch (action) {
            ProgramDoorRowAction.checkIn => 'checkIn',
            ProgramDoorRowAction.undoCheckIn => 'undoCheckIn',
            ProgramDoorRowAction.markNoShow => 'markNoShow',
            ProgramDoorRowAction.partySize => 'partySizeAdjust',
          },
          partySize: partySize,
        );
  }

  Future<void> _submitWalkIn(String? accountId) async {
    if (accountId == null) return;
    final name = _walkInName.text.trim();
    if (name.isEmpty) return;
    final recorded = await ref
        .read(
          programOperationsControllerProvider(
            widget.programId,
            accountId,
          ).notifier,
        )
        .walkIn(
          functionId: widget.functionId,
          displayName: name,
          partySize: int.tryParse(_walkInPartySize.text.trim()),
        );
    if (recorded && mounted) {
      _walkInName.clear();
      _walkInPartySize.clear();
    }
  }
}

enum ProgramDoorRowAction { checkIn, undoCheckIn, markNoShow, partySize }

class ProgramDoorPageBody extends StatelessWidget {
  const ProgramDoorPageBody({
    super.key,
    required this.view,
    required this.programId,
    required this.outbox,
    required this.operationsBusy,
    required this.showOperationsNotice,
    required this.walkInName,
    required this.walkInPartySize,
    required this.onGuestAction,
    required this.onSubmitWalkIn,
    this.snapshotAt,
  });

  final ProgramDoorView view;
  final String programId;
  final ProgramOperationOutboxSummary outbox;
  final bool operationsBusy;
  final bool showOperationsNotice;
  final TextEditingController walkInName;
  final TextEditingController walkInPartySize;
  final void Function(ProgramDoorGuest guest, ProgramDoorRowAction action)
  onGuestAction;
  final VoidCallback onSubmitWalkIn;
  final DateTime? snapshotAt;

  @override
  Widget build(BuildContext context) {
    final fn = view.function;
    final doorOpen =
        fn.checkInEnabled && fn.status == ProgramFunctionStatus.scheduled;
    final pendingWalkIns = outbox.walkInsFor(view.functionId);
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: fn.name,
        subtitle: context.l10n.programsDoorTitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          if (snapshotAt != null)
            CatchSectionListItem(
              child: CatchBanner(
                title: context.l10n.programsSnapshotTitle,
                message: context.l10n.programsSnapshotBanner(
                  time: AppTimeFormatters.time(snapshotAt!),
                ),
                icon: CatchIcons.offline,
                tone: CatchBannerTone.warning,
              ),
            ),
          if (showOperationsNotice)
            CatchSectionListItem(
              child: ProgramOperationsNotice(
                programId: programId,
                pickupPointId: null,
              ),
            ),
          CatchSectionListItem(
            child: CatchSection.contained(
              title: fn.name,
              subtitle: _functionMeta(context),
              child: Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchBadge.functional(
                    label: context.l10n.programsDoorCountsCheckedIn(
                      count: view.counts.checkedInHeads,
                    ),
                    tone: CatchBadgeTone.success,
                  ),
                  CatchBadge(
                    label: context.l10n.programsDoorCountsExpected(
                      count: view.counts.expectedHeads,
                    ),
                  ),
                  if (view.counts.noShowCount > 0)
                    CatchBadge(
                      label: context.l10n.programsDoorCountsNoShow(
                        count: view.counts.noShowCount,
                      ),
                      tone: CatchBadgeTone.danger,
                    ),
                  if (view.counts.walkInCount > 0)
                    CatchBadge(
                      label: context.l10n.programsDoorCountsWalkIns(
                        count: view.counts.walkInCount,
                      ),
                      tone: CatchBadgeTone.brand,
                    ),
                ],
              ),
            ),
          ),
          if (!doorOpen)
            CatchSectionListItem(
              child: CatchBanner(
                message: fn.status == ProgramFunctionStatus.cancelled
                    ? context.l10n.programsDoorCancelledBanner
                    : context.l10n.programsDoorClosedBanner,
                icon: CatchIcons.locked,
                tone: CatchBannerTone.warning,
              ),
            ),
          CatchSectionListItem(
            child: CatchSection.contained(
              title: context.l10n.programsDoorRosterTitle,
              subtitle: context.l10n.programsDoorRosterSubtitle(
                count: view.counts.listedCount,
              ),
              child: Column(
                children: [
                  if (view.guests.isEmpty && pendingWalkIns.isEmpty)
                    CatchEmptyState(
                      icon: CatchIcons.checkIn,
                      message: context.l10n.programsDoorRosterEmpty,
                      variant: CatchEmptyStateVariant.inline,
                    )
                  else ...[
                    for (final guest in view.guests)
                      ProgramDoorGuestRow(
                        guest: guest,
                        doorOpen: doorOpen,
                        queuedStatus: outbox
                            .forDoorGuest(view.functionId, guest.guestId)
                            ?.status,
                        onAction: (action) => onGuestAction(guest, action),
                      ),
                    for (final entry in pendingWalkIns)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.addPerson),
                        body: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CatchText(
                              entry.payload['displayName']! as String,
                              variant: CatchTextVariant.sectionTitle,
                            ),
                            gapH4,
                            CatchBadge(
                              label:
                                  entry.status ==
                                      ProgramOperationOutboxStatus.needsReview
                                  ? context.l10n.programsOperationsReviewBadge
                                  : context.l10n.programsDoorQueued,
                              tone:
                                  entry.status ==
                                      ProgramOperationOutboxStatus.needsReview
                                  ? CatchBadgeTone.danger
                                  : CatchBadgeTone.warning,
                              icon: CatchIcons.offline,
                            ),
                          ],
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ),
          if (doorOpen)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsDoorWalkInTitle,
                subtitle: context.l10n.programsDoorWalkInSubtitle,
                child: CatchFieldLanes.divided(
                  children: [
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('door-walk-in-name'),
                      title: context.l10n.programsDoorWalkInNameLabel,
                      contract: CatchContractConstraints
                          .createProgramWalkInCallablePayloadDisplayName,
                      controller: walkInName,
                      textCapitalization: TextCapitalization.words,
                    ),
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('door-walk-in-party'),
                      title: context.l10n.programsDoorWalkInPartyLabel,
                      contract: CatchContractConstraints
                          .createProgramWalkInCallablePayloadPartySize,
                      controller: walkInPartySize,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    ),
                  ],
                ),
              ),
            ),
          if (doorOpen)
            CatchSectionListItem(
              child: CatchButton(
                label: context.l10n.programsDoorWalkInSubmit,
                leading: Icon(CatchIcons.addPerson),
                onPressed: operationsBusy ? null : onSubmitWalkIn,
              ),
            ),
          if (view.journal.isNotEmpty)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsDoorJournalTitle,
                subtitle: context.l10n.programsDoorJournalSubtitle,
                child: Column(
                  children: [
                    for (final entry in view.journal)
                      CatchFieldRow.standard(
                        leading: Icon(_journalIcon(entry.action)),
                        body: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CatchText(
                              _journalLine(context, entry),
                              variant: CatchTextVariant.bodyM,
                            ),
                            CatchMetaRow(
                              icon: CatchIcons.time,
                              label: AppTimeFormatters.time(entry.occurredAt),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _functionMeta(BuildContext context) {
    final fn = view.function;
    final parts = <String>[
      if (fn.venueName != null) fn.venueName!,
      AppTimeFormatters.dateTime(fn.startsAt),
      if (fn.dressCode != null) fn.dressCode!,
    ];
    return parts.join(' · ');
  }

  IconData _journalIcon(ProgramDoorAction action) => switch (action) {
    ProgramDoorAction.checkIn => CatchIcons.checkIn,
    ProgramDoorAction.undoCheckIn => CatchIcons.undo,
    ProgramDoorAction.markNoShow => CatchIcons.warning,
    ProgramDoorAction.walkInCreate => CatchIcons.addPerson,
    ProgramDoorAction.partySizeAdjust => CatchIcons.people,
  };

  String _journalLine(BuildContext context, ProgramDoorJournalEntry entry) {
    final name = entry.displayName ?? context.l10n.programsDoorJournalGuest;
    final action = switch (entry.action) {
      ProgramDoorAction.checkIn => context.l10n.programsDoorJournalCheckIn,
      ProgramDoorAction.undoCheckIn =>
        context.l10n.programsDoorJournalUndoCheckIn,
      ProgramDoorAction.markNoShow => context.l10n.programsDoorJournalNoShow,
      ProgramDoorAction.walkInCreate => context.l10n.programsDoorJournalWalkIn,
      ProgramDoorAction.partySizeAdjust =>
        context.l10n.programsDoorJournalPartySize,
    };
    final actor = entry.actorLabel;
    return actor == null ? '$name — $action' : '$name — $action ($actor)';
  }
}

class ProgramDoorGuestRow extends StatelessWidget {
  const ProgramDoorGuestRow({
    super.key,
    required this.guest,
    required this.doorOpen,
    required this.queuedStatus,
    required this.onAction,
  });

  final ProgramDoorGuest guest;
  final bool doorOpen;
  final ProgramOperationOutboxStatus? queuedStatus;
  final void Function(ProgramDoorRowAction action) onAction;

  @override
  Widget build(BuildContext context) {
    final queued = queuedStatus != null;
    return CatchFieldRow.standard(
      leading: Icon(
        guest.isCheckedIn
            ? CatchIcons.checkIn
            : guest.attendanceStatus == ProgramFunctionAttendanceStatus.noShow
            ? CatchIcons.warning
            : CatchIcons.unselected,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(guest.displayName, variant: CatchTextVariant.sectionTitle),
          CatchMetaRow(icon: CatchIcons.people, label: _meta(context)),
          gapH4,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s1,
            children: [
              ProgramDoorAttendanceBadge(status: guest.attendanceStatus),
              CatchBadge(label: _rsvpLabel(context)),
              if (!guest.invited)
                CatchBadge.functional(
                  label: context.l10n.programsDoorWalkInBadge,
                  tone: CatchBadgeTone.brand,
                ),
              if (queuedStatus != null)
                CatchBadge(
                  label:
                      queuedStatus == ProgramOperationOutboxStatus.needsReview
                      ? context.l10n.programsOperationsReviewBadge
                      : context.l10n.programsDoorQueued,
                  tone: queuedStatus == ProgramOperationOutboxStatus.needsReview
                      ? CatchBadgeTone.danger
                      : CatchBadgeTone.warning,
                  icon: CatchIcons.offline,
                ),
            ],
          ),
        ],
      ),
      trailing: CatchActionMenu<ProgramDoorRowAction>(
        tooltip: context.l10n.programsDoorRowActions,
        enabled: doorOpen && !queued,
        items: [
          if (guest.attendanceStatus !=
              ProgramFunctionAttendanceStatus.checkedIn)
            CatchActionMenuItem(
              value: ProgramDoorRowAction.checkIn,
              label: context.l10n.programsDoorCheckInAction,
            ),
          if (guest.attendanceStatus ==
              ProgramFunctionAttendanceStatus.checkedIn)
            CatchActionMenuItem(
              value: ProgramDoorRowAction.undoCheckIn,
              label: context.l10n.programsDoorUndoAction,
            ),
          if (guest.attendanceStatus ==
              ProgramFunctionAttendanceStatus.expected)
            CatchActionMenuItem(
              value: ProgramDoorRowAction.markNoShow,
              label: context.l10n.programsDoorNoShowAction,
            ),
          CatchActionMenuItem(
            value: ProgramDoorRowAction.partySize,
            label: context.l10n.programsDoorPartySizeAction,
          ),
        ],
        onSelected: onAction,
      ),
    );
  }

  String _meta(BuildContext context) {
    final parts = <String>[
      if (guest.householdLabel != null) guest.householdLabel!,
      if (guest.partySize != null)
        context.l10n.programsDoorPartyCount(count: guest.partySize!),
    ];
    return parts.join(' · ');
  }

  String _rsvpLabel(BuildContext context) => switch (guest.rsvpStatus) {
    ProgramRsvpStatus.attending => context.l10n.programsDoorRsvpAttending,
    ProgramRsvpStatus.declined => context.l10n.programsDoorRsvpDeclined,
    ProgramRsvpStatus.maybe => context.l10n.programsDoorRsvpMaybe,
    ProgramRsvpStatus.pending => context.l10n.programsDoorRsvpPending,
  };
}

class ProgramDoorAttendanceBadge extends StatelessWidget {
  const ProgramDoorAttendanceBadge({super.key, required this.status});

  final ProgramFunctionAttendanceStatus status;

  @override
  Widget build(BuildContext context) => switch (status) {
    ProgramFunctionAttendanceStatus.checkedIn => CatchBadge.functional(
      label: context.l10n.programsDoorAttendanceCheckedIn,
      tone: CatchBadgeTone.success,
    ),
    ProgramFunctionAttendanceStatus.noShow => CatchBadge.functional(
      label: context.l10n.programsDoorAttendanceNoShow,
      tone: CatchBadgeTone.danger,
    ),
    ProgramFunctionAttendanceStatus.expected => CatchBadge.functional(
      label: context.l10n.programsDoorAttendanceExpected,
      tone: CatchBadgeTone.brand,
    ),
  };
}

/// Numeric sheet for `partySizeAdjust`; the controller only enqueues when the
/// sheet returns a new value.
class ProgramDoorPartySizeSheet extends StatefulWidget {
  const ProgramDoorPartySizeSheet({super.key, required this.guest});

  final ProgramDoorGuest guest;

  @override
  State<ProgramDoorPartySizeSheet> createState() =>
      _ProgramDoorPartySizeSheetState();
}

class _ProgramDoorPartySizeSheetState extends State<ProgramDoorPartySizeSheet> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.guest.partySize?.toString() ?? '1',
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchFieldLanes.single(
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('door-party-size'),
            title: context.l10n.programsDoorPartySizeField,
            contract: CatchContractConstraints
                .recordProgramDoorJournalCallablePayloadOperationsItemsPartySize,
            controller: _controller,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            autofocus: true,
          ),
        ),
        CatchButton(
          label: context.l10n.programsDoorPartySizeSave,
          onPressed: () {
            final parsed = int.tryParse(_controller.text.trim());
            if (parsed == null || parsed < 1) return;
            Navigator.of(context).pop(parsed);
          },
        ),
      ],
    ),
  );
}
