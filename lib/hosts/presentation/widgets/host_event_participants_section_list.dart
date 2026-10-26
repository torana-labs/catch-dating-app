part of 'host_event_participants_section.dart';

typedef _HostParticipantRosterRowData = ({
  String person,
  String? imageUrl,
  String? meta,
  String? signal,
  CatchBadgeTone tone,
  ParticipantAction action,
});

class HostEventParticipantsSectionList extends StatefulWidget {
  const HostEventParticipantsSectionList({
    super.key,
    required this.viewModel,
    required this.mode,
    required this.scrollable,
    required this.showSummaryHeader,
    required this.initialSearchQuery,
    required this.profileLookupState,
    required this.mutationState,
    required this.actions,
    required this.onRetryProfiles,
  });

  final AttendanceSheetViewModel viewModel;
  final HostEventParticipantsMode mode;
  final bool scrollable;
  final bool showSummaryHeader;
  final String initialSearchQuery;
  final HostParticipantProfilesLookupState profileLookupState;
  final HostParticipantsMutationDisplayState mutationState;
  final HostParticipantLifecycleActions actions;
  final VoidCallback onRetryProfiles;

  @override
  State<HostEventParticipantsSectionList> createState() =>
      _HostEventParticipantsSectionListState();
}

class _HostEventParticipantsSectionListState
    extends State<HostEventParticipantsSectionList> {
  late var _searchQuery = widget.initialSearchQuery;
  var _selectedFilter = HostRosterFilter.all;

  @override
  void didUpdateWidget(covariant HostEventParticipantsSectionList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) {
      _selectedFilter = HostRosterFilter.all;
    }
    if (oldWidget.initialSearchQuery != widget.initialSearchQuery) {
      _searchQuery = widget.initialSearchQuery;
    }
  }

  @override
  Widget build(BuildContext context) {
    final mutationState = widget.mutationState;
    final usesRequestApproval = widget
        .viewModel
        .event
        .effectiveEventPolicy
        .admissionPolicy
        .manualApprovalRequired;
    final profileLookupState = widget.profileLookupState;
    final rows = switch (profileLookupState.status) {
      HostParticipantProfilesLookupStatus.ready =>
        HostParticipationLifecycleSection(
          viewModel: widget.viewModel,
          mode: widget.mode,
          profiles: profileLookupState.profiles,
          scrollable: widget.scrollable,
          showHeader: widget.showSummaryHeader,
          usesRequestApproval: usesRequestApproval,
          mutationState: mutationState,
          actions: widget.actions,
          searchQuery: _searchQuery,
          selectedFilter: _selectedFilter,
          onSearchChanged: (value) => setState(() => _searchQuery = value),
          onFilterChanged: (value) => setState(() => _selectedFilter = value),
        ),
      HostParticipantProfilesLookupStatus.loading =>
        const CatchLoadingIndicator(),
      HostParticipantProfilesLookupStatus.error => Padding(
        padding: CatchInsets.content,
        child: CatchLocalizedErrorState(
          profileLookupState.error!,
          context: AppErrorContext.event,
          onRetry: widget.onRetryProfiles,
          mode: CatchErrorStateMode.inline,
        ),
      ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (mutationState.participantActionError != null)
          CatchLocalizedErrorBanner(
            mutationState.participantActionError!,
            context: AppErrorContext.event,
          ),
        if (widget.scrollable) Expanded(child: rows) else rows,
      ],
    );
  }
}

class HostParticipationLifecycleSection extends StatelessWidget {
  const HostParticipationLifecycleSection({
    super.key,
    required this.viewModel,
    required this.mode,
    required this.profiles,
    required this.scrollable,
    required this.showHeader,
    required this.usesRequestApproval,
    required this.mutationState,
    required this.actions,
    required this.searchQuery,
    required this.selectedFilter,
    required this.onSearchChanged,
    required this.onFilterChanged,
  });

