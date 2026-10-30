import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_contact_merge_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_route_arguments.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_row.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_saved_audience_members_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

part 'host_audience_source_rule_section.dart';
part 'host_customer_detail_card.dart';
part 'host_customer_editor.dart';
part 'host_customer_filter_sheet.dart';
part 'host_customers_directory_actions.dart';
part 'host_customers_list.dart';
part 'host_save_audience_sheet.dart';
part 'host_saved_audience_editor.dart';
part 'host_saved_audience_rule_draft.dart';
part 'host_saved_audience_section.dart';
part 'host_saved_audiences_workspace.dart';
part 'host_static_audience_members_editor.dart';

class HostCustomersScreen extends ConsumerStatefulWidget {
  const HostCustomersScreen({
    super.key,
    this.initialOrganizerId,
    this.initialContactId,
    this.initialContactDisplayName,
    this.initialView = HostAudienceView.people,
  }) : assert(
         initialView == HostAudienceView.people ||
             initialView == HostAudienceView.audiences,
       );

  final String? initialOrganizerId;
  final String? initialContactId;
  final String? initialContactDisplayName;
  final HostAudienceView initialView;

  @override
  ConsumerState<HostCustomersScreen> createState() =>
      _HostCustomersScreenState();
}

class _HostCustomersScreenState extends ConsumerState<HostCustomersScreen> {
  Timer? _searchDebounce;
  String? _search;
  String? _audienceSearch;
  Set<HostCustomerFilter> _filters = const {};
  List<HostCustomerManualTag> _manualTags = const [];
  HostCustomerSort _sort = HostCustomerSort.lastSeen;
  bool _exporting = false;
  bool _searchExpanded = false;
  String? _selectedContactId;
  String? _selectedContactDisplayName;

  @override
  void initState() {
    super.initState();
    _selectedContactId = widget.initialContactId;
    _selectedContactDisplayName = widget.initialContactDisplayName;
  }

  @override
  void didUpdateWidget(covariant HostCustomersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialContactId != widget.initialContactId) {
      _selectedContactId = widget.initialContactId;
      if (widget.initialContactDisplayName != null ||
          oldWidget.initialContactId != widget.initialContactId) {
        _selectedContactDisplayName = widget.initialContactDisplayName;
      }
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();

    super.dispose();
  }

  HostAudienceView get _view => widget.initialView;

