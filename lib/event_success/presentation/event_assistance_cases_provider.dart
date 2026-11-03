import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_cases_provider.g.dart';

/// The pages one listener subscription has delivered: only the latest is
/// current, and none is once the subscription ends.
final class _CasesFeed {
  EventAssistanceCasesSession? latest;
  bool open = true;
}

final class EventAssistanceCasesSession {
  EventAssistanceCasesSession._(this.account, this.page, this._feed);
  final _CasesFeed _feed;

  /// Whether this is the newest page its listener has delivered.
  bool get isCurrent => _feed.open && identical(_feed.latest, this);
  final EventAssistanceAccount account;
  final EventAssistanceCasesPage page;

  EventAssistanceCaseReview review(AssistanceOpenHostCase request) {
    if (!isCurrent || !page.cases.any((row) => identical(row, request))) {
      throw ArgumentError('Review a request from this page snapshot.');
    }
    return EventAssistanceCaseReview._(this, request);
  }
}

final class EventAssistanceCaseReview {
  const EventAssistanceCaseReview._(this.session, this.request);
  final EventAssistanceCasesSession session;
  EventAssistanceAccount get account => session.account;

  /// A review outlives later pages while its request is unchanged in the
  /// newest one: same case, still open, same revision and source hash.
  bool get isCurrent {
    final feed = session._feed;
    final latest = feed.latest;
    if (!feed.open || latest == null) return false;
    if (identical(latest, session)) return true;
    return latest.page.cases.any(
      (row) =>
          row is AssistanceOpenHostCase &&
          row.scope == request.scope &&
          row.revision == request.revision &&
          row.sourceHash == request.sourceHash,
    );
  }

  final AssistanceOpenHostCase request;
}

const caseReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload help requests before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review guest help request',
    resource: 'eventAssistanceCases',
  ),
);

void requireCaseReviewAccount(Ref ref, EventAssistanceAccount expected) {
  if (!ref.mounted) throw caseReviewSessionChanged;
  final current = ref.read(eventAssistanceAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw caseReviewSessionChanged;
  }
}

@riverpod
class EventAssistanceCases extends _$EventAssistanceCases {
  @override
  AsyncValue<EventAssistanceCasesSession> build(
    EventAssistanceCaseQuery query,
  ) {
    final auth = ref.watch(eventAssistanceAccountProvider);
    return auth.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: false,
      skipError: false,
      loading: () => const AsyncLoading(),
      error: (error, stackTrace) => AsyncError(error, stackTrace),
      data: (account) {
        final page = ref.watch(
          eventAssistanceCasesForAccountProvider(query, account: account),
        );
        final pageState = catchAsyncStateFromAsyncValue(page);
        if ((pageState.isLoading ||
            pageState.isRefreshing ||
            pageState.retrying)) {
          return const AsyncLoading();
        }
        if (pageState.error != null) {
          return AsyncError(pageState.error!, pageState.stackTrace!);
        }
        return page;
      },
    );
  }

  /// Restarts the listener only when it ended in an error: a healthy
  /// listener already delivers every change.
  void reload() {
    final account = ref.read(eventAssistanceAccountProvider);
    if (account.isLoading || account.hasError || account.asData == null) return;
    // With a settled account, an error here is the listener's own.
    if (!state.hasError) return;
    ref.invalidate(
      eventAssistanceCasesForAccountProvider(
        query,
        account: account.requireValue,
      ),
    );
  }
}

/// The help-request page read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and commands never invalidate it; the case view
/// triggers deliver their result.
@Riverpod(retry: _noCaseReadRetry)
Stream<EventAssistanceCasesSession> eventAssistanceCasesForAccount(
  Ref ref,
  EventAssistanceCaseQuery query, {
  required EventAssistanceAccount account,
}) {
  ref.watch(eventAssistanceAccountProvider);
  requireCaseReviewAccount(ref, account);
  final feed = _CasesFeed();
  ref.onDispose(() => feed.open = false);
  return ref
      .watch(eventAssistanceCasesRepositoryProvider)
      .watchPage(query, actorUid: account.uid)
      .map((page) {
        requireCaseReviewAccount(ref, account);
        if (page.managerOptions != null &&
            page.managerOptions!.actorUid != account.uid) {
          throw const FormatException(
            'Guest-help choices belong to another manager.',
          );
        }
        return feed.latest = EventAssistanceCasesSession._(account, page, feed);
      });
}

Duration? _noCaseReadRetry(int retryCount, Object error) => null;
