import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_report_provider.g.dart';

final class EventAttendanceReportReview {
  const EventAttendanceReportReview._(this.account, this.view);
  final EventAssistanceAccount account;
  final EventAttendanceReportView view;
}

/// Loading, refresh and errors expose no previous report or invented zero totals.
@riverpod
class EventAttendanceReport extends _$EventAttendanceReport {
  @override
  AsyncValue<EventAttendanceReportReview> build(
    EventAssistanceRuntimeScope scope,
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
          eventAttendanceReportForAccountProvider(scope, account: account),
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
    final auth = ref.read(eventAssistanceAccountProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if (!authState.isSettledData || authState.value == null) {
      return;
    }
    ref.invalidate(
      eventAttendanceReportForAccountProvider(
        scope,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noReportReadRetry)
Future<EventAttendanceReportReview> eventAttendanceReportForAccount(
  Ref ref,
  EventAssistanceRuntimeScope scope, {
  required EventAssistanceAccount account,
}) async {
  ref.watch(eventAssistanceAccountProvider);
  requireAttendanceReviewAccount(ref, account);
  final view = await ref
      .watch(eventAttendanceReportRepositoryProvider)
      .fetch(scope);
  requireAttendanceReviewAccount(ref, account);
  return EventAttendanceReportReview._(account, view);
}

Duration? _noReportReadRetry(int retryCount, Object error) => null;