  @override
  Widget build(BuildContext context) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final uid = uidState.value;
    final organizersAsync =
        uid != null && !uidState.hasError && !uidState.isLoading
        ? ref.watch(hostOperableOrganizersProvider(uid))
        : const AsyncLoading<List<Organizer>>();
    final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
    if (uidState.hasError ||
        uidState.isLoading ||
        uid == null ||
        organizersState.hasError ||
        organizersState.isLoading) {
      return HostNavigationWorkspace(
        spec: HostDirectoryWorkspace<String>(
          selection: null,
          detailBuilder: (_) => const SizedBox.shrink(),
          unselected: CatchEmptyState(
            icon: CatchIcons.findPerson,
            title: context.l10n.hostCustomersSelectCustomerTitle,
          ),
          index: HostAudienceStateScaffold(
            selected: _view,
            scrollKey: const PageStorageKey<String>(
              'host-customers-route-state',
            ),
            slivers: [
              if (uidState.hasError)
                CatchLocalizedSliverErrorState(
                  uidState.error!,
                  context: AppErrorContext.auth,
                  onRetry: () => ref.invalidate(uidProvider),
                )
              else if (uidState.isLoading)
                const CatchStateViewport.sliverLoading()
              else if (uid == null)
                CatchSliverErrorState(
                  title: context
                      .l10n
                      .hostsHostAuthRequiredScreenTitleSignInRequired,
                  message: context
                      .l10n
                      .hostsHostAuthRequiredScreenMessageSignInToManage,
                  retryLabel:
                      context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
                  onRetry: () => context.go(Routes.authScreen.path),
                )
              else if (organizersState.hasError)
                CatchLocalizedSliverErrorState(
                  organizersState.error!,
                  context: AppErrorContext.organizer,
                  onRetry: () =>
                      ref.invalidate(hostOperableOrganizersProvider(uid)),
                )
              else
                const CatchStateViewport.sliverLoading(),
            ],
          ),
        ),
      );
    }
    final organizers = organizersState.value ?? const <Organizer>[];
    if (organizers.isEmpty) {
      return HostNavigationWorkspace(
        spec: HostDirectoryWorkspace<String>(
          selection: null,
          detailBuilder: (_) => const SizedBox.shrink(),
          unselected: CatchEmptyState(
            icon: CatchIcons.findPerson,
            title: context.l10n.hostCustomersSelectCustomerTitle,
          ),
          index: HostAudienceNoOrganizerEmptyState(selected: _view),
        ),
      );
    }
    final selectedOrganizerId = ref.watch(hostOrganizerSelectionProvider(uid));
    final selectedOrganizer = resolveSelectedHostOrganizer(
      organizers,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: selectedOrganizerId == null
          ? widget.initialOrganizerId
          : null,
    )!;
    final peopleView = _view == HostAudienceView.people;
    final summary = peopleView
        ? ref.watch(hostCrmSummaryProvider(selectedOrganizer.id))
        : const AsyncLoading<HostCrmSummary>();
    final messagingSetup = peopleView
        ? ref.watch(hostMessagingSetupProvider(selectedOrganizer.id))
        : const AsyncLoading<HostMessagingSetup>();
    final summaryState = catchAsyncStateFromAsyncValue(summary);
    final messagingSetupState = catchAsyncStateFromAsyncValue(messagingSetup);
    final canManageWhatsappSender =
        messagingSetupState.value?.canManageWhatsappSender(
          embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
        ) ??
        false;
    final visibleFilters = hostCustomerFiltersForSmsReadiness(
      summaryState.value?.smsReadiness,
    );
    final effectiveFilters = _filters.intersection(visibleFilters.toSet());
    final effectiveFilter = effectiveFilters.length == 1
        ? effectiveFilters.single
        : HostCustomerFilter.all;
    final selectionLabel = _customerSelectionLabel(
      context,
      effectiveFilters,
      _manualTags,
    );
    final request = HostCustomersDirectoryRequest(
      organizerId: selectedOrganizer.id,
      search: _search,
      filters: effectiveFilters,
      manualTagIds: {for (final tag in _manualTags) tag.tagId},
      sort: _sort,
    );
    final directory = peopleView
        ? ref.watch(hostCustomersDirectoryControllerProvider(request))
        : const AsyncLoading<HostCustomersDirectoryState>();
    final directoryState = catchAsyncStateFromAsyncValue(directory).value;
    final campaignAudienceDefinition =
        hostSavedAudienceDefinitionForCustomerSelection(
          filters: effectiveFilters,
          manualTags: _manualTags,
        );
    final campaignBridgePhase = directoryState == null
        ? HostCustomerCampaignBridgePhase.notApplicable
        : hostCustomerCampaignBridgePhase(
            hasAudienceDefinition: campaignAudienceDefinition != null,
            hasActiveSearch: _search != null,
            directory: directoryState,
            messagingSetup: messagingSetupState,
          );
    final campaignBridgeBlocker = switch (campaignBridgePhase) {
      HostCustomerCampaignBridgePhase.noReachableRecipients =>
        HostCampaignBlockers.noReachableRecipients,
      HostCustomerCampaignBridgePhase.audienceCoveragePartial =>
        HostCampaignBlockers.audienceCoveragePartial,
      HostCustomerCampaignBridgePhase.providerUnavailable =>
        HostCampaignBlockers.providerSetupRequired,
      HostCustomerCampaignBridgePhase.senderSetupRequired =>
        HostCampaignBlockers.senderInactive,
      _ => null,
    };
    final newCustomerCount = peopleView
        ? ref
              .watch(
                hostCustomerSegmentCountProvider(
                  HostCustomerSegmentCountRequest(
                    organizerId: selectedOrganizer.id,
                    filter: HostCustomerFilter.newToOrganizer,
                  ),
                ),
              )
              .when(
                data: (value) => value,
                loading: () => null,
                error: (_, _) => null,
              )
        : null;
    return CatchViewport.box(
      builder: (context, viewport) {
        final screenSize = viewport.sizeClass;
        final activeQuery = peopleView ? _search : _audienceSearch;
        final directoryControls = HostCustomerControlSection(
          sort: _sort,
          activeFilters: effectiveFilters.isEmpty && _manualTags.isEmpty
              ? null
              : selectionLabel,
          onClear: effectiveFilters.isEmpty && _manualTags.isEmpty
              ? null
              : () => setState(() {
                  _filters = {};
                  _manualTags = [];
                }),
          shrinkWrap: true,
          condensed: screenSize.isCompact || screenSize.isExpanded,
          onSortChanged: (sort) => setState(() => _sort = sort),
          onOpenFilters: directoryState == null
              ? null
              : () => _openFilters(
                  effectiveFilters,
                  _manualTags,
                  directoryState,
                  summaryState.value?.smsReadiness,
                ),
        );
        final indexPane = CatchRootScreenScaffold.withPrimaryRail(
          header: CatchRootScreenHeader.custom(
            HostAudienceHeader(
              organizerId: selectedOrganizer.id,
              primaryAction: peopleView
                  ? CatchTopBarPrimaryButton(
                      key: const ValueKey<String>(
                        'host-customers-add-customer',
                      ),
                      label: context.l10n.hostCustomersAdd,
                      icon: CatchIcons.addPerson,
                      onPressed: () => _addCustomer(selectedOrganizer, request),
                    )
                  : CatchTopBarPrimaryButton(
                      key: const ValueKey('host-saved-audience-create'),
                      label: context.l10n.hostSavedAudienceNew,
                      icon: CatchIcons.add,
                      onPressed: () => _openAudienceEditor(selectedOrganizer),
                    ),
              menuItems: peopleView
                  ? _hostCustomersHeaderActions(
                      context,
                      includeExport: !_exporting,
                      exportEnabled: true,
                    )
                  : const [],
              onMenuAction: (action) {
                if (action == HostAudienceMenuAction.reviewDuplicates) {
                  unawaited(_reviewDuplicates(selectedOrganizer.id));
                }
                if (action == HostAudienceMenuAction.export) {
                  unawaited(
                    _exportCustomers(selectedOrganizer, effectiveFilters),
                  );
                }
              },
              search: CatchTopBarSearch(
                copy: catchSearchFieldCopy(context.l10n),
                fieldKey: ValueKey(
                  peopleView
                      ? 'host-customers-search'
                      : 'host-audiences-search',
                ),
                value: activeQuery ?? '',
                contract: peopleView
                    ? CatchContractConstraints
                          .listOrganizerContactsCallablePayloadQuery
                    : CatchContractConstraints
                          .upsertOrganizerSavedAudienceCallablePayloadName,
                placeholder: peopleView
                    ? context.l10n.hostsHostAudienceSearch
                    : context.l10n.hostSavedAudiencesSearch,
                tooltip: peopleView
                    ? context.l10n.hostsHostAudienceSearch
                    : context.l10n.hostSavedAudiencesSearch,
                semanticLabel: peopleView
                    ? context.l10n.hostsHostAudienceSearch
                    : context.l10n.hostSavedAudiencesSearch,
                expanded: _searchExpanded || activeQuery != null,
                onExpandedChanged: (expanded) {
                  if (_searchExpanded == expanded) return;
                  setState(() => _searchExpanded = expanded);
                },
                onChanged: (value) => _scheduleSearch(_view, value),
                onSubmitted: (value) => _applySearch(_view, value),
                onFocusChanged: (focused) {
                  if (!focused && activeQuery == null && _searchExpanded) {
                    setState(() => _searchExpanded = false);
                  }
                },
                textInputAction: TextInputAction.search,
              ),
            ),
          ),
          actions: HostAudienceTabRail(
            selected: _view,
            selectionPosition: _view.index.toDouble(),
            onChanged: (view) =>
                _selectAudienceView(view, selectedOrganizer.id),
          ),
          body: CatchRootScreenBody.single(
            page: peopleView
                ? CatchRootScreenPageSpec.scroll(
                    page: CatchRootScreenPageScrollView.sections(
                      scrollKey: const PageStorageKey<String>(
                        'host-customers-people',
                      ),
                      children: [
                        SliverToBoxAdapter(
                          child: CatchSection.content(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                HostCustomersSummarySection(
                                  summary: summary,
                                  newCustomerCount: newCustomerCount,
                                  onRetry: () => _refreshPeopleCounts(
                                    selectedOrganizer.id,
                                  ),
                                  selectedFilter:
                                      _manualTags.isEmpty &&
                                          effectiveFilters.length <= 1 &&
                                          const {
                                            HostCustomerFilter.all,
                                            HostCustomerFilter.repeat,
                                            HostCustomerFilter.newToOrganizer,
                                          }.contains(effectiveFilter)
                                      ? effectiveFilter
                                      : null,
                                  onFilterSelected: (selectedFilter) =>
                                      setState(() {
                                        _filters =
                                            selectedFilter ==
                                                    HostCustomerFilter.all ||
                                                (effectiveFilters.length == 1 &&
                                                    effectiveFilters.contains(
                                                      selectedFilter,
                                                    ))
                                            ? {}
                                            : {selectedFilter};
                                        _manualTags = [];
                                      }),
                                ),
                                gapH16,
                              ],
                            ),
                          ),
                        ),
                        SliverToBoxAdapter(child: directoryControls),
                        if (directoryState != null &&
                            (effectiveFilters.isNotEmpty ||
                                _manualTags.isNotEmpty ||
                                _search != null))
                          CatchPageBody.sliver(
                            child: SliverList.list(
                              children: [
                                HostCustomerFilterSummarySection(
                                  filter: effectiveFilter,
                                  selectionLabel: selectionLabel,
                                  count: directoryState.matchCount,
                                  countCoverage:
                                      directoryState.matchCountCoverage,
                                  campaignBlocker: campaignBridgeBlocker,
                                  onMessage:
                                      campaignBridgePhase ==
                                              HostCustomerCampaignBridgePhase
                                                  .ready &&
                                          campaignAudienceDefinition != null
                                      ? () => _saveAndMessageCustomers(
                                          selectedOrganizer,
                                          selectionLabel,
                                          campaignAudienceDefinition,
                                        )
                                      : null,
                                  onReviewSenderSetup:
                                      campaignBridgePhase ==
                                              HostCustomerCampaignBridgePhase
                                                  .senderSetupRequired &&
                                          canManageWhatsappSender
                                      ? () => _reviewWhatsappSenderSetup(
                                          selectedOrganizer,
                                        )
                                      : null,
                                ),
                              ],
                            ),
                          ),
                        CatchAsyncBoundary<HostCustomersDirectoryState>.sliver(
                          value: directory,
                          onRetry: () => ref.invalidate(
                            hostCustomersDirectoryControllerProvider(request),
                          ),
                          initialLoadTimeout: null,
                          loadingBuilder: (_) => CatchSection.sliverLoadingRows(
                            itemCount: 5,
                            layoutBuilder: (_, _) =>
                                const CatchPersonLayout.placeholder(
                                  hasSupportingText: true,
                                  hasBadge: true,
                                ),
                          ),
                          errorBuilder: (_, error, _, onBoundaryRetry) =>
                              CatchLocalizedSliverErrorState(
                                error,
                                context: AppErrorContext.customers,
                                onRetry: onBoundaryRetry,
                              ),
                          builder: (context, state) => HostCustomersList(
                            state: state,
                            selectedContactId: _selectedContactId,
                            hasActiveQuery:
                                _search != null ||
                                effectiveFilters.isNotEmpty ||
                                _manualTags.isNotEmpty,
                            onCustomerSelected: (contact) =>
                                _openCustomer(selectedOrganizer, contact),
                            onLoadMore: state.canLoadMore
                                ? () => ref
                                      .read(
                                        hostCustomersDirectoryControllerProvider(
                                          request,
                                        ).notifier,
                                      )
                                      .loadMore()
                                : null,
                            onRefreshCoverage: () {
                              _refreshPeopleCounts(selectedOrganizer.id);
                              ref.invalidate(
                                hostCustomersDirectoryControllerProvider(
                                  request,
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  )
                : CatchRootScreenPageSpec.scroll(
                    page: HostSavedAudiencesWorkspace(
                      organizerId: selectedOrganizer.id,
                      query: _audienceSearch,

                      onOpen: (audience) => _openAudienceEditor(
                        selectedOrganizer,
                        audience: audience,
                      ),
                    ),
                  ),
          ),
        );
        return HostNavigationWorkspace(
          spec: HostDirectoryWorkspace<String>(
            index: indexPane,
            selection: peopleView ? _selectedContactId : null,
            unselected: CatchEmptyState(
              icon: peopleView ? CatchIcons.findPerson : CatchIcons.people,
              title: peopleView
                  ? context.l10n.hostCustomersSelectCustomerTitle
                  : context.l10n.coreCatchFieldVisiblecopySelect,
              message: peopleView
                  ? context.l10n.hostCustomersSelectCustomerBody
                  : null,
            ),
            recordId: (_) => Routes.hostCustomerDetailScreen.name,
            detailBuilder: (contactId) => HostWorkspaceRouteContent(
              id: hostWorkspaceContentId(
                Routes.hostCustomerDetailScreen.name,
                Routes.hostCustomerDetailScreen.path,
                {'contactId': contactId},
              ),
              builder: (context) => HostCustomerDetailScreen(
                key: ValueKey(contactId),
                organizerId: selectedOrganizer.id,
                contactId: contactId,
                initialDisplayName: _selectedContactDisplayName,
                embedded: true,
                onBack: () => context.goNamed(
                  Routes.hostAudienceScreen.name,
                  queryParameters: {'organizerId': selectedOrganizer.id},
                ),
              ),
            ),
            onBack: () => context.goNamed(
              Routes.hostAudienceScreen.name,
              queryParameters: {'organizerId': selectedOrganizer.id},
            ),
          ),
        );
      },
    );
  }

  void _scheduleSearch(HostAudienceView view, String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(
      CatchMotion.searchDebounce,
      () => _applySearch(view, value),
    );
  }

  void _applySearch(HostAudienceView view, String value) {
    _searchDebounce?.cancel();
    final normalized = value.trim();
    final nextSearch = normalized.isEmpty ? null : normalized;
    if (!mounted) return;
    switch (view) {
      case HostAudienceView.people:
        if (_search == nextSearch) return;
        setState(() => _search = nextSearch);
      case HostAudienceView.audiences:
        if (_audienceSearch == nextSearch) return;
        setState(() => _audienceSearch = nextSearch);
      case HostAudienceView.forms:
      case HostAudienceView.responses:
        return;
    }
  }

  void _selectAudienceView(HostAudienceView view, String organizerId) {
    context.goNamed(
      Routes.hostAudienceScreen.name,
      queryParameters: {'view': view.name, 'organizerId': organizerId},
    );
  }

  Future<void> _openFilters(
    Set<HostCustomerFilter> activeFilters,
    List<HostCustomerManualTag> activeManualTags,
    HostCustomersDirectoryState directory,
    HostCrmChannelReadiness? smsReadiness,
  ) async {
    await showCatchBottomSheet<HostCustomerFilterSelection>(
      context: context,
      builder: (_) => HostCustomerFilterSheet(
        selectedFilters: activeFilters,
        selectedManualTags: activeManualTags,
        manualTagVocabulary: directory.manualTagVocabulary,
        smsReadiness: smsReadiness,
        onChanged: (selection) {
          if (!mounted) return;
          setState(() {
            _filters = selection.allFilters;
            _manualTags = selection.allManualTags;
          });
        },
      ),
    );
  }

  Future<void> _saveAndMessageCustomers(
    Organizer organizer,
    String label,
    HostSavedAudienceDefinition definition,
  ) async {
    final audience = await showCatchBottomSheet<HostSavedAudience>(
      context: context,
      builder: (_) => HostSaveAudienceSheet(
        organizerId: organizer.id,
        suggestedName: label,
        definition: definition,
      ),
    );
    if (!mounted || audience == null) return;
    context.goNamed(
      Routes.hostInboxScreen.name,
      queryParameters: {
        'workspace': HostMessagingWorkspace.campaigns.name,
        'compose': '1',
        'audienceId': audience.audienceId,
      },
      extra: organizer,
    );
  }

  void _reviewWhatsappSenderSetup(Organizer organizer) => context.pushNamed(
    Routes.hostOrganizerMessagingScreen.name,
    pathParameters: {'clubId': organizer.id},
  );

  Future<void> _addCustomer(
    Organizer organizer,
    HostCustomersDirectoryRequest request,
  ) async {
    final created = await context.pushNamed<HostCreatedCustomer>(
      Routes.hostAddCustomerScreen.name,
      queryParameters: {'organizerId': organizer.id},
    );
    if (!mounted || created == null) return;
    _refreshPeopleCounts(organizer.id);
    ref.invalidate(hostCustomersDirectoryControllerProvider(request));
    _openCustomerById(
      organizer,
      created.contactId,
      displayName: created.displayName,
    );
  }

  void _refreshPeopleCounts(String organizerId) {
    ref.invalidate(hostCrmSummaryProvider(organizerId));
    ref.invalidate(
      hostCustomerSegmentCountProvider(
        HostCustomerSegmentCountRequest(
          organizerId: organizerId,
          filter: HostCustomerFilter.newToOrganizer,
        ),
      ),
    );
  }

  Future<void> _exportCustomers(
    Organizer organizer,
    Set<HostCustomerFilter> filters,
  ) async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      final export = await ref
          .read(hostCustomersControllerProvider)
          .exportCustomers(
            organizerId: organizer.id,
            query: HostAudienceQuery(
              search: _search,
              segments: {
                for (final filter in filters)
                  ?hostAudienceSegmentForCustomerFilter(filter),
              },
              manualTagIds: {for (final tag in _manualTags) tag.tagId},
            ),
          );
      if (!mounted) return;
      await ref
          .read(externalShareControllerProvider)
          .shareCsvFile(
            csv: export.csv,
            fileName: export.fileName,
            subject: context.l10n.hostsHostAudienceExportSubject,
            text: export.truncated
                ? context.l10n.hostsHostAudienceExportTruncated
                : context.l10n.hostsHostAudienceExportCount(
                    count: export.rowCount,
                  ),
          );
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  void _openCustomer(
    Organizer organizer,
    HostCustomerDirectoryContact contact,
  ) => _openCustomerById(
    organizer,
    contact.contactId,
    displayName: contact.displayName,
  );

  void _openCustomerById(
    Organizer organizer,
    String contactId, {
    required String displayName,
  }) {
    setState(() {
      _selectedContactId = contactId;
      _selectedContactDisplayName = displayName;
    });
    context.goNamed(
      Routes.hostAudienceScreen.name,
      queryParameters: {'organizerId': organizer.id, 'contactId': contactId},
      extra: HostCustomerDetailRouteArguments(displayName: displayName),
    );
  }
}
