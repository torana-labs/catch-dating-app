part of 'host_customers_screen.dart';

class HostCustomerControlSection extends StatelessWidget {
  const HostCustomerControlSection({
    super.key,
    required this.sort,
    required this.onSortChanged,
    required this.onOpenFilters,
    this.activeFilters,
    this.onClear,
    this.shrinkWrap = false,
    this.condensed = false,
  });

  final HostCustomerSort sort;
  final ValueChanged<HostCustomerSort> onSortChanged;
  final VoidCallback? onOpenFilters;
  final String? activeFilters;
  final VoidCallback? onClear;
  final bool shrinkWrap;
  final bool condensed;

  @override
  Widget build(BuildContext context) {
    return CatchSection.controls(
      sortKey: const ValueKey('host-customers-sort'),
      sortLabel: context.l10n.hostCustomersSortControl(
        label: _customerSortLabel(context, sort),
      ),
      onSort: () async {
        final selected = await showCatchSelectionSheet<HostCustomerSort>(
          context: context,
          title: context.l10n.hostCustomersSort,
          value: sort,
          items: [
            for (final option in HostCustomerSort.values)
              CatchSelectionMenuItem(
                value: option,
                label: _customerSortLabel(context, option),
              ),
          ],
        );
        if (selected != null) onSortChanged(selected);
      },
      filtersKey: const ValueKey('host-customers-filters'),
      filtersLabel: context.l10n.hostCustomersFilters,
      onFilters: onOpenFilters,
      activeFilters: activeFilters,
      clearLabel: activeFilters == null
          ? null
          : context.l10n.hostCustomersClearFilter,
      onClear: onClear,
    );
  }
}

class HostCustomerFilterSummarySection extends StatelessWidget {
  const HostCustomerFilterSummarySection({
    super.key,
    required this.filter,
    this.manualTag,
    this.selectionLabel,
    required this.count,
    required this.countCoverage,
    required this.campaignBlocker,
    required this.onMessage,
    required this.onReviewSenderSetup,
    this.onClear,
    this.trailing,
  });

