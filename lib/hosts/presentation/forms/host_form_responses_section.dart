import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/host_forms_repository.dart';
import 'package:catch_dating_app/hosts/data/host_response_query_repository.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/domain/host_application_summary.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_workspace_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

export 'host_response_query_capability.dart'
    show canMountHostResponseQuery, hostResponseQueryCapability;

part 'host_form_responses_filter_sheet.dart';

class HostFormResponsesSection extends ConsumerStatefulWidget {
  const HostFormResponsesSection({
    super.key,
    required this.organizerId,
    this.query,
    this.contactId,
    this.onClearContactFilter,
    this.formId,
    this.formTitle,
    this.onClearFormFilter,
    this.onFormChanged,
    this.showFormContext = true,
    this.queryCapability,
    this.accountId,
    this.accountGeneration = 0,
    this.accountMountKey,
    this.requireAccount = false,
  });

  final String organizerId;
  final String? query;
  final String? contactId;
  final VoidCallback? onClearContactFilter;
  final String? formId;
  final String? formTitle;
  final VoidCallback? onClearFormFilter;
  final ValueChanged<String?>? onFormChanged;
  final bool showFormContext;
  final HostResponseQueryCapability? queryCapability;

  /// Production routes bind this panel to the current manager. A new actor
  /// must fetch legacy responses again before any cached rows can render.
  final String? accountId;
  final int accountGeneration;
  final Object? accountMountKey;
  final bool requireAccount;

  @override
  ConsumerState<HostFormResponsesSection> createState() =>
      _HostFormResponsesSectionState();
}

