import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
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

@riverpod
Future<HostFormAnalytics> hostFormAnalytics(
  Ref ref, {
  required String organizerId,
  required String formId,
  String? versionId,
}) => ref
    .read(hostFormsRepositoryProvider)
    .getAnalytics(
      organizerId: organizerId,
      formId: formId,
      versionId: versionId,
    );

@immutable
class HostFormAutomationsState {
  const HostFormAutomationsState({
    required this.rules,
    required this.runs,
    required this.nextCursor,
    this.loadingMore = false,
    this.mutatingRuleIds = const {},
    this.error,
  });

  final List<HostFormAutomationRule> rules;
  final List<HostFormAutomationRun> runs;
  final String? nextCursor;
  final bool loadingMore;
  final Set<String> mutatingRuleIds;
  final Object? error;

  bool get canLoadMore => nextCursor != null && !loadingMore;

  HostFormAutomationsState copyWith({
    List<HostFormAutomationRule>? rules,
    List<HostFormAutomationRun>? runs,
    String? nextCursor,
    bool clearNextCursor = false,
    bool? loadingMore,
    Set<String>? mutatingRuleIds,
    Object? error,
    bool clearError = false,
  }) => HostFormAutomationsState(
    rules: rules ?? this.rules,
    runs: runs ?? this.runs,
    nextCursor: clearNextCursor ? null : nextCursor ?? this.nextCursor,
    loadingMore: loadingMore ?? this.loadingMore,
    mutatingRuleIds: mutatingRuleIds ?? this.mutatingRuleIds,
    error: clearError ? null : error ?? this.error,
  );
}

@riverpod
class HostFormAutomationsController extends _$HostFormAutomationsController {
  @override
  Future<HostFormAutomationsState> build(
    String organizerId,
    String? formId,
  ) async {
    final page = await ref
        .read(hostFormsRepositoryProvider)
        .listAutomations(organizerId: organizerId, formId: formId);
    return _fromPage(page);
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final page = await ref
          .read(hostFormsRepositoryProvider)
          .listAutomations(
            organizerId: organizerId,
            formId: formId,
            cursor: current.nextCursor,
          );
      final byId = <String, HostFormAutomationRun>{
        for (final run in current.runs) run.runId: run,
        for (final run in page.runs) run.runId: run,
      };
      state = AsyncData(
        current.copyWith(
          rules: page.rules,
          runs: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor,
          clearNextCursor: page.nextCursor == null,
          loadingMore: false,
        ),
      );
    } on Object catch (error) {
      state = AsyncData(current.copyWith(loadingMore: false, error: error));
    }
  }

  Future<bool> setEnabled(HostFormAutomationRule rule, bool enabled) async {
    final current = state.asData?.value;
    if (current == null || current.mutatingRuleIds.contains(rule.ruleId)) {
      return false;
    }
    state = AsyncData(
      current.copyWith(
        mutatingRuleIds: {...current.mutatingRuleIds, rule.ruleId},
        clearError: true,
      ),
    );
    try {
      final updated = await ref
          .read(hostFormsRepositoryProvider)
          .setAutomationEnabled(
            organizerId: organizerId,
            ruleId: rule.ruleId,
            expectedRevision: rule.revision,
            enabled: enabled,
          );
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          rules: [
            for (final candidate in latest.rules)
              if (candidate.ruleId == updated.ruleId) updated else candidate,
          ],
          mutatingRuleIds: {...latest.mutatingRuleIds}..remove(rule.ruleId),
          clearError: true,
        ),
      );
      return true;
    } on Object catch (error) {
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          mutatingRuleIds: {...latest.mutatingRuleIds}..remove(rule.ruleId),
          error: error,
        ),
      );
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
    final current = state.asData?.value;
    if (current != null) {
      state = AsyncData(
        current.copyWith(
          rules: [
            saved,
            ...current.rules.where((rule) => rule.ruleId != saved.ruleId),
          ],
          clearError: true,
        ),
      );
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
    final current = state.asData?.value;
    if (current == null) return false;
    const mutationId = 'new';
    state = AsyncData(
      current.copyWith(
        mutatingRuleIds: {...current.mutatingRuleIds, mutationId},
        clearError: true,
      ),
    );
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
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          rules: [saved, ...latest.rules],
          mutatingRuleIds: {...latest.mutatingRuleIds}..remove(mutationId),
          clearError: true,
        ),
      );
      return true;
    } on Object catch (error) {
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          mutatingRuleIds: {...latest.mutatingRuleIds}..remove(mutationId),
          error: error,
        ),
      );
      return false;
    }
  }

  HostFormAutomationsState _fromPage(HostFormAutomationPage page) =>
      HostFormAutomationsState(
        rules: page.rules,
        runs: page.runs,
        nextCursor: page.nextCursor,
      );
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
