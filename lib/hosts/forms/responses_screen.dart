import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_status_counts.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/forms/responses_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_filter_sheet.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_workspace.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The answers to one form, or to every form when [formId] is null.
///
/// Reads the answers page by page (with each application's review status),
/// filtered by status (All, a review status, Offered or Withdrawn), sorted
/// newest or oldest first, and narrowed to one published version (the
/// live one by default) and to chosen answers; each status count on an
/// application form comes from the response summaries. Also reads the form
/// itself for its title and count and, on Results, the published version's
/// per-question counts. Opening an answer carries the filtered queue so the
/// answer page can step through it.
class HostResponsesScreen extends ConsumerStatefulWidget {
  const HostResponsesScreen({
    super.key,
    required this.organizerId,
    this.formId,
    this.initialView = HostResponsesView.responses,
    this.now,
  });

  final String organizerId;
  final String? formId;

  /// The view to open on: the answers, or the results counted.
  final HostResponsesView initialView;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  ConsumerState<HostResponsesScreen> createState() =>
      _HostResponsesScreenState();
}

class _HostResponsesScreenState extends ConsumerState<HostResponsesScreen> {
  HostResponsesFilter? _filterChoice;
  late HostResponsesView _view = widget.initialView;
  bool _oldestFirst = false;

  /// Filter by answers is open in place of the list.
  bool _queryOpen = false;

  /// The version listed: unset until the form's live version is known, then
  /// that version, or null for every version.
  String? _versionId;
  bool _versionResolved = false;
  HostFormResponseVersionScope? _scope;
  List<HostFormResponseFilterOption> _options = const [];
  final Map<String, Set<String>> _answers = {};

  /// Bumped on every filter change so an open filter sheet redraws.
  final _revision = ValueNotifier<int>(0);

  @override
  void dispose() {
    _revision.dispose();
    super.dispose();
  }

