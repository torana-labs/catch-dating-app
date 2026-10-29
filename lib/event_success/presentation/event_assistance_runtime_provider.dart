import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
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

  void reload() {
    final account = ref.read(eventAssistanceAccountProvider);
    if (account.isLoading || account.hasError || account.asData == null) return;
    ref.invalidate(
      eventAssistanceRuntimeForAccountProvider(
        query,
        account: account.requireValue,
      ),
    );
  }
}

@Riverpod(retry: _noRuntimeReadRetry)
Future<AssistanceRuntimeSession> eventAssistanceRuntimeForAccount(
  Ref ref,
  EventAssistanceRuntimeScope query, {
  required EventAssistanceAccount account,
}) async {
  ref.watch(eventAssistanceAccountProvider);
  requireRuntimeReviewAccount(ref, account);
  final page = await ref
      .watch(eventAssistanceRuntimeRepositoryProvider)
      .fetch(query);
  requireRuntimeReviewAccount(ref, account);
  if (page.scope != query) {
    throw const FormatException('Automation settings belong to another event.');
  }
  final session = AssistanceRuntimeSession._(account, page);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noRuntimeReadRetry(int retryCount, Object error) => null;
