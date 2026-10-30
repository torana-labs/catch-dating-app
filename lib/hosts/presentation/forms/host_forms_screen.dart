import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'host_forms_account_binding.dart';
part 'host_forms_filter_sheet.dart';
part 'host_response_import.dart';

enum _HostFormRowAction {
  analytics,
  automations,
  duplicate,
  pause,
  resume,
  archive,
  delete,
}

class HostFormsScreen extends ConsumerStatefulWidget {
  const HostFormsScreen({
    super.key,
    this.initialOrganizerId,
    this.initialResponses = false,
    this.initialFormId,
    this.initialContactId,
  });

  final String? initialOrganizerId;
  final bool initialResponses;
  final String? initialFormId;
  final String? initialContactId;

  @override
  ConsumerState<HostFormsScreen> createState() => _HostFormsScreenState();
}

class _HostFormsScreenState extends ConsumerState<HostFormsScreen> {
  Timer? _searchDebounce;
  String? _query;
  String? _responseQuery;
  bool _searchExpanded = false;
  Set<HostFormLifecycleStatus> _statuses = const {};
  Set<HostFormPurpose> _purposes = const {};
  HostAudienceView get _view => widget.initialResponses
      ? HostAudienceView.responses
      : HostAudienceView.forms;
  String? _responseFormId;
  String? _responseContactId;
  bool _importing = false;
  int _importRevision = 0;
  bool _accountBound = false;
  String? _boundAccountId;
  int _accountGeneration = 0;
  final Object _responseMountKey = Object();
  String? _boundOrganizerId;
  // Retain route intent until organizer selection; never reuse old route IDs.
  String? _preferredRouteOrganizerId;
  bool _routeSyncNeeded = false;
  Object? _importOperation;

  void _completeResponseImport() {
    setState(() {
      _responseFormId = null;
      _responseContactId = null;
      _responseQuery = null;
      _importRevision++;
    });
    _syncRoute();
  }

  void _setImporting(bool value) => setState(() => _importing = value);

  @override
  void initState() {
    super.initState();
    _responseFormId = widget.initialFormId;
    _responseContactId = widget.initialContactId;
    _preferredRouteOrganizerId = widget.initialOrganizerId;
  }

