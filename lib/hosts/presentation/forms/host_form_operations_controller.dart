import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_automation_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_operations_controller.g.dart';

@immutable
class HostFormResponsesState {
  const HostFormResponsesState({
    required this.responses,
    this.entries,
    required this.nextCursor,
    this.liveHasMore = false,
    this.answerFilterOptions = const [],
    this.versionScope,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostFormResponseSummary> responses;
  final List<HostFormInboxEntry>? entries;
  List<HostFormInboxEntry> get inboxEntries =>
      entries ??
      responses.map(HostFormInboxEntry.fromResponse).toList(growable: false);
  final String? nextCursor;

  /// Whether live pages have another page after the ones listened to.
  final bool liveHasMore;
  final List<HostFormResponseFilterOption> answerFilterOptions;
  final HostFormResponseVersionScope? versionScope;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => (nextCursor != null || liveHasMore) && !loadingMore;

  HostFormResponsesState copyWith({
    List<HostFormResponseSummary>? responses,
    String? nextCursor,
    bool clearNextCursor = false,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostFormResponsesState(
    responses: responses ?? this.responses,
    entries: entries,
    answerFilterOptions: answerFilterOptions,
    versionScope: versionScope,
    nextCursor: clearNextCursor ? null : nextCursor ?? this.nextCursor,
    liveHasMore: liveHasMore,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}

/// A response request's entries, a page at a time, every row shown live.
/// Each page is its own listener, so asking for more reads only the new
/// page.
@riverpod
class HostFormResponsePages extends _$HostFormResponsePages {
  late LivePager<HostFormInboxEntry> _pager;

  @override
  Stream<LivePages<HostFormInboxEntry>> build(
    HostFormResponseListRequest request,
  ) {
    _pager = ref
        .watch(hostFormsRepositoryProvider)
        .watchResponsePages(request, pageSize: request.limit);
    return _pager.pages;
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}

/// A form page's version scope and answer filter options, read once. Shared
/// by every sort, status and date slice of the same form page.
@riverpod
Future<HostFormResponseScope?> hostFormResponseScope(
  Ref ref,
  HostFormResponseScopeKey key,
) => ref.watch(hostFormsRepositoryProvider).responseScope(key);

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows open one more page listener. Answer, identity, contact and text
/// filters page through the callable, their recorded search exception.
@riverpod
class HostFormResponsesController extends _$HostFormResponsesController {
  // Not replaceable by `ref.mounted` (checked in Riverpod 3.5 source): a
  // notifier's `ref` is its element's *current* ref, and a rebuild only swaps
  // in a new one, so `mounted` stays true across a rebuild and goes false only
  // on dispose. A `loadMore` that began before a rebuild (new filters, an
  // invalidation) would otherwise write its page into the new state. The
  // generation bumps on every build and dispose, so it also catches that.
  int _generation = 0;

  @override
  Future<HostFormResponsesState> build(HostFormResponseListRequest request) {
    ++_generation;
    ref.onDispose(() => ++_generation);
    return HostResponseSummaryReads.supports(request)
        ? _watchPages()
        : _loadInitial();
  }

  Future<HostFormResponsesState> _watchPages() async {
    final scopeKey = HostResponseSummaryReads.scopeKey(request);
    final scope = scopeKey == null
        ? null
        : await ref.watch(hostFormResponseScopeProvider(scopeKey).future);
    final pages = await ref.watch(
      hostFormResponsePagesProvider(request).future,
    );
    return HostFormResponsesState(
      responses: List.unmodifiable(
        pages.items.map((entry) => entry.response).nonNulls,
      ),
      entries: request.includeApplications ? pages.items : null,
      answerFilterOptions: scope?.answerFilterOptions ?? const [],
      versionScope: scope?.versionScope,
      nextCursor: null,
      liveHasMore: pages.hasMore,
      loadingMore: pages.loadingMore,
      loadMoreError: pages.nextPageError,
    );
  }

  Future<HostFormResponsesState> _loadInitial() async {
    final page = await ref
        .read(hostFormsRepositoryProvider)
        .listResponses(request);
    return HostFormResponsesState(
      responses: page.items,
      entries: page.entries,
      answerFilterOptions: page.answerFilterOptions,
      versionScope: page.versionScope,
      nextCursor: page.nextCursor,
    );
  }

  /// Reads the list again after a failure. A live list opens its listener
  /// again too, so a failed listener is not handed back as it was.
  void retry() {
    if (HostResponseSummaryReads.supports(request)) {
      ref.invalidate(hostFormResponsePagesProvider(request));
      final scopeKey = HostResponseSummaryReads.scopeKey(request);
      if (scopeKey != null) {
        ref.invalidate(hostFormResponseScopeProvider(scopeKey));
      }
    }
    ref.invalidateSelf();
  }

  Future<void> loadMore() async {
    final generation = _generation;
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    if (HostResponseSummaryReads.supports(request)) {
      ref.read(hostFormResponsePagesProvider(request).notifier).loadMore();
      return;
    }
    state = AsyncData(
      current.copyWith(loadingMore: true, clearLoadMoreError: true),
    );
    try {
      final page = await ref
          .read(hostFormsRepositoryProvider)
          .listResponses(request.copyWith(cursor: current.nextCursor));
      if (!ref.mounted || generation != _generation) return;
      final byId = <String, HostFormResponseSummary>{
        for (final response in current.responses) response.responseId: response,
        for (final response in page.items) response.responseId: response,
      };
      final entries = <String, HostFormInboxEntry>{
        for (final entry in current.inboxEntries) entry.entryId: entry,
        for (final entry
            in page.entries ?? page.items.map(HostFormInboxEntry.fromResponse))
          entry.entryId: entry,
      };
      state = AsyncData(
        HostFormResponsesState(
          responses: List.unmodifiable(byId.values),
          entries: List.unmodifiable(entries.values),
          answerFilterOptions: page.answerFilterOptions,
          versionScope: page.versionScope ?? current.versionScope,
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreError: error),
      );
    }
  }
}

@riverpod
Future<HostFormResponseDetail> hostFormResponseDetail(
  Ref ref, {
  required String organizerId,
  required String responseId,
}) => ref
    .read(hostFormsRepositoryProvider)
    .getResponseDetail(organizerId: organizerId, responseId: responseId);

/// A read-back before a command: the server's current version of one of
/// [organizerId]'s responses, never a kept one.
@riverpod
Future<HostFormResponseDetail> Function(String responseId)
hostFormResponseReadBack(Ref ref, String organizerId) {
  final repository = ref.watch(hostFormsRepositoryProvider);
  return (responseId) => repository.getResponseDetail(
    organizerId: organizerId,
    responseId: responseId,
  );
}

/// Applies the immutable response version's server-side conversion rules.
@riverpod
Future<bool> hostFormResponseCanApply(
  Ref ref, {
  required String organizerId,
  required String responseId,
}) async {
  final preview = await ref
      .read(hostFormsRepositoryProvider)
      .previewConversion(
        organizerId: organizerId,
        responseId: responseId,
        kind: HostFormConversionKind.application,
      );
  return preview.allowed;
}

/// One published version's analytics, live from its trigger-kept views:
/// a new open, start or submission shows without a refresh.
@riverpod
Stream<HostFormAnalytics> hostFormAnalytics(
  Ref ref, {
  required String organizerId,
  required String formId,
  required String versionId,
}) => ref
    .watch(hostFormsRepositoryProvider)
    .watchAnalytics(
      organizerId: organizerId,
      formId: formId,
      versionId: versionId,
    );

@immutable
class HostFormAutomationsState {
  const HostFormAutomationsState({
    required this.rules,
    required this.runs,
    required this.hasMore,
    this.loadingMore = false,
    this.mutatingRuleIds = const {},
    this.error,
  });

  final List<HostFormAutomationRule> rules;
  final List<HostFormAutomationRun> runs;

  /// Whether older runs follow; stays true after a failed page so asking
  /// again retries it.
  final bool hasMore;
  final bool loadingMore;
  final Set<String> mutatingRuleIds;
  final Object? error;

  bool get canLoadMore => hasMore && !loadingMore;
}

/// The automation rules and run history of an organizer, or of one form
/// when `formId` is set, from listeners: a rule saved or switched elsewhere
/// and a run that finishes show at once. Saves and switches stay on the
/// revision-fenced callables; a saved rule shows at once and gives way to
/// its view when the view reaches that revision.
@riverpod
class HostFormAutomationsController extends _$HostFormAutomationsController {
  List<HostFormAutomationRule> _rules = const [];
  LivePages<HostFormAutomationRun> _runs = const LivePages(
    items: [],
    hasMore: false,
  );
  Set<String> _mutating = const {};
  Object? _error;
  final _saved = <String, HostFormAutomationRule>{};

  @override
  Future<HostFormAutomationsState> build(
    String organizerId,
    String? formId,
  ) async {
    _rules = await ref.watch(
      hostFormAutomationRulesProvider(organizerId, formId).future,
    );
    _runs = await ref.watch(
      hostFormAutomationRunPagesProvider(organizerId, formId).future,
    );
    return _compose();
  }

  HostFormAutomationsState _compose() {
    final viewed = {for (final rule in _rules) rule.ruleId: rule};
    _saved.removeWhere(
      (ruleId, saved) => (viewed[ruleId]?.revision ?? 0) >= saved.revision,
    );
    return HostFormAutomationsState(
      rules: List.unmodifiable([
        for (final saved in _saved.values)
          if (!viewed.containsKey(saved.ruleId)) saved,
        for (final rule in _rules) _saved[rule.ruleId] ?? rule,
      ]),
      runs: _runs.items,
      hasMore: _runs.hasMore,
      loadingMore: _runs.loadingMore,
      mutatingRuleIds: _mutating,
      error: _error ?? _runs.nextPageError,
    );
  }

  void _publish() {
    if (state.hasValue) state = AsyncData(_compose());
  }

  void _keep(HostFormAutomationRule saved) {
    if (formId == null || saved.formId == formId) _saved[saved.ruleId] = saved;
  }

  /// Opens the next page of runs, or retries the one that failed.
  void loadMore() {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    _error = null;
    ref
        .read(hostFormAutomationRunPagesProvider(organizerId, formId).notifier)
        .loadMore();
  }

  Future<bool> setEnabled(HostFormAutomationRule rule, bool enabled) async {
    if (!state.hasValue || _mutating.contains(rule.ruleId)) return false;
    _mutating = {..._mutating, rule.ruleId};
    _error = null;
    _publish();
    try {
      final updated = await ref
          .read(hostFormsRepositoryProvider)
          .setAutomationEnabled(
            organizerId: organizerId,
            ruleId: rule.ruleId,
            expectedRevision: rule.revision,
            enabled: enabled,
          );
      if (!ref.mounted) return true;
      _keep(updated);
      _mutating = {..._mutating}..remove(rule.ruleId);
      _publish();
      return true;
    } on Object catch (error) {
      if (!ref.mounted) return false;
      _mutating = {..._mutating}..remove(rule.ruleId);
      _error = error;
      _publish();
      return false;
    }
  }

  Future<HostFormAutomationRule> saveRule({
    required String requestId,
    required String name,
    required bool enabled,
    required HostFormAutomationTrigger trigger,
    required List<Map<String, Object?>> actions,
    required String? selectedFormId,
    String? triggerEventId,
    int delayMinutes = 0,
    Map<String, Object?>? condition,
    HostFormAutomationRule? existing,
  }) async {
    final saved = await ref
        .read(hostFormsRepositoryProvider)
        .saveAutomation(
          organizerId: organizerId,
          formId: selectedFormId,
          requestId: requestId,
          name: name,
          enabled: enabled,
          trigger: trigger,
          actions: actions,
          triggerEventId: triggerEventId,
          delayMinutes: delayMinutes,
          condition: condition,
          ruleId: existing?.ruleId,
          expectedRevision: existing?.revision,
        );
    if (ref.mounted) {
      _keep(saved);
      _error = null;
      _publish();
    }
    return saved;
  }

  Future<HostCampaign> inspectMessage(String campaignId) => ref
      .read(hostCampaignRepositoryProvider)
      .getCampaignReport(organizerId, campaignId);

  Future<bool> createPreset({
    required String name,
    required HostFormAutomationTrigger trigger,
    required List<HostFormAutomationActionKind> actions,
  }) async {
    if (!state.hasValue) return false;
    const mutationId = 'new';
    _mutating = {..._mutating, mutationId};
    _error = null;
    _publish();
    try {
      final requestId = 'automation_${DateTime.now().microsecondsSinceEpoch}';
      final saved = await ref
          .read(hostFormsRepositoryProvider)
          .saveAutomation(
            organizerId: organizerId,
            formId: formId,
            requestId: requestId,
            name: name,
            enabled: true,
            trigger: trigger,
            actions: [
              for (var index = 0; index < actions.length; index++)
                {
                  'actionId': 'action_${requestId}_$index',
                  'kind': actions[index].name,
                  'tagId': null,
                  'eventId': null,
                  'webhookUrl': null,
                  'webhookSecret': null,
                  'channel': null,
                },
            ],
          );
      if (!ref.mounted) return true;
      _keep(saved);
      _mutating = {..._mutating}..remove(mutationId);
      _publish();
      return true;
    } on Object catch (error) {
      if (!ref.mounted) return false;
      _mutating = {..._mutating}..remove(mutationId);
      _error = error;
      _publish();
      return false;
    }
  }
}

@immutable
class HostAutomationMessagesState {
  const HostAutomationMessagesState({
    required this.messages,
    this.hasMore = false,
    this.loadingMore = false,
    this.error,
  });
  final List<HostCampaignSendSummary> messages;

  /// Whether more drafts follow; true after a failed page so asking again
  /// retries it.
  final bool hasMore;
  final bool loadingMore;

  /// Why the next page failed; the drafts shown stay.
  final Object? error;
}

/// The draft campaigns an automation can hand off to, a page at a time and
/// live, so a draft saved in Sends shows here at once. A draft that is
/// already scheduled is left out.
@riverpod
class HostAutomationMessagesController
    extends _$HostAutomationMessagesController {
  late LivePager<HostCampaignSendSummary> _pager;

  @override
  Stream<HostAutomationMessagesState> build(String organizerId) {
    _pager = ref
        .watch(hostCampaignRepositoryProvider)
        .watchDraftCampaigns(organizerId);
    return _pager.pages.map(
      (pages) => HostAutomationMessagesState(
        messages: List.unmodifiable(
          pages.items.where((campaign) => campaign.scheduledAt == null),
        ),
        hasMore: pages.hasMore,
        loadingMore: pages.loadingMore,
        error: pages.nextPageError,
      ),
    );
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}