class _HostFormResponsesSectionState
    extends ConsumerState<HostFormResponsesSection> {
  HostResponseQueryController? _queryController;
  JournalHostResponseExportGateway? _exportGateway;
  String? _queryAccountId;
  final Object _localAccountMountKey = Object();
  ProviderSubscription<AsyncValue<HostFormResponsesState>>? _legacyFreshRead;
  String? _legacyLoadedAccountId;
  bool _legacyAccountRefreshScheduled = false;
  Object? _legacyRefreshError;
  int _legacyRefreshGeneration = 0;
  HostApplicationReviewStatus? _status;
  bool _oldestFirst = false;
  bool _answerWorkspaceOpen = false;
  String? _versionId;
  bool _versionResolved = false;
  HostFormResponseVersionScope? _versionScope;
  final Map<String, Set<String>> _answerFilters = {};
  List<HostFormResponseFilterOption> _filterOptions = const [];

  void _bindQueryAccount(String? accountId) {
    _queryController?.dispose();
    _queryAccountId = accountId;
    _queryController = accountId == null || widget.queryCapability == null
        ? null
        : HostResponseQueryController(
            widget.queryCapability!.gateway ??
                HostResponseQueryRepository(
                  ref.read(firebaseFunctionsProvider),
                ),
          );
    _exportGateway = null;
  }

  @override
  void dispose() {
    _legacyFreshRead?.close();
    _queryController?.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant HostFormResponsesSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.queryCapability?.gateway != widget.queryCapability?.gateway ||
        oldWidget.queryCapability?.versionId !=
            widget.queryCapability?.versionId ||
        (oldWidget.queryCapability == null) !=
            (widget.queryCapability == null) ||
        oldWidget.formId != widget.formId ||
        oldWidget.organizerId != widget.organizerId) {
      _bindQueryAccount(_queryAccountId);
    }
    if (oldWidget.formId != widget.formId ||
        oldWidget.organizerId != widget.organizerId ||
        oldWidget.accountId != widget.accountId ||
        oldWidget.accountGeneration != widget.accountGeneration ||
        !identical(oldWidget.accountMountKey, widget.accountMountKey)) {
      _legacyFreshRead?.close();
      _legacyFreshRead = null;
      _answerWorkspaceOpen = false;
      _answerFilters.clear();
      _filterOptions = const [];
      _versionId = null;
      _versionResolved = false;
      _versionScope = null;
      _legacyLoadedAccountId = null;
      _legacyAccountRefreshScheduled = false;
      _legacyRefreshError = null;
      _legacyRefreshGeneration++;
    }
  }

  @override
  Widget build(BuildContext context) {
    final capability = _answerWorkspaceOpen ? widget.queryCapability : null;
    final routeAccountId = widget.accountId;
    if (widget.requireAccount && routeAccountId == null) {
      return const CatchStateViewport.sliverLoading();
    }
    if (routeAccountId != null) {
      final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
      final uid = actor.isSettledData ? actor.value : null;
      final liveUid = ref.watch(firebaseAuthProvider).currentUser?.uid;
      if (uid != routeAccountId || liveUid != routeAccountId) {
        _legacyLoadedAccountId = null;
        _legacyAccountRefreshScheduled = false;
        _legacyRefreshError = null;
        _legacyRefreshGeneration++;
        return const CatchStateViewport.sliverLoading();
      }
      if (capability == null && _legacyLoadedAccountId != routeAccountId) {
        if (_legacyRefreshError case final error?) {
          return CatchLocalizedSliverErrorState(
            error,
            context: AppErrorContext.forms,
            onRetry: () => setState(() => _legacyRefreshError = null),
          );
        }
        if (!_legacyAccountRefreshScheduled) {
          _legacyAccountRefreshScheduled = true;
          final generation = ++_legacyRefreshGeneration;
          WidgetsBinding.instance.addPostFrameCallback((_) async {
            if (!_currentLegacyAccount(routeAccountId, generation)) return;
            final provider = hostFormResponsesControllerProvider(
              _responseRequest(widget.formId),
            );
            _legacyFreshRead?.close();
            // A loading actor/generation family is already this scope's read.
            // Refresh settled cache when the same account remounts.
            final loading = ref.read(provider).isLoading;
            final subscription = ref.listenManual(provider, (_, _) {});
            _legacyFreshRead = subscription;
            try {
              final freshRead = loading
                  ? ref.read(provider.future)
                  : ref.refresh(provider.future);
              await freshRead;
              if (!_currentLegacyAccount(routeAccountId, generation)) return;
              setState(() {
                _legacyLoadedAccountId = routeAccountId;
                _legacyAccountRefreshScheduled = false;
              });
            } on Object catch (error) {
              if (!_currentLegacyAccount(routeAccountId, generation)) return;
              setState(() {
                _legacyRefreshError = error;
                _legacyAccountRefreshScheduled = false;
              });
            } finally {
              // Keep the family alive until the settled build watches it.
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!identical(_legacyFreshRead, subscription)) return;
                _legacyFreshRead = null;
                subscription.close();
              });
            }
          });
        }
        return const CatchStateViewport.sliverLoading();
      }
    }
    if (capability != null && widget.formId != null) {
      final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
      final uid = uidState.isSettledData ? uidState.value : null;
      final liveUid = ref.watch(firebaseAuthProvider).currentUser?.uid;
      final accountId = uid != null && uid == liveUid ? uid : null;
      if (_queryAccountId != accountId ||
          (accountId != null && _queryController == null)) {
        _bindQueryAccount(accountId);
      }
      if (uidState.error != null) {
        return CatchLocalizedSliverErrorState(
          uidState.error!,
          context: AppErrorContext.auth,
          onRetry: () => ref.invalidate(uidProvider),
        );
      }
      if (accountId == null) {
        return !uidState.isSettledData || uid != null
            ? const CatchStateViewport.sliverLoading()
            : CatchSliverErrorState(
                title:
                    context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
                message: context
                    .l10n
                    .hostsHostAuthRequiredScreenMessageSignInToManage,
                retryLabel:
                    context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
                onRetry: () => context.go(Routes.authScreen.path),
              );
      }
      final queryController = _queryController!;
      final offerCopy = capability.offerWorkspace;
      final functions = ref.read(firebaseFunctionsProvider);
      return SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSection.content(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchButton(
                    label: context.l10n.hostResponseQueryReviewInbox,
                    variant: CatchButtonVariant.ghost,
                    onPressed: () => setState(() {
                      queryController.clearSelection();
                      _answerWorkspaceOpen = false;
                    }),
                  ),
                  CatchText(
                    context.l10n.hostResponseQueryVersionScope(
                      version: _versionNumber(capability.versionId),
                    ),
                    variant: CatchTextVariant.supporting,
                  ),
                  gapH16,
                ],
              ),
            ),
            HostResponseQueryWorkspaceSection(
              controller: queryController,
              request: HostResponseQueryRequest(
                organizerId: widget.organizerId,
                formId: widget.formId!,
                versionId: capability.versionId,
              ),
              copy: capability.copy,
              onReviewSelection: capability.onReviewSelection,
              exportGateway:
                  capability.exportGateway ??
                  (_exportGateway ??= JournalHostResponseExportGateway(
                    repository: HostFormsRepository(functions),
                    storage: ref.read(commandJournalStorageProvider),
                    currentAccountId: () =>
                        ref.read(firebaseAuthProvider).currentUser?.uid,
                  )),
              exportAccountId: capability.exportAccountId ?? accountId,
              offerWorkspace: offerCopy == null
                  ? null
                  : AnimatedBuilder(
                      animation: queryController,
                      builder: (context, _) =>
                          queryController.selectionIntent == null
                          ? const SizedBox.shrink()
                          : CatchSection.content(
                              child: CatchButton(
                                label: context.l10n.hostResponseOfferEvent,
                                onPressed: () => context.pushNamed<void>(
                                  Routes.hostResponseQueryOfferScreen.name,
                                  pathParameters: {'formId': widget.formId!},
                                  queryParameters: {
                                    'organizerId': widget.organizerId,
                                  },
                                  extra: queryController,
                                ),
                              ),
                            ),
                    ),
              onOpenResponse: (responseId) => context.pushNamed(
                Routes.hostFormResponseDetailScreen.name,
                pathParameters: {'responseId': responseId},
                queryParameters: {'organizerId': widget.organizerId},
              ),
            ),
          ],
        ),
      );
    }
    final request = _responseRequest(widget.formId);
    final responses = ref.watch(hostFormResponsesControllerProvider(request));
    final loaded = catchAsyncStateFromAsyncValue(responses).value;
    if (loaded?.versionScope != null) _versionScope = loaded!.versionScope;
    final resolvingVersion =
        widget.formId != null &&
        loaded?.versionScope?.activeVersionId != null &&
        !_versionResolved;
    if (resolvingVersion) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _versionResolved || widget.formId != request.formId) {
          return;
        }
        setState(() {
          _versionId = loaded!.versionScope!.activeVersionId;
          _versionResolved = true;
        });
      });
    }
    if (loaded != null) _filterOptions = loaded.answerFilterOptions;
    final visibleVersionId = _versionResolved
        ? _versionId
        : _versionScope?.activeVersionId;
    final versionLabel = _versionScope == null
        ? null
        : visibleVersionId == null
        ? context.l10n.hostAudienceResponsesAllVersions
        : context.l10n.hostAudienceResultsVersion(
            version: _versionNumber(visibleVersionId),
          );
    final activeFilters = [
      if (widget.showFormContext && widget.formId != null)
        _formLabel(context, loaded),
      if (widget.contactId != null) context.l10n.hostAudienceSelectedPerson,
      if (widget.formId != null &&
          _versionScope != null &&
          _versionResolved &&
          _versionId != _versionScope!.activeVersionId)
        versionLabel!,
      for (final entry
          in (_answerFilters.entries.toList()
            ..sort((a, b) => a.key.compareTo(b.key))))
        for (final option in _filterOptions.where(
          (item) => item.questionId == entry.key,
        ))
          '${option.label}: ${(entry.value.toList()..sort()).map((value) => option.options[value] ?? value).join(', ')}',
    ];
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: CatchSection.content(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchChoiceInput<HostApplicationReviewStatus?>.segmented(
                  key: const ValueKey('host-responses-lifecycle'),
                  options: [
                    CatchOption(
                      value: null,
                      label: context.l10n.hostFormsFilterAll,
                    ),
                    for (final status in HostApplicationReviewStatus.values)
                      CatchOption(
                        value: status,
                        label: hostApplicationStatusLabel(context, status),
                      ),
                  ],
                  selected: _status,
                  variant: CatchChoiceInputVariant.summary,
                  contractExemption:
                      'Review lifecycle maps directly to the unified response request reviewStatus; All includes responses without application review.',
                  onChanged: (status) => setState(() => _status = status),
                  scrollable: true,
                  showDivider: false,
                ),
                if (widget.formId != null && versionLabel != null) ...[
                  gapH8,
                  CatchText(versionLabel, variant: CatchTextVariant.supporting),
                ],
                if (widget.queryCapability != null && widget.formId != null)
                  CatchButton(
                    label: context.l10n.hostResponseQueryOpenAnswers,
                    variant: CatchButtonVariant.ghost,
                    onPressed: () =>
                        setState(() => _answerWorkspaceOpen = true),
                  ),
                gapH16,
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: CatchSection.controls(
            sortLabel: context.l10n.hostCustomersSortControl(
              label: _oldestFirst
                  ? context.l10n.hostApplicationsSortOldest
                  : context.l10n.hostApplicationsSortNewest,
            ),
            onSort: _chooseSort,
            filtersLabel: context.l10n.hostCustomersFilters,
            onFilters: _openFilters,
            activeFilters: activeFilters.isEmpty
                ? null
                : activeFilters.join(' · '),
            clearLabel: activeFilters.isEmpty
                ? null
                : context.l10n.hostCustomersClearFilter,
            onClear: activeFilters.isEmpty
                ? null
                : () {
                    setState(() {
                      _answerFilters.clear();
                      _versionId = _versionScope?.activeVersionId;
                      _versionResolved = true;
                      _filterOptions = const [];
                    });
                    widget.onClearContactFilter?.call();
                    if (widget.showFormContext) {
                      widget.onClearFormFilter?.call();
                    }
                  },
          ),
        ),
        CatchAsyncBoundary<HostFormResponsesState>.sliver(
          value: responses,
          onRetry: () =>
              ref.invalidate(hostFormResponsesControllerProvider(request)),
          initialLoadTimeout: null,
          loadingBuilder: (_) => CatchSection.sliverLoadingRows(
            itemCount: 6,
            layoutBuilder: (_, _) => const CatchPersonLayout.placeholder(
              hasSupportingText: true,
              hasContext: true,
              hasBadge: true,
            ),
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              CatchLocalizedSliverErrorState(
                error,
                context: AppErrorContext.formResponses,
                onRetry: onBoundaryRetry,
              ),
          builder: (context, state) {
            if (resolvingVersion) {
              return CatchSection.sliverLoadingRows(
                itemCount: 6,
                layoutBuilder: (_, _) => const CatchPersonLayout.placeholder(
                  hasSupportingText: true,
                  hasContext: true,
                  hasBadge: true,
                ),
              );
            }
            if (state.inboxEntries.isEmpty &&
                !state.canLoadMore &&
                !state.loadingMore &&
                state.loadMoreError == null) {
              final filtered =
                  widget.query != null ||
                  _status != null ||
                  _answerFilters.isNotEmpty;
              return CatchSliverEmptyState(
                icon: CatchIcons.descriptionOutlined,
                title: filtered
                    ? context.l10n.hostFormResponsesNoMatchesTitle
                    : context.l10n.hostFormResponsesEmptyTitle,
                message: filtered
                    ? context.l10n.hostFormResponsesNoMatchesBody
                    : context.l10n.hostFormResponsesEmptyBody,
              );
            }
            return SliverMainAxisGroup(
              slivers: [
                CatchSection.sliverRows(
                  itemCount: state.inboxEntries.length,
                  indexForKeyBuilder: (key) {
                    final index = state.inboxEntries.indexWhere(
                      (entry) =>
                          key ==
                          ValueKey('host-response-entry-${entry.entryId}'),
                    );
                    return index < 0 ? null : index;
                  },
                  itemBuilder: (context, index) {
                    final entry = state.inboxEntries[index];
                    final response = entry.response;
                    final application = entry.application;
                    return CatchField.navigate(
                      key: ValueKey('host-response-entry-${entry.entryId}'),
                      content: CatchPersonLayout(
                        name:
                            application?.applicantDisplayName ??
                            response?.identity.primaryLabel ??
                            context.l10n.hostFormResponsesAnonymous,
                        supportingText: response?.formTitle,
                        context:
                            '${AppTimeFormatters.compactRelativeTime(entry.submittedAt)} · ${application == null ? response?.sourceLabel ?? context.l10n.hostFormResponseDirectSource : hostApplicationSourceLabel(context, application.sourceKind)}',
                        badges: [
                          if (application != null)
                            CatchRowBadge(
                              label: hostApplicationStatusLabel(
                                context,
                                application.reviewStatus,
                              ),
                              tone: hostApplicationStatusTone(
                                application.reviewStatus,
                              ),
                            )
                          else if (response?.status ==
                              HostFormResponseStatus.withdrawn)
                            CatchRowBadge(
                              label: context.l10n.hostFormResponsesWithdrawn,
                              tone: CatchBadgeTone.neutral,
                            ),
                        ],
                      ),
                      onActivate: () async {
                        final queue = HostResponseReviewQueue(
                          request: request,
                          entryId: entry.entryId,
                          index: index,
                        );
                        if (application != null) {
                          await context.pushNamed(
                            Routes.hostApplicationDetailScreen.name,
                            pathParameters: {
                              'applicationId': application.applicationId,
                            },
                            queryParameters: {
                              'organizerId': widget.organizerId,
                            },
                            extra: queue,
                          );
                        } else {
                          await context.pushNamed(
                            Routes.hostFormResponseDetailScreen.name,
                            pathParameters: {
                              'responseId': response!.responseId,
                            },
                            queryParameters: {
                              'organizerId': widget.organizerId,
                            },
                            extra: queue,
                          );
                        }
                      },
                    );
                  },
                ),
                if (state.canLoadMore)
                  CatchPageBody.sliver(
                    child: SliverToBoxAdapter(
                      child: CatchButton(
                        label: context.l10n.hostFormResponsesLoadMore,
                        variant: CatchButtonVariant.secondary,
                        status: state.loadingMore
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        fullWidth: true,
                        onPressed: state.loadingMore
                            ? null
                            : () => ref
                                  .read(
                                    hostFormResponsesControllerProvider(
                                      request,
                                    ).notifier,
                                  )
                                  .loadMore(),
                      ),
                    ),
                  ),
                if (state.loadMoreError case final error?)
                  CatchLocalizedSliverErrorState(
                    error,
                    context: AppErrorContext.formResponses,
                    fillRemaining: false,
                    onRetry: () => ref
                        .read(
                          hostFormResponsesControllerProvider(request).notifier,
                        )
                        .loadMore(),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  bool _currentLegacyAccount(String accountId, int generation) =>
      mounted &&
      widget.accountId == accountId &&
      _legacyRefreshGeneration == generation &&
      ref.read(uidProvider).asData?.value == accountId &&
      ref.read(firebaseAuthProvider).currentUser?.uid == accountId;

  Future<void> _chooseSort() async {
    final value = await showCatchSelectionSheet<bool>(
      context: context,
      title: context.l10n.hostCustomersSort,
      value: _oldestFirst,
      items: [
        CatchSelectionMenuItem(
          value: false,
          label: context.l10n.hostApplicationsSortNewest,
        ),
        CatchSelectionMenuItem(
          value: true,
          label: context.l10n.hostApplicationsSortOldest,
        ),
      ],
    );
    if (value != null && mounted) setState(() => _oldestFirst = value);
  }

  void _updateFilters(VoidCallback update) => setState(update);

  int _versionNumber(String id) => int.tryParse(id.split('_v').last) ?? 0;

  void _selectVersion(String? id) {
    if (_versionId == id && _versionResolved) return;
    setState(() {
      _versionId = id;
      _versionResolved = true;
      _answerFilters.clear();
      _filterOptions = const [];
    });
  }

  HostFormResponseListRequest _responseRequest(String? formId) =>
      HostFormResponseListRequest(
        organizerId: widget.organizerId,
        accountUid: widget.accountId,
        accountGeneration: widget.accountGeneration,
        accountMountKey: widget.accountMountKey ?? _localAccountMountKey,
        formId: formId,
        versionId: formId == widget.formId ? _versionId : null,
        includeApplications: true,
        reviewStatus: _status,
        contactId: widget.contactId,
        query: widget.query,
        answerFilters: Map.unmodifiable(_answerFilters),
        oldestFirst: _oldestFirst,
      );
}
