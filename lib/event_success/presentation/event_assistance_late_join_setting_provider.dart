import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_late_join_setting_provider.g.dart';

final class LateJoinSettingSession {
  LateJoinSettingSession._(this.account, this.view);
  final EventAssistanceAccount account;
  final LateJoinSettingView view;
  bool _current = true;
  bool get isCurrent => _current;
}

const settingReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message:
      'Your sign-in changed. Reload assistance settings before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review late arrival settings',
    resource: 'eventAssistanceSettings',
  ),
);

void requireSettingReviewAccount(Ref ref, EventAssistanceAccount expected) {
  if (!ref.mounted) throw settingReviewSessionChanged;
  final current = ref.read(eventAssistanceAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw settingReviewSessionChanged;
  }
}

@riverpod
class EventAssistanceLateJoinSetting extends _$EventAssistanceLateJoinSetting {
  @override
  AsyncValue<LateJoinSettingSession> build(EventAssistanceGroupScope query) {
    final auth = ref.watch(eventAssistanceAccountProvider);
    return auth.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: false,
      skipError: false,
      loading: () => const AsyncLoading(),
      error: (error, stackTrace) => AsyncError(error, stackTrace),
      data: (account) {
        final page = ref.watch(
          eventAssistanceLateJoinSettingForAccountProvider(
            query,
            account: account,
          ),
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

  /// Restarts the listener only after it ended in an error; a healthy one
  /// already delivers every change.
  void reload() {
    final account = ref.read(eventAssistanceAccountProvider);
    if (account.isLoading || account.hasError || account.asData == null) return;
    if (ref
        .read(
          eventAssistanceLateJoinSettingForAccountProvider(
            query,
            account: account.requireValue,
          ),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceLateJoinSettingForAccountProvider(
          query,
          account: account.requireValue,
        ),
      );
    }
  }
}

/// The group's late-join setting for one sign-in period. It is a Firestore
/// listener: no cache tags or lifetime, and writes never invalidate it. Each
/// delivery is a new session and retires the previous one.
@Riverpod(retry: _noSettingReadRetry)
Stream<LateJoinSettingSession> eventAssistanceLateJoinSettingForAccount(
  Ref ref,
  EventAssistanceGroupScope query, {
  required EventAssistanceAccount account,
}) {
  ref.watch(eventAssistanceAccountProvider);
  requireSettingReviewAccount(ref, account);
  LateJoinSettingSession? latest;
  ref.onDispose(() => latest?._current = false);
  return ref
      .watch(eventAssistanceLateJoinSettingRepositoryProvider)
      .watch(query)
      .map((page) {
        requireSettingReviewAccount(ref, account);
        if (page.scope != query) {
          throw const FormatException(
            'Late arrival settings do not match this scope.',
          );
        }
        latest?._current = false;
        return latest = LateJoinSettingSession._(account, page);
      });
}

// A listener error is shown with a retry; it is never retried silently.
Duration? _noSettingReadRetry(int retryCount, Object error) => null;
