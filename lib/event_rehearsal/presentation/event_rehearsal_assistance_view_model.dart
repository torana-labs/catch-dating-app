import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_assistance_view_model.g.dart';

final class RehearsalAssistanceReview {
  RehearsalAssistanceReview._(this.account, this.snapshot);
  final AuthenticatedSession account;
  final EventRehearsalBootstrap snapshot;
  bool _current = true;
  bool get isCurrent => _current;
}

const rehearsalReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload this rehearsal before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review rehearsal assistance',
    resource: 'eventRehearsals',
  ),
);
const rehearsalReviewExpired = BackendOperationException(
  code: 'review-changed',
  message:
      'Reload this rehearsal and review the current run before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review rehearsal assistance',
    resource: 'eventRehearsals',
  ),
);

void requireRehearsalReviewAccount(Ref ref, AuthenticatedSession expected) {
  if (!ref.mounted) throw rehearsalReviewSessionChanged;
  final account = ref.read(authenticatedSessionProvider);
  if (account.isLoading ||
      account.hasError ||
      !identical(account.asData?.value, expected)) {
    throw rehearsalReviewSessionChanged;
  }
}

/// A deliberate review fetch, separate from the constantly polling runtime.
@riverpod
class EventRehearsalAssistance extends _$EventRehearsalAssistance {
  @override
  AsyncValue<RehearsalAssistanceReview> build(
    String sessionId, {
    String? practiceOperatorId,
  }) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const AsyncLoading();
    }
    if (authState.error != null) {
      return AsyncError(authState.error!, authState.stackTrace!);
    }
    final page = ref.watch(
      eventRehearsalAssistanceForAccountProvider(
        sessionId,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
        practiceOperatorId: practiceOperatorId,
      ),
    );
    final pageState = catchAsyncStateFromAsyncValue(page);
    if ((pageState.isLoading || pageState.isRefreshing || pageState.retrying)) {
      return const AsyncLoading();
    }
    if (pageState.error != null) {
      return AsyncError(pageState.error!, pageState.stackTrace!);
    }
    return page;
  }

  void reload() {
    final auth = ref.read(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    ref.invalidate(
      eventRehearsalAssistanceForAccountProvider(
        sessionId,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
        practiceOperatorId: practiceOperatorId,
      ),
    );
  }
}

@Riverpod(retry: _noReviewRetry)
Future<RehearsalAssistanceReview> eventRehearsalAssistanceForAccount(
  Ref ref,
  String sessionId, {
  required AuthenticatedSession account,
  String? practiceOperatorId,
}) async {
  ref.watch(authenticatedSessionProvider);
  requireRehearsalReviewAccount(ref, account);
  final repository = ref.watch(eventRehearsalRepositoryProvider);
  final snapshot = practiceOperatorId == null
      ? await repository.fetch(sessionId)
      : await repository.fetchPracticeRole(
          sessionId: sessionId,
          practiceOperatorId: practiceOperatorId,
          hostUid: account.uid,
        );
  requireRehearsalReviewAccount(ref, account);
  if (snapshot.session.id != sessionId ||
      snapshot.staffReview?.practiceOperatorId != practiceOperatorId ||
      snapshot.staffReview != null &&
          snapshot.staffReview!.hostUid != account.uid) {
    throw const FormatException(
      'Rehearsal review returned a different session.',
    );
  }
  if (snapshot.helpRequests?.managerOptions case final choices?) {
    if (choices.actorUid != account.uid) {
      throw const FormatException(
        'Practice help choices belong to another Host.',
      );
    }
  }
  final review = RehearsalAssistanceReview._(account, snapshot);
  ref.onDispose(() => review._current = false);
  return review;
}

Duration? _noReviewRetry(int retryCount, Object error) => null;
