import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_runtime_provider.g.dart';

final class AssistanceRuntimeSession {
  AssistanceRuntimeSession._(this.account, this.view);
  bool _current = true;
  bool get isCurrent => _current;
  final EventAssistanceAccount account;
  final AssistanceRuntimeView view;
}

const runtimeReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload event automation before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review event automation',
    resource: 'eventAssistanceRuntimeConfigs',
  ),
);

void requireRuntimeReviewAccount(Ref ref, EventAssistanceAccount expected) {
  if (!ref.mounted) throw runtimeReviewSessionChanged;
  final current = ref.read(eventAssistanceAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw runtimeReviewSessionChanged;
  }
}

@riverpod
class EventAssistanceRuntime extends _$EventAssistanceRuntime {
  @override
  AsyncValue<AssistanceRuntimeSession> build(
    EventAssistanceRuntimeScope query,
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
          eventAssistanceRuntimeForAccountProvider(query, account: account),
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
          eventAssistanceRuntimeForAccountProvider(
            query,
            account: account.requireValue,
          ),
        )
        .hasError) {
      ref.invalidate(
        eventAssistanceRuntimeForAccountProvider(
          query,
          account: account.requireValue,
        ),
      );
    }
  }
}

/// The event's automation for one sign-in period, without sender choices.
/// It is a Firestore listener: no cache tags or lifetime, and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one.
@Riverpod(retry: _noRuntimeReadRetry)
Stream<AssistanceRuntimeSession> eventAssistanceRuntimeForAccount(
  Ref ref,
  EventAssistanceRuntimeScope query, {
  required EventAssistanceAccount account,
}) {
  ref.watch(eventAssistanceAccountProvider);
  requireRuntimeReviewAccount(ref, account);
  AssistanceRuntimeSession? latest;
  ref.onDispose(() => latest?._current = false);
  return ref.watch(eventAssistanceRuntimeRepositoryProvider).watch(query).map((
    page,
  ) {
    requireRuntimeReviewAccount(ref, account);
    if (page.scope != query) {
      throw const FormatException(
        'Automation settings belong to another event.',
      );
    }
    latest?._current = false;
    return latest = AssistanceRuntimeSession._(account, page);
  });
}

// A listener error is shown with a retry; it is never retried silently.
Duration? _noRuntimeReadRetry(int retryCount, Object error) => null;
