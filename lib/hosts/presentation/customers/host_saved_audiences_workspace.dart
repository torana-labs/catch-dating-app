part of 'host_customers_screen.dart';

enum _HostSavedAudienceMembership { all, automatic, manual }

class HostSavedAudiencesWorkspace extends ConsumerWidget
    implements CatchRootScreenPageOwner {
  const HostSavedAudiencesWorkspace({
    super.key,
    required this.organizerId,
    required this.query,
    required this.onOpen,
  });

  final String organizerId;
  final String? query;
  final ValueChanged<HostSavedAudience> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CatchRootScreenPageScrollView.sections(
        scrollKey: const PageStorageKey<String>('host-customers-audiences'),
        onRefresh: () async {
          ref.invalidate(hostSavedAudiencesProvider(organizerId));
          ref.invalidate(hostAllSavedAudienceSummariesProvider(organizerId));
          ref.invalidate(hostGroupDirectoryControllerProvider);
        },
        children: [
          HostSavedAudiencesList(
            organizerId: organizerId,
            query: query,
            onOpen: onOpen,
          ),
        ],
      );
}

class HostSavedAudiencesList extends ConsumerStatefulWidget {
  const HostSavedAudiencesList({
    super.key,
    required this.organizerId,
    required this.query,
    required this.onOpen,
  });

  final String organizerId;
  final String? query;
  final ValueChanged<HostSavedAudience> onOpen;

  @override
  ConsumerState<HostSavedAudiencesList> createState() =>
      _HostSavedAudiencesListState();
}