  final AttendanceSheetViewModel viewModel;
  final HostEventParticipantsMode mode;
  final Map<String, (String, String?)> profiles;
  final bool scrollable;
  final bool showHeader;
  final bool usesRequestApproval;
  final HostParticipantsMutationDisplayState mutationState;
  final HostParticipantLifecycleActions actions;
  final String searchQuery;
  final HostRosterFilter selectedFilter;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<HostRosterFilter> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    late final Widget section;
    switch (mode) {
      case HostEventParticipantsMode.setup:
        final rosterState = HostRosterDisplayState.setup(
          l10n: context.l10n,
          usesRequestApproval: usesRequestApproval,
          attendeeIds: viewModel.attendeeIds,
          waitlistedIds: viewModel.waitlistedIds,
          totalCount: viewModel.totalCount,
          capacityLimit: viewModel.event.capacityLimit,
          waitlistCount: viewModel.waitlistCount,
          participationsByUid: viewModel.participationsByUid,
          profiles: profiles,
          searchQuery: searchQuery,
          selectedFilter: selectedFilter,
        );
        section = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showHeader) ...[
              HostRosterFilterHeader(
                title: context
                    .l10n
                    .hostsHostEventAttendancePanelTitleParticipation,
                subtitle: usesRequestApproval
                    ? context
                          .l10n
                          .hostsHostEventAttendancePanelSubtitleReviewProfilesAndApprove
                    : context
                          .l10n
                          .hostsHostEventAttendancePanelSubtitleReviewBookingStatusBefore,
                filters: rosterState.filters,
                selectedFilter: rosterState.activeFilter,
                onFilterChanged: onFilterChanged,
              ),
              gapH12,
            ],
            if (rosterState.showBulkOfferAction) ...[
              HostWaitlistBulkOfferNotice(
                count: rosterState.bulkOfferCount,
                candidateCount: rosterState.offerableWaitlistIds.length,
                isPending: mutationState.waitlistOfferPending,
                onOffer: () =>
                    actions.createWaitlistOffers(rosterState.bulkOfferIds),
              ),
              gapH12,
            ],
            HostRosterSearchField(
              value: searchQuery,
              label:
                  context.l10n.hostsHostEventAttendancePanelLabelSearchPeople,
              onChanged: onSearchChanged,
            ),
            gapH14,
            ParticipantTable(
              columns: [
                context.l10n.hostsHostEventAttendancePanelVisiblecopyGuest,
                context.l10n.hostsHostEventAttendancePanelVisiblecopySignal,
                context.l10n.hostsHostEventAttendancePanelVisiblecopyHostAction,
              ],
              showEmpty: rosterState.rowIds.isEmpty,
              emptyTitle: rosterState.emptyTitle,
              emptyMessage: rosterState.emptyMessage,
              rows: [
                for (final uid in rosterState.rowIds)
                  for (final row in [
                    _setupRowData(
                      context,
                      uid,
                      usesRequestApproval: usesRequestApproval,
                      requestActionPending: mutationState
                          .isRequestActionPending(uid),
                      offerActionPending: mutationState.isWaitlistOfferPending(
                        uid,
                      ),
                    ),
                  ])
                    ParticipantRow(
                      person: row.person,
                      imageUrl: row.imageUrl,
                      meta: row.meta,
                      signal: row.signal,
                      tone: row.tone,
                      action: row.action,
                    ),
              ],
            ),
          ],
        );
      case HostEventParticipantsMode.live:
        final rosterState = HostRosterDisplayState.live(
          l10n: context.l10n,
          usesRequestApproval: usesRequestApproval,
          attendeeIds: viewModel.attendeeIds,
          attendedIds: viewModel.attendedIds,
          waitlistedIds: viewModel.waitlistedIds,
          totalCount: viewModel.totalCount,
          capacityLimit: viewModel.event.capacityLimit,
          participationsByUid: viewModel.participationsByUid,
          profiles: profiles,
          searchQuery: searchQuery,
          selectedFilter: selectedFilter,
        );
        section = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSection.fieldRows(
              first: true,
              children: [
                CatchField.control(
                  copy: catchFieldCopy(context.l10n),
                  title:
                      context.l10n.hostsHostEventAttendancePanelTitleCheckInQr,
                  contractExemption:
                      'Disclosure-only QR presentation; no editable value is '
                      'submitted or persisted.',
                  body: context.l10n.hostsHostEventAttendancePanelBodyCheckInQr,
                  icon: CatchIcons.qrCode,
                  child: HostEventCheckInQrSection(event: viewModel.event),
                ),
              ],
            ),
            gapH12,
            HostRosterFilterHeader(
              title: showHeader
                  ? context.l10n.hostsHostEventAttendancePanelTitleCheckInBoard
                  : null,
              subtitle: showHeader
                  ? context
                        .l10n
                        .hostsHostEventAttendancePanelSubtitleUseTheStatusTiles
                  : null,
              filters: rosterState.filters,
              selectedFilter: rosterState.activeFilter,
              onFilterChanged: onFilterChanged,
            ),
            gapH12,
            if (rosterState.showBulkOfferAction) ...[
              HostWaitlistBulkOfferNotice(
                count: rosterState.bulkOfferCount,
                candidateCount: rosterState.offerableWaitlistIds.length,
                isPending: mutationState.waitlistOfferPending,
                onOffer: () =>
                    actions.createWaitlistOffers(rosterState.bulkOfferIds),
              ),
              gapH12,
            ],
            HostRosterSearchField(
              value: searchQuery,
              label:
                  context.l10n.hostsHostEventAttendancePanelLabelSearchRoster,
              onChanged: onSearchChanged,
            ),
            gapH14,
            ParticipantTable(
              columns: [
                context.l10n.hostsHostEventAttendancePanelVisiblecopyGuest,
                context.l10n.hostsHostEventAttendancePanelVisiblecopyStatus,
                context.l10n.hostsHostEventAttendancePanelVisiblecopyHostAction,
              ],
              showEmpty: rosterState.rowIds.isEmpty,
              emptyTitle: rosterState.emptyTitle,
              emptyMessage: rosterState.emptyMessage,
              rows: [
                for (final uid in rosterState.rowIds)
                  for (final row in [
                    _liveRowData(
                      context,
                      uid,
                      usesRequestApproval: usesRequestApproval,
                      attendanceActionPending: mutationState
                          .isAttendanceActionPending(uid),
                      offerActionPending: mutationState.isWaitlistOfferPending(
                        uid,
                      ),
                    ),
                  ])
                    ParticipantRow(
                      person: row.person,
                      imageUrl: row.imageUrl,
                      meta: row.meta,
                      signal: row.signal,
                      tone: row.tone,
                      action: row.action,
                    ),
              ],
            ),
          ],
        );
      case HostEventParticipantsMode.report:
        final reportSummary = HostReportSummaryDisplayState.resolve(
          totalCount: viewModel.totalCount,
          checkedInCount: viewModel.checkedInCount,
          waitlistCount: viewModel.waitlistCount,
          priceInPaise: viewModel.event.priceInPaise,
          currencyCode: viewModel.event.currency,
        );
        final rosterState = HostRosterDisplayState.report(
          l10n: context.l10n,
          attendeeIds: viewModel.attendeeIds,
          attendedIds: viewModel.attendedIds,
          waitlistedIds: viewModel.waitlistedIds,
          totalCount: viewModel.totalCount,
          waitlistCount: viewModel.waitlistCount,
          profiles: profiles,
          searchQuery: searchQuery,
          selectedFilter: selectedFilter,
        );
        final hasParticipants =
            viewModel.totalCount > 0 || viewModel.waitlistCount > 0;
        section = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showHeader) ...[
              HostRosterFilterHeader(
                title:
                    context.l10n.hostsHostEventAttendancePanelTitleEventReport,
                subtitle: context
                    .l10n
                    .hostsHostEventAttendancePanelSubtitleAttendancePayoutAndExport,
                filters: rosterState.filters,
                selectedFilter: rosterState.activeFilter,
                onFilterChanged: onFilterChanged,
                trailing:
                    hasParticipants &&
                        !mutationState.opsReportExportPending &&
                        !mutationState.revenueReportExportPending
                    ? CatchActionMenu<_HostReportExportAction>(
                        tooltip: context
                            .l10n
                            .hostsHostEventAttendancePanelLabelExport,
                        icon: CatchIcons.share,
                        items: [
                          CatchActionMenuItem(
                            value: _HostReportExportAction.ops,
                            label: context
                                .l10n
                                .hostsHostEventAttendancePanelLabelOpsCsv,
                            icon: CatchIcons.list,
                          ),
                          CatchActionMenuItem(
                            value: _HostReportExportAction.revenue,
                            label: context
                                .l10n
                                .hostsHostEventAttendancePanelLabelRevenueCsv,
                            icon: CatchIcons.payment,
                          ),
                        ],
                        onSelected: (action) {
                          switch (action) {
                            case _HostReportExportAction.ops:
                              unawaited(actions.shareOpsReport());
                            case _HostReportExportAction.revenue:
                              unawaited(actions.shareRevenueReport());
                          }
                        },
                      )
                    : null,
              ),
              gapH12,
            ],
            if (!hasParticipants)
              CatchEmptyState(
                icon: CatchIcons.people,
                title: rosterState.emptyTitle,
                message: rosterState.emptyMessage,
                variant: CatchEmptyStateVariant.inline,
                surface: true,
                padding: CatchInsets.content,
              )
            else ...[
              HostRosterSearchField(
                value: searchQuery,
                label:
                    context.l10n.hostsHostEventAttendancePanelLabelSearchRoster,
                onChanged: onSearchChanged,
              ),
              gapH14,
              ParticipantTable(
                columns: [
                  context.l10n.hostsHostEventAttendancePanelVisiblecopyName,
                  context
                      .l10n
                      .hostsHostEventAttendancePanelVisiblecopyAttendance,
                  context.l10n.hostsHostEventAttendancePanelVisiblecopyPayment,
                ],
                showEmpty: rosterState.rowIds.isEmpty,
                emptyTitle: rosterState.emptyTitle,
                emptyMessage: rosterState.emptyMessage,
                rows: [
                  for (final uid in rosterState.rowIds)
                    for (final row in [_reportRowData(context, uid)])
                      ParticipantRow(
                        person: row.person,
                        imageUrl: row.imageUrl,
                        meta: row.meta,
                        signal: row.signal,
                        tone: row.tone,
                        action: row.action,
                      ),
                ],
              ),
              gapH12,
              CatchFieldLanes.single(
                child: CatchField.content(
                  copy: catchFieldCopy(context.l10n),
                  title: context
                      .l10n
                      .hostsHostEventAttendancePanelTitleEventReport,
                  body: reportSummary.summary(context.l10n),
                  icon: CatchIcons.receipt,
                ),
              ),
              if (mutationState.reportExportError != null) ...[
                gapH12,
                CatchLocalizedErrorBanner(
                  mutationState.reportExportError!,
                  context: AppErrorContext.event,
                ),
              ],
            ],
          ],
        );
    }

    return ListView(
      shrinkWrap: !scrollable,
      primary: scrollable ? null : false,
      physics: scrollable
          ? const AlwaysScrollableScrollPhysics()
          : const NeverScrollableScrollPhysics(),
      padding: scrollable ? CatchInsets.scrollEnd : EdgeInsets.zero,
      children: [section],
    );
  }

  _HostParticipantRosterRowData _setupRowData(
    BuildContext context,
    String uid, {
    required bool usesRequestApproval,
    required bool requestActionPending,
    required bool offerActionPending,
  }) {
    final participation = viewModel.participationFor(uid);
    final rowState = HostSetupRosterRowDisplayState.resolve(
      l10n: context.l10n,
      participation: participation,
      usesRequestApproval: usesRequestApproval,
    );
    final ParticipantAction action;
    if (rowState.showRequestActions) {
      action = ParticipantDecideAction(
        onProfile: () => actions.openProfile(uid),
        onApprove: requestActionPending
            ? null
            : () => actions.approveJoinRequest(uid),
        onDecline: requestActionPending
            ? null
            : () => actions.declineJoinRequest(uid),
      );
    } else if (rowState.showWaitlistOfferAction) {
      action = _waitlistOfferAction(
        context,
        uid,
        participation,
        offerActionPending: offerActionPending,
      );
    } else {
      action = _profileAction(context, uid);
    }
    return (
      person: _nameFor(uid),
      imageUrl: _photoFor(uid),
      meta: rowState.meta,
      signal: rowState.signal,
      tone: rowState.tone,
      action: action,
    );
  }

  _HostParticipantRosterRowData _liveRowData(
    BuildContext context,
    String uid, {
    required bool usesRequestApproval,
    required bool attendanceActionPending,
    required bool offerActionPending,
  }) {
    final participation = viewModel.participationFor(uid);
    final attended = viewModel.attendedIds.contains(uid);
    final rowState = HostLiveRosterRowDisplayState.resolve(
      l10n: context.l10n,
      participation: participation,
      attended: attended,
      usesRequestApproval: usesRequestApproval,
    );
    final ParticipantAction action;
    if (rowState.showAttendanceToggle) {
      action = ParticipantButtonAction(
        buttonKey: HostEventActionKeys.attendeeCheckInButton(uid),
        label: rowState.attendanceButtonLabel,
        primary: rowState.attendanceButtonPrimary,
        onPressed: attendanceActionPending
            ? null
            : () => actions.toggleAttendance(uid),
        disabled: attendanceActionPending,
      );
    } else if (rowState.showWaitlistOfferAction) {
      action = _waitlistOfferAction(
        context,
        uid,
        participation,
        offerActionPending: offerActionPending,
      );
    } else {
      action = _profileAction(context, uid);
    }
    return (
      person: _nameFor(uid),
      imageUrl: _photoFor(uid),
      meta: rowState.meta,
      signal: rowState.signal,
      tone: rowState.tone,
      action: action,
    );
  }

  _HostParticipantRosterRowData _reportRowData(
    BuildContext context,
    String uid,
  ) {
    final participation = viewModel.participationFor(uid);
    final attended = viewModel.attendedIds.contains(uid);
    final rowState = HostReportRosterRowDisplayState.resolve(
      l10n: context.l10n,
      participation: participation,
      attended: attended,
      priceInPaise: viewModel.event.priceInPaise,
      currencyCode: viewModel.event.currency,
    );
    return (
      person: _nameFor(uid),
      imageUrl: _photoFor(uid),
      meta: rowState.meta,
      signal: rowState.signal,
      tone: rowState.tone,
      action: ParticipantTextAction(rowState.payment),
    );
  }

  String _nameFor(String uid) => profiles[uid]?.$1 ?? 'Runner';

  String? _photoFor(String uid) => profiles[uid]?.$2;

  /// Shared waitlist action — a settled offer reads as an outcome [CatchBadge],
  /// otherwise an "Offer" button (disabled while a send is in flight).
  ParticipantAction _waitlistOfferAction(
    BuildContext context,
    String uid,
    EventParticipation? participation, {
    required bool offerActionPending,
  }) {
    final offerStatus = participation?.waitlistOfferStatus;
    if (offerStatus == EventWaitlistOfferStatus.active ||
        offerStatus == EventWaitlistOfferStatus.accepted) {
      final accepted = offerStatus == EventWaitlistOfferStatus.accepted;
      return ParticipantBadgeAction(
        label: accepted
            ? context.l10n.hostsHostEventAttendancePanelLabelAccepted
            : context.l10n.hostsHostEventAttendancePanelLabelOffered,
        tone: accepted ? CatchBadgeTone.success : CatchBadgeTone.brand,
      );
    }
    return ParticipantButtonAction(
      label: context.l10n.hostsHostEventAttendancePanelLabelOffer,
      onPressed: offerActionPending
          ? null
          : () => actions.createWaitlistOffer(uid),
      disabled: offerActionPending,
    );
  }

  ParticipantAction _profileAction(BuildContext context, String uid) {
    return ParticipantButtonAction(
      label: context.l10n.hostsHostEventAttendancePanelLabelProfile,
      onPressed: () => actions.openProfile(uid),
    );
  }
}

enum _HostReportExportAction { ops, revenue }

Object? _mutationError(MutationState<dynamic> mutation) {
  if (!mutation.hasError) return null;
  return (mutation as MutationError).error;
}