  @override
  void didUpdateWidget(covariant HostFormsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialOrganizerId != widget.initialOrganizerId &&
        widget.initialOrganizerId != _boundOrganizerId) {
      _preferredRouteOrganizerId = widget.initialOrganizerId;
    }
    final routeMatchesWorkspace =
        _boundOrganizerId == null ||
        widget.initialOrganizerId == null ||
        widget.initialOrganizerId == _boundOrganizerId;
    if (routeMatchesWorkspace &&
        (oldWidget.initialFormId != widget.initialFormId ||
            oldWidget.initialOrganizerId != widget.initialOrganizerId)) {
      _responseFormId = widget.initialFormId;
    }
    if (routeMatchesWorkspace &&
        (oldWidget.initialContactId != widget.initialContactId ||
            oldWidget.initialOrganizerId != widget.initialOrganizerId)) {
      _responseContactId = widget.initialContactId;
    }
    if (oldWidget.initialResponses != widget.initialResponses) {
      _searchDebounce?.cancel();
      _searchExpanded = false;
    }
    if (oldWidget.initialOrganizerId != widget.initialOrganizerId) {
      _searchDebounce?.cancel();
      _query = null;
      _responseQuery = null;
      _searchExpanded = false;
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Observe every settled transition, including A -> B -> A before a frame.
    ref.listen(uidProvider, (_, next) {
      final state = catchAsyncStateFromAsyncValue(next);
      if (state.isSettledData) _bindAccount(state.value);
    });
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final uid = uidState.value;
    if (uidState.error != null) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: [
          CatchLocalizedSliverErrorState(
            uidState.error!,
            context: AppErrorContext.auth,
            onRetry: () => ref.invalidate(uidProvider),
          ),
        ],
      );
    }
    if (!uidState.isSettledData) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: const [CatchStateViewport.sliverLoading()],
      );
    }
    // A settled stream value can lag a live FirebaseAuth account change.
    if (uid != null &&
        ref.watch(firebaseAuthProvider).currentUser?.uid != uid) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: const [CatchStateViewport.sliverLoading()],
      );
    }
    _bindAccount(uid);
    if (uid == null) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: [
          CatchSliverErrorState(
            title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
            message:
                context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
            retryLabel:
                context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
            onRetry: () => context.go(Routes.authScreen.path),
          ),
        ],
      );
    }
    ref.listen(hostOperableOrganizersProvider(uid), (_, next) {
      final state = catchAsyncStateFromAsyncValue(next);
      if (state.isSettledData) {
        _bindAvailableOrganizer(uid, state.value ?? const <Organizer>[]);
      }
    });
    final organizersAsync = ref.watch(hostOperableOrganizersProvider(uid));
    final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
    if (organizersState.hasError) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: [
          CatchLocalizedSliverErrorState(
            organizersState.error!,
            context: AppErrorContext.organizer,
            onRetry: () => ref.invalidate(hostOperableOrganizersProvider(uid)),
          ),
        ],
      );
    }
    if (organizersState.isLoading) {
      return HostAudienceStateScaffold(
        selected: _view,
        scrollKey: const PageStorageKey<String>('host-forms-route-state'),
        slivers: const [CatchStateViewport.sliverLoading()],
      );
    }
    final organizers = organizersState.value ?? const <Organizer>[];
    if (organizers.isEmpty) {
      return HostAudienceNoOrganizerEmptyState(selected: _view);
    }
    ref.listen(hostOrganizerSelectionProvider(uid), (_, next) {
      if (_boundAccountId != uid) return;
      _preferredRouteOrganizerId = null;
      final available = catchAsyncStateFromAsyncValue(
        ref.read(hostOperableOrganizersProvider(uid)),
      );
      if (available.isSettledData) {
        _bindAvailableOrganizer(uid, available.value ?? const <Organizer>[]);
      }
    });
    final selectedOrganizerId = ref.watch(hostOrganizerSelectionProvider(uid));
    final selectedOrganizer = resolveSelectedHostOrganizer(
      organizers,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: _preferredRouteOrganizerId,
    )!;
    if (_preferredRouteOrganizerId != null &&
        _preferredRouteOrganizerId != selectedOrganizer.id) {
      if (_boundOrganizerId == selectedOrganizer.id) _resetWorkspace();
      _preferredRouteOrganizerId = null;
    }
    _bindOrganizer(selectedOrganizer.id);
    _scheduleWorkspaceRouteSync();
    final request = HostFormListRequest(
      organizerId: selectedOrganizer.id,
      accountUid: uid,
      accountGeneration: _accountGeneration,
      statuses: _statuses.isEmpty
          ? HostFormLifecycleStatus.values.toSet()
          : _statuses,
      purposes: _purposes,
      query: _query,
    );
    final directoryScope = (
      uid: uid,
      accountGeneration: _accountGeneration,
      request: request,
    );
    final accountDirectory = ref.watch(
      hostFormsAccountDirectoryProvider(directoryScope),
    );
    final scopedDirectory = catchAsyncStateFromAsyncValue(accountDirectory);
    // Gate Forms on its directory; Responses reads independently without
    // showing cached directory rows before the gate settles.
    final directory = scopedDirectory.isSettledData
        ? ref.watch(hostFormsDirectoryControllerProvider(request))
        : accountDirectory;
    String? responseVersionId;
    if (canMountHostResponseQuery(
      enabled: true,
      formId: _responseFormId,
      searchQuery: _responseQuery,
      contactId: _responseContactId,
    )) {
      final directoryState = catchAsyncStateFromAsyncValue(directory);
      responseVersionId = directoryState.isSettledData
          ? directoryState.value?.forms
                .where((form) => form.formId == _responseFormId)
                .firstOrNull
                ?.activeVersionId
          : null;
      final responses = catchAsyncStateFromAsyncValue(
        ref.watch(
          hostFormResponsesControllerProvider(
            HostFormResponseListRequest(
              organizerId: selectedOrganizer.id,
              accountUid: uid,
              accountGeneration: _accountGeneration,
              accountMountKey: _responseMountKey,
              formId: _responseFormId,
              includeApplications: true,
            ),
          ),
        ),
      );
      if (responses.isSettledData) {
        responseVersionId ??= responses.value?.versionScope?.activeVersionId;
      }
    }
    final activeSearchIsForms = _view == HostAudienceView.forms;
    final searchPlaceholder = activeSearchIsForms
        ? context.l10n.hostFormsSearch
        : context.l10n.hostFormResponsesSearch;
    return CatchRootScreenScaffold.withPrimaryRail(
      header: CatchRootScreenHeader.custom(
        HostAudienceHeader(
          organizerId: selectedOrganizer.id,
          primaryAction: activeSearchIsForms
              ? CatchTopBarPrimaryButton(
                  key: const ValueKey('host-forms-create'),
                  label: context.l10n.hostFormsCreate,
                  icon: CatchIcons.add,
                  onPressed: () {
                    if (_directoryRequestCurrent(request)) {
                      _openTemplates(selectedOrganizer.id);
                    }
                  },
                )
              : CatchTopBarPrimaryButton(
                  key: const ValueKey('host-responses-import'),
                  label: context.l10n.hostApplicationsImport,
                  icon: CatchIcons.download,
                  onPressed: _importing
                      ? null
                      : () => _pickApplicationImport(request),
                ),
          search: CatchTopBarSearch(
            fieldKey: ValueKey('host-forms-search-${_view.name}'),
            expanded:
                _searchExpanded ||
                (activeSearchIsForms ? _query : _responseQuery) != null,
            onExpandedChanged: (expanded) {
              if (!_directoryRequestCurrent(request) ||
                  _searchExpanded == expanded) {
                return;
              }
              setState(() => _searchExpanded = expanded);
            },
            copy: catchSearchFieldCopy(context.l10n),
            value: activeSearchIsForms ? _query ?? '' : _responseQuery ?? '',
            contract: activeSearchIsForms
                ? CatchContractConstraints
                      .listOrganizerFormsCallablePayloadQuery
                : CatchContractConstraints
                      .listOrganizerFormResponsesCallablePayloadQuery,
            placeholder: searchPlaceholder,
            tooltip: searchPlaceholder,
            semanticLabel: searchPlaceholder,
            autofocus: true,
            textInputAction: TextInputAction.search,
            onChanged: (value) => _scheduleSearch(_view, value, request),
            onSubmitted: (value) => _applySearch(_view, value, request),
          ),
        ),
      ),
      actions: HostAudienceTabRail(
        selected: _view,
        selectionPosition: _view.index.toDouble(),
        onChanged: (view) {
          if (_directoryRequestCurrent(request)) {
            _selectAudienceView(view, selectedOrganizer.id);
          }
        },
      ),
      body: CatchRootScreenBody.single(
        page: activeSearchIsForms
            ? CatchRootScreenPageSpec.scroll(
                page: _HostFormsLibraryPage(
                  request: request,
                  directory: directory,
                  onRetry: () {
                    if (_directoryRequestCurrent(request)) {
                      ref.invalidate(
                        hostFormsAccountDirectoryProvider(directoryScope),
                      );
                    }
                  },
                  onLoadMore: () {
                    if (_directoryRequestCurrent(request)) {
                      unawaited(
                        ref
                            .read(
                              hostFormsDirectoryControllerProvider(
                                request,
                              ).notifier,
                            )
                            .loadMore(),
                      );
                    }
                  },
                  query: _query,
                  statuses: _statuses,
                  purposes: _purposes,
                  onPurposesChanged: (values) {
                    if (_directoryRequestCurrent(request)) {
                      setState(() => _purposes = values);
                    }
                  },
                  onStatusesChanged: (values) {
                    if (_directoryRequestCurrent(request)) {
                      setState(() => _statuses = values);
                    }
                  },
                  onCreate: () {
                    if (_directoryRequestCurrent(request)) {
                      _openTemplates(selectedOrganizer.id);
                    }
                  },
                  onOpenForm: (form) {
                    if (_directoryRequestCurrent(request)) _openForm(form);
                  },
                  onRowAction: (action, form) =>
                      _handleRowAction(action, form, request),
                ),
              )
            : CatchRootScreenPageSpec.scroll(
                page: CatchRootScreenPageScrollView.sections(
                  scrollKey: const PageStorageKey<String>(
                    'host-forms-responses',
                  ),
                  children: [
                    HostFormResponsesSection(
                      key: ValueKey(
                        'responses-$uid-${selectedOrganizer.id}-$_accountGeneration-import-$_importRevision',
                      ),
                      organizerId: selectedOrganizer.id,
                      accountId: uid,
                      accountGeneration: _accountGeneration,
                      accountMountKey: _responseMountKey,
                      requireAccount: true,
                      queryCapability: responseVersionId == null
                          ? null
                          : hostResponseQueryCapability(
                              context.l10n,
                              versionId: responseVersionId,
                            ),
                      query: _responseQuery,
                      contactId: _responseContactId,
                      onClearContactFilter: () {
                        if (!_directoryRequestCurrent(request)) return;
                        setState(() => _responseContactId = null);
                        _syncRoute();
                      },
                      formId: _responseFormId,
                      onFormChanged: (formId) {
                        if (!_directoryRequestCurrent(request)) return;
                        setState(() => _responseFormId = formId);
                        _syncRoute();
                      },
                      onClearFormFilter: () {
                        if (!_directoryRequestCurrent(request)) return;
                        setState(() => _responseFormId = null);
                        _syncRoute();
                      },
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  void _scheduleSearch(
    HostAudienceView view,
    String value,
    HostFormListRequest request,
  ) {
    if (!_directoryRequestCurrent(request)) return;
    _searchDebounce?.cancel();
    _searchDebounce = Timer(
      CatchMotion.searchDebounce,
      () => _applySearch(view, value, request),
    );
  }

  void _applySearch(
    HostAudienceView view,
    String value,
    HostFormListRequest request,
  ) {
    if (!_directoryRequestCurrent(request) || view != _view) return;
    final normalized = value.trim();
    setState(() {
      final query = normalized.isEmpty ? null : normalized;
      switch (view) {
        case HostAudienceView.forms:
          _query = query;
        case HostAudienceView.responses:
          _responseQuery = query;
        case HostAudienceView.people:
        case HostAudienceView.audiences:
          return;
      }
    });
  }

  void _syncRoute() {
    if (!_workspaceCurrent) return;
    final router = GoRouter.maybeOf(context);
    if (router == null) return;
    final uri = router.routeInformationProvider.value.uri;
    if (uri.path != Routes.hostAudienceScreen.path) return;
    final query = {
      ...uri.queryParameters,
      'view': _view.name,
      'organizerId': _boundOrganizerId!,
    };
    if (_responseFormId case final formId?) {
      query['formId'] = formId;
    } else {
      query.remove('formId');
    }
    if (_responseContactId case final contactId?) {
      query['contactId'] = contactId;
    } else {
      query.remove('contactId');
    }
    final next = uri.replace(queryParameters: query);
    if (next != uri) router.replace(next.toString());
  }

  void _selectAudienceView(HostAudienceView view, String organizerId) {
    context.goNamed(
      Routes.hostAudienceScreen.name,
      queryParameters: {
        'view': view.name,
        'organizerId': organizerId,
        if (view == HostAudienceView.forms ||
            view == HostAudienceView.responses) ...{
          'formId': ?_responseFormId,
          'contactId': ?_responseContactId,
        },
      },
    );
  }

  void _openTemplates(String organizerId) {
    context.pushNamed(
      Routes.hostFormTemplatesScreen.name,
      queryParameters: {'organizerId': organizerId},
    );
  }

  void _openForm(HostFormSummary form) {
    context.pushNamed(
      Routes.hostFormBuilderScreen.name,
      pathParameters: {'formId': form.formId},
      queryParameters: {'organizerId': form.organizerId},
    );
  }
}

class _HostFormsLibraryPage extends ConsumerWidget
    implements CatchRootScreenPageOwner {
  const _HostFormsLibraryPage({
    required this.request,
    required this.directory,
    required this.onRetry,
    required this.onLoadMore,
    required this.query,
    required this.statuses,
    required this.purposes,
    required this.onPurposesChanged,
    required this.onStatusesChanged,
    required this.onCreate,
    required this.onOpenForm,
    required this.onRowAction,
  });

  final HostFormListRequest request;
  final AsyncValue<HostFormsDirectoryState> directory;
  final VoidCallback onRetry;
  final VoidCallback onLoadMore;
  final String? query;
  final Set<HostFormLifecycleStatus> statuses;
  final Set<HostFormPurpose> purposes;
  final ValueChanged<Set<HostFormPurpose>> onPurposesChanged;
  final ValueChanged<Set<HostFormLifecycleStatus>> onStatusesChanged;
  final VoidCallback onCreate;
  final ValueChanged<HostFormSummary> onOpenForm;
  final Future<void> Function(_HostFormRowAction, HostFormSummary) onRowAction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CatchRootScreenPageScrollView.sections(
      scrollKey: const PageStorageKey<String>('host-forms-library'),
      children: [
        SliverToBoxAdapter(
          child: CatchSection.content(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchChoiceInput<String>.segmented(
                  options: [
                    CatchOption(
                      value: 'all',
                      label: context.l10n.hostFormsFilterAll,
                    ),
                    for (final candidate in [
                      HostFormLifecycleStatus.published,
                      HostFormLifecycleStatus.draft,
                      HostFormLifecycleStatus.paused,
                      HostFormLifecycleStatus.archived,
                    ])
                      if (candidate == HostFormLifecycleStatus.published ||
                          candidate == HostFormLifecycleStatus.draft ||
                          statuses.contains(candidate))
                        CatchOption(
                          value: candidate.name,
                          label: hostFormStatusLabel(context, candidate),
                        ),
                  ],
                  selected: statuses.isEmpty
                      ? 'all'
                      : statuses.length == 1
                      ? statuses.single.name
                      : null,
                  variant: CatchChoiceInputVariant.summary,
                  contractExemption:
                      'Quick presets replace the status set. A combined selection '
                      'has no single active preset.',
                  onChanged: (value) => onStatusesChanged(
                    value == 'all'
                        ? const {}
                        : {HostFormLifecycleStatus.values.byName(value)},
                  ),
                  scrollable: true,
                  showDivider: false,
                ),
                gapH16,
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: CatchSection.controls(
            sortLabel: context.l10n.hostAudienceRecentlyUpdated,
            filtersLabel: context.l10n.hostCustomersFilters,
            onFilters: () => _showHostFormsFilters(
              context,
              purposes: purposes,
              statuses: statuses,
              onPurposesChanged: onPurposesChanged,
              onStatusesChanged: onStatusesChanged,
            ),
            activeFilters: statuses.isEmpty && purposes.isEmpty
                ? null
                : [
                    for (final status in HostFormLifecycleStatus.values)
                      if (statuses.contains(status))
                        hostFormStatusLabel(context, status),
                    for (final purpose in HostFormPurpose.values)
                      if (purposes.contains(purpose))
                        hostFormPurposeLabel(context, purpose),
                  ].join(' · '),
            clearLabel: statuses.isEmpty && purposes.isEmpty
                ? null
                : context.l10n.hostCustomersClearFilter,
            onClear: statuses.isEmpty && purposes.isEmpty
                ? null
                : () {
                    onStatusesChanged(const {});
                    onPurposesChanged(const {});
                  },
          ),
        ),
        CatchAsyncBoundary<HostFormsDirectoryState>.sliver(
          value: directory,
          onRetry: onRetry,
          initialLoadTimeout: null,
          loadingBuilder: (_) => CatchSection.sliverLoadingRows(
            itemCount: 6,
            layoutBuilder: (_, _) => CatchRecordLayout.placeholder(
              icon: CatchIcons.document,
              hasMetadata: true,
              factCount: 1,
            ),
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              CatchLocalizedSliverErrorState(
                error,
                context: AppErrorContext.forms,
                fillRemaining: false,
                onRetry: onBoundaryRetry,
              ),
          builder: (context, state) {
            if (state.forms.isEmpty) {
              final unfiltered =
                  query == null && statuses.isEmpty && purposes.isEmpty;
              return SliverToBoxAdapter(
                child: CatchEmptyState(
                  icon: CatchIcons.document,
                  title: unfiltered
                      ? context.l10n.hostFormsEmptyTitle
                      : context.l10n.hostFormsNoMatchesTitle,
                  message: unfiltered
                      ? context.l10n.hostFormsEmptyBody
                      : context.l10n.hostFormsNoMatchesBody,
                  actions: [
                    ?unfiltered
                        ? CatchButton(
                            label: context.l10n.hostFormsCreate,
                            size: CatchButtonSize.md,
                            onPressed: onCreate,
                          )
                        : null,
                  ],
                ),
              );
            }
            return SliverMainAxisGroup(
              slivers: [
                CatchSection.sliverRows(
                  itemCount: state.forms.length,
                  indexForKeyBuilder: (key) {
                    final index = state.forms.indexWhere(
                      (form) => key == ValueKey('host-form-${form.formId}'),
                    );
                    return index < 0 ? null : index;
                  },
                  itemBuilder: (context, index) {
                    final form = state.forms[index];
                    return CatchField.navigate(
                      key: ValueKey('host-form-${form.formId}'),
                      content: CatchRecordLayout(
                        title: form.title,
                        icon: CatchIcons.document,
                        metadata:
                            '${hostFormPurposeLabel(context, form.purpose)} · ${form.lastResponseAt == null ? context.l10n.hostAudienceFormEdited(time: AppTimeFormatters.compactRelativeTime(form.updatedAt)) : context.l10n.hostAudienceFormLastResponse(time: AppTimeFormatters.compactRelativeTime(form.lastResponseAt!))}',
                        facts: [
                          context.l10n.hostAudienceFormRecordStatus(
                            status: hostFormStatusLabel(context, form.status),
                            count: form.submittedResponseCount,
                          ),
                        ],
                      ),
                      onActivate: () => onOpenForm(form),
                      secondaryAction:
                          CatchFieldSecondaryAction.menu<_HostFormRowAction>(
                            label: context.l10n.hostFormsActions,
                            items: _hostFormRowActions(context, form),
                            onSelected: (action) => onRowAction(action, form),
                          ),
                    );
                  },
                ),
                if (state.canLoadMore)
                  CatchPageBody.sliver(
                    child: SliverToBoxAdapter(
                      child: CatchButton(
                        label: context.l10n.hostFormsLoadMore,
                        variant: CatchButtonVariant.secondary,
                        status: state.loadingMore
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        fullWidth: true,
                        onPressed: state.loadingMore ? null : onLoadMore,
                      ),
                    ),
                  ),
                if (state.loadMoreError case final error?)
                  CatchLocalizedSliverErrorState(
                    error,
                    context: AppErrorContext.forms,
                    fillRemaining: false,
                    onRetry: onLoadMore,
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

String _requestId(String prefix) =>
    '${prefix}_${DateTime.now().microsecondsSinceEpoch}';