class _HostSavedAudiencesListState
    extends ConsumerState<HostSavedAudiencesList> {
  _HostSavedAudienceMembership _membership = _HostSavedAudienceMembership.all;
  bool _byName = true;
  int _openGeneration = 0;
  HostGroupDirectoryControllerProvider get _directoryProvider =>
      hostGroupDirectoryControllerProvider(
        organizerId,
        byName: _byName,
        isStatic: switch (_membership) {
          _HostSavedAudienceMembership.manual => true,
          _HostSavedAudienceMembership.automatic => false,
          _HostSavedAudienceMembership.all => null,
        },
      );

  @override
  void didUpdateWidget(covariant HostSavedAudiencesList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != widget.organizerId ||
        oldWidget.query != widget.query) {
      ++_openGeneration;
    }
  }

  @override
  void dispose() {
    ++_openGeneration;
    super.dispose();
  }

  String get organizerId => widget.organizerId;
  String? get query => widget.query;
  ValueChanged<HostSavedAudience> get onOpen => widget.onOpen;

  @override
  Widget build(BuildContext context) {
    final searching = query?.trim().isNotEmpty ?? false;
    final directory = searching ? null : ref.watch(_directoryProvider);
    final continuation = directory == null
        ? null
        : catchAsyncStateFromAsyncValue(directory).value;
    final audiences = searching
        ? ref.watch(hostAllSavedAudienceSummariesProvider(organizerId))
        : directory!.whenData((state) => state.page);
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: CatchSection.controls(
            sortLabel: context.l10n.hostCustomersSortControl(
              label: _byName
                  ? context.l10n.hostCustomersSortName
                  : context.l10n.hostAudienceRecentlyChecked,
            ),
            onSort: _chooseSort,
            filtersLabel: context.l10n.hostCustomersFilters,
            onFilters: _chooseMembership,
            activeFilters: _membership == _HostSavedAudienceMembership.all
                ? null
                : _membership == _HostSavedAudienceMembership.manual
                ? context.l10n.hostAudienceManualGroup
                : context.l10n.hostAudienceAutomaticGroup,
            clearLabel: _membership == _HostSavedAudienceMembership.all
                ? null
                : context.l10n.hostCustomersClearFilter,
            onClear: _membership == _HostSavedAudienceMembership.all
                ? null
                : () => setState(
                    () => _membership = _HostSavedAudienceMembership.all,
                  ),
          ),
        ),
        CatchAsyncBoundary<HostSavedAudienceSummaryPage>.sliver(
          value: audiences,
          onRetry: () {
            if (searching) {
              ref.invalidate(
                hostAllSavedAudienceSummariesProvider(organizerId),
              );
            } else {
              ref.invalidate(_directoryProvider);
            }
          },
          initialLoadTimeout: null,
          loadingBuilder: (_) => CatchSection.sliverLoadingRows(
            itemCount: 4,
            layoutBuilder: (_, _) => CatchRecordLayout.placeholder(
              icon: CatchIcons.groupsOutlined,
              hasMetadata: true,
              factCount: 1,
            ),
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              CatchLocalizedSliverErrorState(
                error,
                context: AppErrorContext.customers,
                fillRemaining: false,
                onRetry: onBoundaryRetry,
              ),
          builder: (context, page) {
            final visible =
                _matchingSavedAudiences(page.audiences, query)
                    .where(
                      (audience) => switch (_membership) {
                        _HostSavedAudienceMembership.automatic =>
                          !audience.isStatic,
                        _HostSavedAudienceMembership.manual =>
                          audience.isStatic,
                        _HostSavedAudienceMembership.all => true,
                      },
                    )
                    .toList()
                  ..sort(
                    (a, b) => _byName
                        ? a.name.toLowerCase().compareTo(b.name.toLowerCase())
                        : (b.lastPreviewAt ?? DateTime(0)).compareTo(
                            a.lastPreviewAt ?? DateTime(0),
                          ),
                  );
            return SliverMainAxisGroup(
              slivers: [
                CatchSection.sliverRows(
                  key: const ValueKey('host-saved-audiences-directory'),
                  itemCount: visible.length,
                  indexForKeyBuilder: (key) {
                    final index = visible.indexWhere(
                      (audience) =>
                          key ==
                          ValueKey(
                            'host-saved-audience-${audience.audienceId}',
                          ),
                    );
                    return index < 0 ? null : index;
                  },
                  itemBuilder: (context, index) {
                    final audience = visible[index];
                    return CatchField.navigate(
                      key: ValueKey(
                        'host-saved-audience-${audience.audienceId}',
                      ),
                      content: CatchRecordLayout(
                        title: audience.name,
                        facts: [
                          _savedAudienceSummaryDirectoryBody(context, audience),
                        ],
                        icon: CatchIcons.groupsOutlined,
                        metadata: audience.isStatic
                            ? context.l10n.hostAudienceManualGroup
                            : context.l10n.hostAudienceAutomaticGroup,
                      ),
                      onActivate: () => _openSummary(audience),
                    );
                  },
                ),
                if (continuation != null &&
                    (continuation.page.nextCursor != null ||
                        continuation.loadMoreError != null))
                  CatchPageBody.sliver(
                    child: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          CatchButton(
                            label: context.l10n.hostCustomersLoadMore,
                            variant: CatchButtonVariant.secondary,
                            size: CatchButtonSize.md,
                            status: continuation.loadingMore
                                ? CatchButtonStatus.loading
                                : CatchButtonStatus.idle,
                            onPressed: continuation.loadingMore
                                ? null
                                : () => ref
                                      .read(_directoryProvider.notifier)
                                      .loadMore(),
                          ),
                          if (continuation.loadMoreError != null)
                            CatchLocalizedErrorState(
                              continuation.loadMoreError!,
                              context: AppErrorContext.customer,
                              mode: CatchErrorStateMode.compact,
                              onRetry: () => ref
                                  .read(_directoryProvider.notifier)
                                  .loadMore(),
                            ),
                        ],
                      ),
                    ),
                  ),
                if (visible.isEmpty)
                  SliverToBoxAdapter(
                    child: CatchEmptyState(
                      icon: CatchIcons.groupsOutlined,
                      title:
                          query == null &&
                              _membership == _HostSavedAudienceMembership.all
                          ? context.l10n.hostSavedAudiencesEmptyTitle
                          : context.l10n.hostSavedAudiencesSearchEmptyTitle,
                      message:
                          query == null &&
                              _membership == _HostSavedAudienceMembership.all
                          ? context.l10n.hostSavedAudiencesEmptyBody
                          : context.l10n.hostSavedAudiencesSearchEmptyBody,
                      variant: CatchEmptyStateVariant.inline,
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _openSummary(HostSavedAudienceSummary summary) async {
    final owner = organizerId;
    final generation = ++_openGeneration;
    bool isCurrent() =>
        mounted && organizerId == owner && generation == _openGeneration;
    try {
      final audience = await ref.read(
        hostSavedAudienceDetailProvider(owner, summary.audienceId).future,
      );
      if (isCurrent()) onOpen(audience);
    } on Object catch (error) {
      if (mounted && isCurrent()) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    }
  }

  Future<void> _chooseSort() async {
    final selected = await showCatchSelectionSheet<bool>(
      context: context,
      title: context.l10n.hostCustomersSort,
      value: _byName,
      items: [
        CatchSelectionMenuItem(
          value: true,
          label: context.l10n.hostCustomersSortName,
        ),
        CatchSelectionMenuItem(
          value: false,
          label: context.l10n.hostAudienceRecentlyChecked,
        ),
      ],
    );
    if (selected != null && mounted) setState(() => _byName = selected);
  }

  Future<void> _chooseMembership() async {
    final selected =
        await showCatchSelectionSheet<_HostSavedAudienceMembership>(
          context: context,
          title: context.l10n.hostAudienceMembershipMode,
          value: _membership,
          items: [
            CatchSelectionMenuItem(
              value: _HostSavedAudienceMembership.all,
              label: context.l10n.hostAudienceAllGroups,
            ),
            CatchSelectionMenuItem(
              value: _HostSavedAudienceMembership.automatic,
              label: context.l10n.hostAudienceAutomaticGroup,
            ),
            CatchSelectionMenuItem(
              value: _HostSavedAudienceMembership.manual,
              label: context.l10n.hostAudienceManualGroup,
            ),
          ],
        );
    if (selected != null && mounted) setState(() => _membership = selected);
  }
}

List<HostSavedAudienceSummary> _matchingSavedAudiences(
  List<HostSavedAudienceSummary> audiences,
  String? query,
) {
  final normalized = query?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return audiences;
  return audiences
      .where((audience) => audience.name.toLowerCase().contains(normalized))
      .toList(growable: false);
}

String _savedAudienceDirectoryBody(
  BuildContext context,
  HostSavedAudience audience,
) => _savedAudienceSummaryDirectoryBody(
  context,
  HostSavedAudienceSummary.fromAudience(audience),
);

String _savedAudienceSummaryDirectoryBody(
  BuildContext context,
  HostSavedAudienceSummary audience,
) {
  final count = audience.lastPreviewMatchCount;
  final countLabel = count == null
      ? context.l10n.hostSavedAudienceNeverPreviewed
      : context.l10n.hostSavedAudiencePeopleCount(count: count);
  final checked = audience.lastPreviewAt;
  return checked == null
      ? countLabel
      : '$countLabel · ${context.l10n.hostAudienceGroupChecked(date: DateFormat.MMMd().format(checked))}';
}
