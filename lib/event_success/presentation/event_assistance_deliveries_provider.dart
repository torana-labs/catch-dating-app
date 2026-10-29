import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_deliveries_provider.g.dart';

final class EventAssistanceDeliveriesSession {
  EventAssistanceDeliveriesSession._(this.account, this.page);
  bool _current = true;
  bool get isCurrent => _current;
  final EventAssistanceAccount account;
  final EventAssistanceDeliveriesPage page;

  EventAssistanceDeliveryReview review(AssistanceActionableDelivery request) {
    if (!isCurrent || !page.deliveries.any((row) => identical(row, request))) {
      throw ArgumentError('Review a request from this page snapshot.');
    }
    return EventAssistanceDeliveryReview._(this, request);
  }
}

final class EventAssistanceDeliveryReview {
  const EventAssistanceDeliveryReview._(this.session, this.delivery);
  final EventAssistanceDeliveriesSession session;
  EventAssistanceAccount get account => session.account;
  bool get isCurrent => session.isCurrent;
  final AssistanceActionableDelivery delivery;
}

const deliveryReviewSessionChanged = BackendOperationException(
  code: 'session-changed',
  message: 'Your sign-in changed. Reload message deliveries before continuing.',
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'review message delivery',
    resource: 'eventAssistanceMessages',
  ),
);

void requireDeliveryReviewAccount(Ref ref, EventAssistanceAccount expected) {
  if (!ref.mounted) throw deliveryReviewSessionChanged;
  final current = ref.read(eventAssistanceAccountProvider);
  if (current.isLoading ||
      current.hasError ||
      !identical(current.asData?.value, expected)) {
    throw deliveryReviewSessionChanged;
  }
}

@riverpod
class EventAssistanceDeliveries extends _$EventAssistanceDeliveries {
  @override
  AsyncValue<EventAssistanceDeliveriesSession> build(
    EventAssistanceDeliveryQuery query,
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
          eventAssistanceDeliveriesForAccountProvider(query, account: account),
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
      eventAssistanceDeliveriesForAccountProvider(
        query,
        account: account.requireValue,
      ),
    );
  }
}

@Riverpod(retry: _noDeliveryReadRetry)
Future<EventAssistanceDeliveriesSession> eventAssistanceDeliveriesForAccount(
  Ref ref,
  EventAssistanceDeliveryQuery query, {
  required EventAssistanceAccount account,
}) async {
  ref.watch(eventAssistanceAccountProvider);
  requireDeliveryReviewAccount(ref, account);
  final page = await ref
      .watch(eventAssistanceDeliveriesRepositoryProvider)
      .fetch(query);
  requireDeliveryReviewAccount(ref, account);
  final session = EventAssistanceDeliveriesSession._(account, page);
  ref.onDispose(() => session._current = false);
  return session;
}

Duration? _noDeliveryReadRetry(int retryCount, Object error) => null;
