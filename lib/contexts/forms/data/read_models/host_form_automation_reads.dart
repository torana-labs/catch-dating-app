import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_automation_reads.g.dart';

/// Automation rules and their runs from `hostFormAutomationRuleViews` and
/// `hostFormAutomationRunViews`, as listeners: a rule saved or switched,
/// and a run queued, finished or retried, shows at once. Rules authorize
/// every read; saves stay on the revision-fenced automation callables.
class HostFormAutomationReads {
  const HostFormAutomationReads(this.reader);
  final ScopedReadModelReader reader;

  static const ruleViews = 'hostFormAutomationRuleViews';
  static const runViews = 'hostFormAutomationRunViews';

  /// Every rule of the organizer, or of one form when [formId] is set, in
  /// rule id order. Rules are a small working set the automation commands
  /// cap, so one bounded listener reads them all.
  // firestore-index: hostFormAutomationRuleViews(organizerId:ASCENDING, ruleId:ASCENDING, __name__:ASCENDING)
  // firestore-index: hostFormAutomationRuleViews(organizerId:ASCENDING, formId:ASCENDING, ruleId:ASCENDING, __name__:ASCENDING)
  Stream<List<HostFormAutomationRule>> watchRules(
    String organizerId,
    String? formId,
  ) => reader
      .watchWindow(
        collection: ruleViews,
        scopeId: organizerId,
        orderField: 'ruleId',
        descending: false,
        limit: ReadLimitPolicy.boundedWorkingSet,
        equalities: {'formId': ?formId},
      )
      .map((window) {
        if (window.hasMore) {
          throw StateError('Too many automations to show.');
        }
        return List.unmodifiable(
          window.documents.map(
            (doc) => HostFormAutomationRule.fromMap(
              formOperationRequiredMap(doc['row'], 'automation rule'),
            ),
          ),
        );
      });

  /// The runs of the organizer, or of one form when [formId] is set, newest
  /// first, [pageSize] at a time, every row shown kept live.
  // firestore-index: hostFormAutomationRunViews(organizerId:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  // firestore-index: hostFormAutomationRunViews(organizerId:ASCENDING, formId:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  LivePager<HostFormAutomationRun> watchRunPages(
    String organizerId,
    String? formId, {
    int pageSize = ReadLimitPolicy.historyPage,
  }) => reader
      .watchPages(
        collection: runViews,
        scopeId: organizerId,
        orderField: 'createdAtMillis',
        descending: true,
        pageSize: pageSize,
        equalities: {'formId': ?formId},
      )
      .map(
        (doc) => HostFormAutomationRun.fromMap(
          formOperationRequiredMap(doc['row'], 'automation run'),
          ruleName: formOperationNullableString(doc['ruleName']),
        ),
      );
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons; the reader checks the signed-in account on every read and rules
// authorize it.
@Riverpod(keepAlive: true)
HostFormAutomationReads hostFormAutomationReads(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostFormAutomationReads(
    ScopedReadModelReader(
      ref.watch(firebaseFirestoreProvider),
      family: hostReadModels,
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
  );
}

/// The organizer's automation rules, or one form's, kept live.
@riverpod
Stream<List<HostFormAutomationRule>> hostFormAutomationRules(
  Ref ref,
  String organizerId,
  String? formId,
) => ref.watch(hostFormAutomationReadsProvider).watchRules(organizerId, formId);

/// The organizer's automation runs, or one form's, a page at a time, every
/// row shown live.
@riverpod
class HostFormAutomationRunPages extends _$HostFormAutomationRunPages {
  late LivePager<HostFormAutomationRun> _pager;

  @override
  Stream<LivePages<HostFormAutomationRun>> build(
    String organizerId,
    String? formId,
  ) {
    _pager = ref
        .watch(hostFormAutomationReadsProvider)
        .watchRunPages(organizerId, formId);
    return _pager.pages;
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}