  final HostCustomerFilter filter;
  final HostCustomerManualTag? manualTag;
  final String? selectionLabel;
  final int count;
  final HostCustomerMatchCountCoverage countCoverage;
  final String? campaignBlocker;
  final VoidCallback? onMessage;
  final VoidCallback? onReviewSenderSetup;
  final VoidCallback? onClear;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final countLabel = _customerPeopleCountLabel(context, count, countCoverage);
    final header = context.l10n.hostCustomersFilterSummary(
      label:
          selectionLabel ??
          manualTag?.label ??
          _customerFilterLabel(context, filter),
      countLabel: countLabel,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s1,
          children: [
            Text(header, style: CatchTextStyles.labelL(context)),
            if (onClear != null || trailing != null)
              Wrap(
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (onClear case final clear?)
                    CatchButton(
                      label: context.l10n.hostCustomersClearFilter,
                      variant: CatchButtonVariant.ghost,
                      size: CatchButtonSize.sm,
                      onPressed: clear,
                    ),
                  ?trailing,
                ],
              ),
          ],
        ),
        if (campaignBlocker != null ||
            onMessage != null ||
            onReviewSenderSetup != null) ...[
          gapH12,
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            children: [
              if (campaignBlocker case final String blocker)
                CatchText(
                  hostCampaignBlockerLabel(context, blocker),
                  variant: CatchTextVariant.supporting,
                  color: CatchTokens.of(context).warning,
                ),
              if (onMessage case final message?)
                CatchButton(
                  key: const ValueKey('host-customers-messaging-action'),
                  label: countCoverage == HostCustomerMatchCountCoverage.exact
                      ? context.l10n.hostCustomersMessageThese(count: count)
                      : context.l10n.hostCustomersMessageTheseAtLeast(
                          count: count,
                        ),
                  size: CatchButtonSize.sm,
                  onPressed: message,
                )
              else if (onReviewSenderSetup case final review?)
                CatchButton(
                  key: const ValueKey('host-customers-sender-setup-action'),
                  label: context.l10n.hostCustomersSetUpWhatsappBusiness,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  onPressed: review,
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Sliver-native directory. The page owns scrolling; the section builds only
/// visible people and preserves each contact's identity across filter changes.
class HostCustomersList extends StatelessWidget {
  const HostCustomersList({
    super.key,
    required this.state,
    required this.hasActiveQuery,
    required this.onCustomerSelected,
    required this.onLoadMore,
    required this.onRefreshCoverage,
    this.selectedContactId,
  });

  final HostCustomersDirectoryState state;
  final bool hasActiveQuery;
  final String? selectedContactId;
  final ValueChanged<HostCustomerDirectoryContact> onCustomerSelected;
  final VoidCallback? onLoadMore;
  final VoidCallback onRefreshCoverage;

  @override
  Widget build(BuildContext context) {
    final contacts = state.contacts;
    return SliverMainAxisGroup(
      slivers: [
        if (state.sourceCoverage != HostCustomerDirectoryCoverage.exact)
          CatchPageBody.sliver(
            child: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchBanner(
                    title: context.l10n.hostsHostAudienceCoveragePartial,
                    message: context.l10n.hostsHostAudienceCoveragePartialBody,
                    icon: CatchIcons.infoOutlineRounded,
                    tone: CatchBannerTone.warning,
                  ),
                  gapH8,
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: CatchButton(
                      key: const ValueKey('host-customers-refresh-coverage'),
                      label: context.l10n.hostCustomersCoverageRefresh,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.sm,
                      onPressed: onRefreshCoverage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (contacts.isEmpty)
          CatchSliverEmptyState(
            icon: CatchIcons.peopleOutlineRounded,
            title: hasActiveQuery
                ? context.l10n.hostCustomersNoResults
                : context.l10n.hostCustomersEmpty,
            message: hasActiveQuery ? null : context.l10n.hostCustomersIntro,
          )
        else
          CatchSection.sliverRows(
            key: const ValueKey('host-customers-directory-list'),
            itemCount: contacts.length,
            indexForKeyBuilder: (key) {
              final index = contacts.indexWhere(
                (contact) =>
                    key == ValueKey('host-customer-${contact.contactId}'),
              );
              return index < 0 ? null : index;
            },
            itemBuilder: (context, index) {
              final contact = contacts[index];
              return CatchField.navigate(
                key: ValueKey('host-customer-${contact.contactId}'),
                content: hostCustomerPersonLayout(context, contact),
                states: {
                  if (contact.contactId == selectedContactId)
                    WidgetState.selected,
                },
                onActivate: () => onCustomerSelected(contact),
              );
            },
          ),
        if (onLoadMore != null || state.loadMoreError != null)
          CatchPageBody.sliver(
            child: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (onLoadMore != null)
                    CatchButton(
                      label: context.l10n.hostCustomersLoadMore,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.sm,
                      status: state.loadingMore
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      onPressed: state.loadingMore ? null : onLoadMore,
                    ),
                  if (state.loadMoreError != null)
                    CatchLocalizedErrorState(
                      state.loadMoreError!,
                      context: AppErrorContext.club,
                      mode: CatchErrorStateMode.compact,
                      onRetry: onLoadMore,
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class HostCustomersSummarySection extends StatelessWidget {
  const HostCustomersSummarySection({
    super.key,
    required this.summary,
    required this.onRetry,
    required this.selectedFilter,
    required this.onFilterSelected,
    this.newCustomerCount,
  });

  final AsyncValue<HostCrmSummary> summary;
  final VoidCallback onRetry;
  final HostCustomerFilter? selectedFilter;
  final ValueChanged<HostCustomerFilter> onFilterSelected;
  final HostCustomerSegmentCount? newCustomerCount;

  @override
  Widget build(BuildContext context) {
    final value = catchAsyncStateFromAsyncValue(summary).value;
    String countLabel(int count) =>
        value?.truncated == true ? '$count+' : '$count';
    final newCount = newCustomerCount;
    final stats = <({HostCustomerFilter filter, String label, String? value})>[
      (
        filter: HostCustomerFilter.all,
        value: value == null ? '00' : countLabel(value.contactCount),
        label: context.l10n.hostsHostAudienceAll,
      ),
      (
        filter: HostCustomerFilter.repeat,
        value: value == null ? '00' : countLabel(value.repeatAttendeeCount),
        label: context.l10n.hostsOperationalRosterInsightReturning,
      ),
      (
        filter: HostCustomerFilter.newToOrganizer,
        value: newCount == null
            ? value == null
                  ? '00'
                  : null
            : '${newCount.count}${newCount.coverage == HostCustomerMatchCountCoverage.atLeast ? '+' : ''}',
        label: context.l10n.hostsHostEventManageScreenStateLabelNew,
      ),
    ];
    final control = CatchChoiceInput<HostCustomerFilter>.segmented(
      selected: selectedFilter,
      variant: CatchChoiceInputVariant.summary,
      contractExemption: 'Organizer directory lenses are local view state.',
      onChanged: onFilterSelected,
      options: [
        for (final stat in stats)
          CatchOption(
            value: stat.filter,
            label: stat.value == null
                ? stat.label
                : '${stat.label}  ${stat.value}',
          ),
      ],
    );
    return CatchAsyncBoundary<HostCrmSummary>(
      value: summary,
      onRetry: onRetry,
      initialLoadTimeout: null,
      loadingBuilder: (_) => CatchSkeleton.content(child: control),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.customers,
        mode: CatchErrorStateMode.compact,
        onRetry: onBoundaryRetry,
      ),
      builder: (context, _) => control,
    );
  }
}

String _customerFilterLabel(
  BuildContext context,
  HostCustomerFilter filter,
) => switch (filter) {
  HostCustomerFilter.all => context.l10n.hostsHostAudienceAll,
  HostCustomerFilter.newToOrganizer => context.l10n.hostsHostAudienceSegmentNew,
  HostCustomerFilter.attended => context.l10n.hostsHostAudienceAttended,
  HostCustomerFilter.firstTime =>
    context.l10n.hostsHostAudienceSegmentFirstTime,
  HostCustomerFilter.repeat => context.l10n.hostsHostAudienceSegmentRepeat,
  HostCustomerFilter.regular => context.l10n.hostsHostAudienceSegmentRegular,
  HostCustomerFilter.atRisk => context.l10n.hostCustomersFilterAtRisk,
  HostCustomerFilter.reliable => context.l10n.hostsHostAudienceSegmentReliable,
  HostCustomerFilter.needsConfirmation =>
    context.l10n.hostsHostAudienceSegmentNeedsConfirmation,
  HostCustomerFilter.advocate => context.l10n.hostsHostAudienceSegmentAdvocate,
  HostCustomerFilter.highImpactAdvocate =>
    context.l10n.hostsHostAudienceSegmentHighImpact,
  HostCustomerFilter.whatsappReachable =>
    context.l10n.hostsHostAudienceSegmentWhatsapp,
  HostCustomerFilter.smsReachable => context.l10n.hostsHostAudienceSegmentSms,
};

String _customerSortLabel(BuildContext context, HostCustomerSort sort) =>
    switch (sort) {
      HostCustomerSort.lastSeen => context.l10n.hostCustomersSortLastSeen,
      HostCustomerSort.mostAttended =>
        context.l10n.hostCustomersSortMostAttended,
      HostCustomerSort.name => context.l10n.hostCustomersSortName,
    };

String _customerFilterGroupLabel(
  BuildContext context,
  HostCustomerFilterGroup group,
) => switch (group) {
  HostCustomerFilterGroup.attendance =>
    context.l10n.hostCustomersFilterGroupAttendance,
  HostCustomerFilterGroup.reliability =>
    context.l10n.hostCustomersFilterGroupReliability,
  HostCustomerFilterGroup.advocacy =>
    context.l10n.hostCustomersFilterGroupAdvocacy,
  HostCustomerFilterGroup.reachable =>
    context.l10n.hostCustomersFilterGroupReachable,
};

String _customerPeopleCountLabel(
  BuildContext context,
  int count,
  HostCustomerMatchCountCoverage coverage,
) => switch (coverage) {
  HostCustomerMatchCountCoverage.exact => context.l10n.hostCustomersPeopleCount(
    count: count,
  ),
  HostCustomerMatchCountCoverage.atLeast =>
    context.l10n.hostCustomersPeopleCountAtLeast(count: count),
};

List<CatchActionMenuItem<HostAudienceMenuAction>> _hostCustomersHeaderActions(
  BuildContext context, {
  required bool includeExport,
  required bool exportEnabled,
  String? exportSublabel,
}) => [
  CatchActionMenuItem(
    value: HostAudienceMenuAction.reviewDuplicates,
    label: context.l10n.hostCustomersReviewDuplicates,
    icon: CatchIcons.peopleOutlineRounded,
  ),
  if (includeExport)
    CatchActionMenuItem(
      value: HostAudienceMenuAction.export,
      label: context.l10n.hostsHostAudienceExport,
      sublabel: exportSublabel,
      icon: CatchIcons.downloadRounded,
      enabled: exportEnabled,
    ),
];
