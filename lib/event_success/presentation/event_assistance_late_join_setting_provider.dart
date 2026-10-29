import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
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
        if ((pageState.isLoading || pageState.isRefreshing || pageState.retrying)) {
          return const AsyncLoading();
        }
        if (pageState.error != null) {
          return AsyncError(pageState.error!, pageState.stackTrace!);
        }
        return page;
      },
    );
  }

  void reload() {
    final account = ref.read(eventAssistanceAccountProvider);
    if (account.isLoading || account.hasError || account.asData == null) return;
    ref.invalidate(
      eventAssistanceLateJoinSettingForAccountProvider(
        query,
        account: account.requireValue,
      ),
    );
  }
}

@Riverpod(retry: _noSettingReadRetry)
Future<LateJoinSettingSession> eventAssistanceLateJoinSettingForAccount(
  Ref ref,
  EventAssistanceGroupScope query, {
  required EventAssistanceAccount account,
}) async {
  ref.watch(eventAssistanceAccountProvider);
  requireSettingReviewAccount(ref, account);
  final page = await ref
      .watch(eventAssistanceLateJoinSettingRepositoryProvider)
      .fetch(query);
  requireSettingReviewAccount(ref, account);
  if (page.scope != query) {
    throw const FormatException(
      'Late arrival settings do not match this scope.',
    );
  }
  final session = LateJoinSettingSession._(account, page);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noSettingReadRetry(int retryCount, Object error) => null;
