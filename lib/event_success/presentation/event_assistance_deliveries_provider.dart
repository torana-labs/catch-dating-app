import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_deliveries_provider.g.dart';

/// The pages one listener subscription has delivered: only the latest is
/// current, and none is once the subscription ends.
final class _DeliveriesFeed {
  EventAssistanceDeliveriesSession? latest;
  bool open = true;
}

final class EventAssistanceDeliveriesSession {
  EventAssistanceDeliveriesSession._(this.account, this.page, this._feed);
  final _DeliveriesFeed _feed;

  /// Whether this is the newest page its listener has delivered.
  bool get isCurrent => _feed.open && identical(_feed.latest, this);
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

  /// A review outlives later pages while its message is unchanged and still
  /// offers a handoff in the newest one: same revision and review hash.
  bool get isCurrent {
    final feed = session._feed;
    final latest = feed.latest;
    if (!feed.open || latest == null) return false;
    if (identical(latest, session)) return true;
    return latest.page.deliveries.any(
      (row) =>
          row is AssistanceActionableDelivery &&
          row.scope == delivery.scope &&
          row.revision == delivery.revision &&
          row.reviewHash == delivery.reviewHash,
    );
  }

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
      eventAssistanceDeliveriesForAccountProvider(
        query,
        account: account.requireValue,
      ),
    );
  }
}

/// The delivery page read owner. It is a Firestore listener: it declares no
/// cache tags or lifetime, and commands never invalidate it; the delivery
/// view triggers deliver their result.
@Riverpod(retry: _noDeliveryReadRetry)
Stream<EventAssistanceDeliveriesSession> eventAssistanceDeliveriesForAccount(
  Ref ref,
  EventAssistanceDeliveryQuery query, {
  required EventAssistanceAccount account,
}) {
  ref.watch(eventAssistanceAccountProvider);
  requireDeliveryReviewAccount(ref, account);
  final feed = _DeliveriesFeed();
  ref.onDispose(() => feed.open = false);
  return ref
      .watch(eventAssistanceDeliveriesRepositoryProvider)
      .watchPage(query)
      .map((page) {
        requireDeliveryReviewAccount(ref, account);
        return feed.latest = EventAssistanceDeliveriesSession._(
          account,
          page,
          feed,
        );
      });
}

Duration? _noDeliveryReadRetry(int retryCount, Object error) => null;