  void _change(VoidCallback update) {
    setState(update);
    _revision.value++;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = actor.isSettledData ? actor.value : null;
    final formId = widget.formId;
    final editor = formId == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              hostFormEditorControllerProvider(widget.organizerId, formId),
            ),
          ).value;
    final form = editor?.editor.form;
    final reviewed =
        formId != null && form?.purpose == HostFormPurpose.application;
    final waitingForForm = formId != null && form == null;
    // An application form opens on what waits for review; any other on all.
    final filter =
        _filterChoice ??
        (reviewed ? HostResponsesFilter.submitted : HostResponsesFilter.all);
    final request = uid == null || waitingForForm
        ? null
        : _request(uid, filter);
    final value = _responses(request);
    _remember(value?.value, request);
    final counts = reviewed
        ? ref
              .watch(
                hostResponseStatusCountsProvider(
                  organizerId: widget.organizerId,
                  formId: formId,
                ),
              )
              .value
        : null;
    final page = value?.value;
    final versionId = form?.activeVersionId;
    final results = _view == HostResponsesView.results
        ? _results(versionId)
        : null;
    final state = HostResponsesState(
      status: page == null
          ? HostResponsesStatus.loading
          : HostResponsesStatus.content,
      view: _view,
      forForm: formId != null,
      filter: filter,
      oldestFirst: _oldestFirst,
      canFilter:
          formId != null &&
          ((_scope?.activeVersionId != null) || _options.isNotEmpty),
      filterCount: _filterCount,
      filterSummary: _summary(l10n),
      version: _version,
      counts: {
        // All and Withdrawn are not counted by the response summaries.
        if (counts != null)
          for (final option in HostResponsesFilter.values)
            if (option == HostResponsesFilter.offered)
              option: counts.offered
            else if (counts.review[option.reviewStatus] != null)
              option: counts.review[option.reviewStatus]!,
      },
      entries: page?.inboxEntries ?? const [],
      canLoadMore: page?.canLoadMore ?? false,
      loadingMore: page?.loadingMore ?? false,
      loadMoreError: page?.loadMoreError,
      results: results?.value?.questions ?? const [],
      resultsPending:
          _view == HostResponsesView.results &&
          versionId != null &&
          results?.value == null &&
          results?.error == null,
    );
    final Widget body;
    final error = value?.error;
    if (actor.isSettledData && uid == null) {
      body = CatchErrorState(
        title: l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
        message: l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
        retryLabel: l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
        onRetry: () => context.go(Routes.authScreen.path),
      );
    } else if (error != null && page == null) {
      body = CatchLocalizedErrorState(
        error,
        context: AppErrorContext.formResponses,
        onRetry: () => ref
            .read(hostFormResponsesControllerProvider(request!).notifier)
            .retry(),
      );
    } else if (_queryOpen &&
        _view == HostResponsesView.responses &&
        formId != null &&
        versionId != null &&
        uid != null) {
      body = HostResponsesQueryWorkspace(
        organizerId: widget.organizerId,
        formId: formId,
        versionId: versionId,
        accountId: uid,
        now: widget.now,
        onExit: () => setState(() => _queryOpen = false),
        onOpenResponse: (responseId) => context.pushNamed(
          Routes.hostFormResponseDetailScreen.name,
          pathParameters: {'responseId': responseId},
          queryParameters: {'organizerId': widget.organizerId},
        ),
        onOffer: (query) => context.pushNamed<void>(
          Routes.hostResponseQueryOfferScreen.name,
          pathParameters: {'formId': formId},
          queryParameters: {'organizerId': widget.organizerId},
          extra: query,
        ),
      );
    } else {
      body = HostResponsesBody(
        state: state,
        now: widget.now ?? DateTime.now(),
        onView: (view) {
          if (view == HostResponsesView.questions) {
            context.pushNamed(
              Routes.hostFormBuilderScreen.name,
              pathParameters: {'formId': formId!},
              queryParameters: {
                'organizerId': widget.organizerId,
                'view': 'questions',
              },
            );
            return;
          }
          setState(() => _view = view);
        },
        onFilter: (status) => _change(() => _filterChoice = status),
        onSort: _chooseSort,
        onFilters: formId == null ? null : _openFilters,
        onClearFilters: _filterCount == 0 ? null : _clearFilters,
        onOpenQuery: versionId == null
            ? null
            : () => setState(() => _queryOpen = true),
        onOpen: (entry) => _open(
          entry,
          request,
          state.entries.indexWhere((item) => item.entryId == entry.entryId),
        ),
        onLoadMore: () {
          if (request == null) return;
          unawaited(
            ref
                .read(hostFormResponsesControllerProvider(request).notifier)
                .loadMore(),
          );
        },
      );
    }
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: form?.title ?? l10n.hostFormsResponsesTitle,
          kicker: form == null
              ? null
              : l10n.hostFormsResponsesKicker(
                  kind: hostFormKindLabel(l10n, form.purpose),
                  count: form.submittedResponseCount,
                ),
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          action: formId == null
              ? null
              : CatchTopBarAction(
                  label: l10n.hostFormsShareTitle,
                  onPressed: () => context.pushNamed(
                    Routes.hostFormShareScreen.name,
                    pathParameters: {'formId': formId},
                    queryParameters: {'organizerId': widget.organizerId},
                  ),
                ),
        ),
        body: body,
      ),
    );
  }

  CatchAsyncState<HostFormResponsesState>? _responses(
    HostFormResponseListRequest? request,
  ) => request == null
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(hostFormResponsesControllerProvider(request)),
        );

  CatchAsyncState<HostFormAnalytics>? _results(String? versionId) {
    final formId = widget.formId;
    if (formId == null || versionId == null) return null;
    return catchAsyncStateFromAsyncValue(
      ref.watch(
        hostFormAnalyticsProvider(
          organizerId: widget.organizerId,
          formId: formId,
          versionId: versionId,
        ),
      ),
    );
  }

  HostFormResponseListRequest _request(
    String uid,
    HostResponsesFilter filter,
  ) => HostFormResponseListRequest(
    organizerId: widget.organizerId,
    accountUid: uid,
    formId: widget.formId,
    includeApplications: true,
    reviewStatus: filter.reviewStatus,
    offeredOnly: filter == HostResponsesFilter.offered,
    versionId: widget.formId == null ? null : _versionId,
    answerFilters: Map.unmodifiable(_answers),
    oldestFirst: _oldestFirst,
  );

  /// Keeps the version scope and answer filter options the last page
  /// reported, and lists the live version once it is first known.
  void _remember(
    HostFormResponsesState? page,
    HostFormResponseListRequest? request,
  ) {
    if (page == null || request == null || widget.formId == null) return;
    if (page.versionScope case final scope?) _scope = scope;
    _options = page.answerFilterOptions;
    final live = _scope?.activeVersionId;
    if (!_versionResolved && live != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _versionResolved) return;
        _change(() {
          _versionId = live;
          _versionResolved = true;
        });
      });
    }
  }

  /// A version id's number, as in form_v3 for version 3.
  static int _versionNumber(String id) =>
      int.tryParse(id.split('_v').last) ?? 0;

  HostResponsesVersion? get _version {
    final scope = _scope;
    if (widget.formId == null || scope?.activeVersionId == null) return null;
    return HostResponsesVersion(
      published: scope!.publishedVersion,
      selected: _versionId == null ? null : _versionNumber(_versionId!),
    );
  }

  /// A version other than the live one counts as a filter, as do answers.
  int get _filterCount =>
      _answers.length +
      (_versionResolved && _versionId != _scope?.activeVersionId ? 1 : 0);

  String? _summary(AppLocalizations l10n) {
    final parts = [
      if (_versionResolved && _versionId != _scope?.activeVersionId)
        _versionId == null
            ? l10n.hostFormsResponsesAllVersions
            : l10n.hostFormsResponsesVersion(
                version: _versionNumber(_versionId!),
              ),
      for (final entry
          in _answers.entries.toList()..sort((a, b) => a.key.compareTo(b.key)))
        for (final option in _options.where(
          (option) => option.questionId == entry.key,
        ))
          '${option.label}: ${(entry.value.toList()..sort()).map((value) => option.options[value] ?? value).join(', ')}',
    ];
    return parts.isEmpty ? null : parts.join(' · ');
  }

  void _clearFilters() => _change(() {
    _answers.clear();
    _versionId = _scope?.activeVersionId;
    _versionResolved = true;
  });

  Future<void> _chooseSort() async {
    final l10n = context.l10n;
    final oldest = await showCatchSelectionSheet<bool>(
      context: context,
      title: l10n.hostCustomersSort,
      value: _oldestFirst,
      items: [
        CatchSelectionMenuItem(
          value: false,
          label: l10n.hostApplicationsSortNewest,
        ),
        CatchSelectionMenuItem(
          value: true,
          label: l10n.hostApplicationsSortOldest,
        ),
      ],
    );
    if (oldest != null && mounted) _change(() => _oldestFirst = oldest);
  }

  Future<void> _openFilters() => showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => ValueListenableBuilder<int>(
      valueListenable: _revision,
      builder: (context, _, _) => HostResponsesFilterSheet(
        version: _version,
        options: _options,
        answers: Map.unmodifiable(_answers),
        onVersion: (number) => _change(() {
          _versionId = number == null ? null : '${widget.formId}_v$number';
          _versionResolved = true;
          // Another version asks other questions; its options load anew.
          _answers.clear();
          _options = const [];
        }),
        onAnswers: (questionId, values) => _change(() {
          if (values.isEmpty) {
            _answers.remove(questionId);
          } else {
            _answers[questionId] = Set.unmodifiable(values);
          }
        }),
        onReset: _filterCount == 0 ? null : _clearFilters,
      ),
    ),
  );

  void _open(
    HostFormInboxEntry entry,
    HostFormResponseListRequest? request,
    int index,
  ) {
    final queue = request == null
        ? null
        : HostResponsesQueue(
            request: request,
            entryId: entry.entryId,
            index: index,
          );
    if (entry.application case final application?) {
      context.pushNamed(
        Routes.hostApplicationDetailScreen.name,
        pathParameters: {'applicationId': application.applicationId},
        queryParameters: {'organizerId': widget.organizerId},
        extra: queue,
      );
    } else if (entry.response case final response?) {
      context.pushNamed(
        Routes.hostFormResponseDetailScreen.name,
        pathParameters: {'responseId': response.responseId},
        queryParameters: {'organizerId': widget.organizerId},
        extra: queue,
      );
    }
  }
}
