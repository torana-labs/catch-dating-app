import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_participant_context_provider.g.dart';

final class EventParticipantContextReview {
  EventParticipantContextReview._(this.account, this.view);
  final AuthenticatedSession account;
  final EventParticipantContext view;
  bool _current = true;
  bool get isCurrent => _current;
}

/// Account changes and explicit refresh hide prior identity, including same-UID re-entry.
@riverpod
class EventParticipantContextReader extends _$EventParticipantContextReader {
  @override
  AsyncValue<EventParticipantContextReview> build(String eventId) {
    final auth = ref.watch(authenticatedSessionProvider);
    final authState = catchAsyncStateFromAsyncValue(auth);
    if ((authState.isLoading || authState.isRefreshing || authState.retrying)) {
      return const AsyncLoading();
    }
    if (authState.error != null) {
      return AsyncError(authState.error!, authState.stackTrace!);
    }
    final page = ref.watch(
      eventParticipantContextForAccountProvider(
        eventId,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
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
      eventParticipantContextForAccountProvider(
        eventId,
        account: switch (auth) {
          AsyncData(:final value) => value,
          AsyncError(:final error) => throw error,
          AsyncLoading() => throw AssertionError(),
        },
      ),
    );
  }
}

@Riverpod(retry: _noRetry)
Future<EventParticipantContextReview> eventParticipantContextForAccount(
  Ref ref,
  String eventId, {
  required AuthenticatedSession account,
}) async {
  ref.watch(authenticatedSessionProvider);
  _requireAccount(ref, account);
  final view = await ref
      .watch(eventParticipantContextRepositoryProvider)
      .fetch(eventId: eventId, subjectUid: account.uid);
  _requireAccount(ref, account);
  if (view.eventId != eventId || view.subjectUid != account.uid) {
    throw const FormatException(
      'Event identity belongs to another participant.',
    );
  }
  final review = EventParticipantContextReview._(account, view);
  ref.onDispose(() => review._current = false);
  return review;
}

void _requireAccount(Ref ref, AuthenticatedSession account) {
  if (!ref.mounted) {
    throw const SignInRequiredException('review event identity');
  }
  final auth = ref.read(authenticatedSessionProvider);
  final authState = catchAsyncStateFromAsyncValue(auth);
  if (!authState.isSettledData || !identical(authState.value, account)) {
    throw const SignInRequiredException('review event identity');
  }
}

Duration? _noRetry(int count, Object error) => null;
