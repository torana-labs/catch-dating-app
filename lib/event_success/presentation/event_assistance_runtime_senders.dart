import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_runtime_senders.g.dart';

/// A directory belongs to one reviewed event and account, including its pages.
final class AssistanceRuntimeSenderDirectory {
  AssistanceRuntimeSenderDirectory._(
    this.review, {
    required List<AssistanceRuntimeSenderChoice> choices,
    required Map<AssistanceMessageRoute, String> cursors,
    required this.serverTime,
    this.loadingRoute,
    this.error,
    this.needsRefresh = false,
  }) : choices = List.unmodifiable(choices),
       cursors = Map.unmodifiable(cursors);
  final AssistanceRuntimeSession review;
  final List<AssistanceRuntimeSenderChoice> choices;
  final Map<AssistanceMessageRoute, String> cursors;
  final int serverTime;
  final AssistanceMessageRoute? loadingRoute;
  final Object? error;
  final bool needsRefresh;
  bool _current = true;
  bool get isCurrent =>
      _current && review.isCurrent && !needsRefresh && loadingRoute == null;

  List<AssistanceRuntimeSenderChoice> requireReview(
    AssistanceRuntimeSession expected,
  ) {
    if (!isCurrent || !identical(review, expected)) {
      throw const ValidationException('Reload the event sender choices.');
    }
    return choices;
  }
}

@riverpod
class EventAssistanceRuntimeSenders extends _$EventAssistanceRuntimeSenders {
  int _epoch = 0;
  AssistanceRuntimeSenderDirectory? _active;
  @override
  AssistanceRuntimeSenderDirectory build(AssistanceRuntimeSession review) {
    _epoch++;
    final page = ref.watch(eventAssistanceRuntimeProvider(review.view.scope));
    final pageState = catchAsyncStateFromAsyncValue(page);
    final current =
        pageState.isSettledData &&
        identical(pageState.value, review) &&
        review.isCurrent;
    final setup = review.view.senderSetup;
    _active?._current = false;
    final directory = _active = AssistanceRuntimeSenderDirectory._(
      review,
      choices: current ? setup?.choices ?? [] : [],
      cursors: current ? setup?.nextCursors ?? {} : {},
      serverTime: review.view.serverTime,
      needsRefresh: !current || setup == null,
      error: pageState.error,
    );
    ref.onDispose(() {
      _epoch++;
      _active?._current = false;
    });
    return directory;
  }

  void _publish(AssistanceRuntimeSenderDirectory next) {
    state._current = false;
    _active = next;
    state = next;
  }

  Future<void> loadMore(AssistanceMessageRoute route) async {
    final before = state;
    final cursor = before.cursors[route];
    if (!before.isCurrent || cursor == null) return;
    requireRuntimeReviewAccount(ref, review.account);
    final epoch = _epoch;
    _publish(
      AssistanceRuntimeSenderDirectory._(
        review,
        choices: before.choices,
        cursors: before.cursors,
        serverTime: before.serverTime,
        loadingRoute: route,
      ),
    );
    try {
      final page = await ref
          .read(eventAssistanceRuntimeCommandsProvider)
          .fetchSenderPage(review.view.scope, cursors: {route: cursor});
      if (!ref.mounted || epoch != _epoch) return;
      requireRuntimeReviewAccount(ref, review.account);
      final base = review.view;
      if (!review.isCurrent ||
          page.scope != base.scope ||
          page.revision != base.revision ||
          page.sourceHash != base.sourceHash ||
          page.eventEnd != base.eventEnd ||
          page.status != base.status ||
          page.canConfigure != base.canConfigure ||
          page.serverTime < before.serverTime ||
          page.senderSetup == null) {
        throw const ValidationException('Event settings changed. Reload them.');
      }
      final setup = page.senderSetup!;
      setup.requireAdvancing({route: cursor});
      final merged = {
        for (final choice in before.choices)
          (choice.route, choice.senderId): choice,
      };
      // Other channels in this response are first pages. Do not rewind them.
      for (final choice in setup.choices.where((c) => c.route == route)) {
        if (choice.scope != base.scope) {
          throw const FormatException('Sender belongs to another event.');
        }
        final key = (choice.route, choice.senderId);
        final old = merged[key];
        if (old != null &&
            (old.reviewHash != choice.reviewHash ||
                old.displayName != choice.displayName ||
                old.displayAddress != choice.displayAddress ||
                old.availability != choice.availability)) {
          throw const ValidationException('Sender setup changed. Reload it.');
        }
        merged[key] = choice;
      }
      final cursors = {...before.cursors}..remove(route);
      if (setup.nextCursors[route] case final next?) cursors[route] = next;
      _publish(
        AssistanceRuntimeSenderDirectory._(
          review,
          choices: merged.values.toList(),
          cursors: cursors,
          serverTime: page.serverTime,
        ),
      );
    } catch (error) {
      if (!ref.mounted || epoch != _epoch) return;
      _publish(
        AssistanceRuntimeSenderDirectory._(
          review,
          choices: [],
          cursors: {},
          serverTime: before.serverTime,
          needsRefresh: true,
          error: error,
        ),
      );
    }
  }
}
