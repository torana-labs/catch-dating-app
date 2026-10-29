import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_disposition_provider.g.dart';

/// One server review within an uninterrupted authenticated session.
final class EventAttendanceDispositionReview {
  const EventAttendanceDispositionReview._(this.account, this.view);
  final EventAssistanceAccount account;
  final EventAttendanceDispositionView view;
}

const attendanceReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload attendance before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review attendance closeout',
    resource: 'eventAttendanceDispositions',
  ),
);

void requireAttendanceReviewAccount(Ref ref, EventAssistanceAccount expected) {
  if (!ref.mounted) throw attendanceReviewSessionChanged;
  final current = ref.read(eventAssistanceAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw attendanceReviewSessionChanged;
  }
}

@riverpod
class EventAttendanceDisposition extends _$EventAttendanceDisposition {
  @override
  AsyncValue<EventAttendanceDispositionReview> build(
    EventAssistanceGuestScope scope,
  ) {
    final auth = ref.watch(eventAssistanceAccountProvider);
    return auth.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: false,
      skipError: false,
      loading: () => const AsyncLoading(),
      error: (error, stackTrace) => AsyncError(error, stackTrace),
      data: (account) {
        final result = ref.watch(
          eventAttendanceDispositionForAccountProvider(scope, account: account),
        );
        final resultState = catchAsyncStateFromAsyncValue(result);
        if ((resultState.isLoading ||
            resultState.isRefreshing ||
            resultState.retrying)) {
          return const AsyncLoading();
        }
        if (resultState.error != null) {
          return AsyncError(resultState.error!, resultState.stackTrace!);
        }
        return result;
      },
    );
  }

  void reload() {
    final account = ref.read(eventAssistanceAccountProvider);
    if (account.isLoading || account.hasError || account.asData == null) return;
    ref.invalidate(
      eventAttendanceDispositionForAccountProvider(
        scope,
        account: account.requireValue,
      ),
    );
  }
}

@Riverpod(retry: _noAttendanceReadRetry)
Future<EventAttendanceDispositionReview> eventAttendanceDispositionForAccount(
  Ref ref,
  EventAssistanceGuestScope scope, {
  required EventAssistanceAccount account,
}) async {
  ref.watch(eventAssistanceAccountProvider);
  requireAttendanceReviewAccount(ref, account);
  final view = await ref
      .watch(eventAttendanceDispositionRepositoryProvider)
      .fetch(scope);
  requireAttendanceReviewAccount(ref, account);
  return EventAttendanceDispositionReview._(account, view);
}

Duration? _noAttendanceReadRetry(int retryCount, Object error) => null;
