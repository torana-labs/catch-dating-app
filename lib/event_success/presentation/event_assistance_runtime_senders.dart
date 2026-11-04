import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_provider.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
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
    this.loadingFirstPage = false,
    this.error,
    this.needsRefresh = false,
  }) : choices = List.unmodifiable(choices),
       cursors = Map.unmodifiable(cursors);
  final AssistanceRuntimeSession review;
  final List<AssistanceRuntimeSenderChoice> choices;
  final Map<AssistanceMessageRoute, String> cursors;

  /// The server time of the last sender page; the review's own time until
  /// the first page arrives.
  final int serverTime;
  final AssistanceMessageRoute? loadingRoute;

  /// The listened automation carries no sender choices: the first page of
  /// every route is being read from the sender picker callable.
  final bool loadingFirstPage;
  final Object? error;
  final bool needsRefresh;
  bool _current = true;
  bool get isCurrent =>
      _current &&
      review.isCurrent &&
      !needsRefresh &&
      !loadingFirstPage &&
      loadingRoute == null;

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
    final firstPage = current && setup == null;
    _active?._current = false;
    final directory = _active = AssistanceRuntimeSenderDirectory._(
      review,
      choices: current ? setup?.choices ?? [] : [],
      cursors: current ? setup?.nextCursors ?? {} : {},
      serverTime: review.view.serverTime,
      loadingFirstPage: firstPage,
      needsRefresh: !current,
      error: pageState.error,
    );
    ref.onDispose(() {
      _epoch++;
      _active?._current = false;
    });
    if (firstPage) {
      final epoch = _epoch;
      // State cannot change while it is being built.
      scheduleMicrotask(() => unawaited(_load(epoch, const {})));
    }
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
    await _load(epoch, {route: cursor});
  }

  /// Reads one page after [after]: the first page of every route when it is
  /// empty, otherwise the next page of its one route.
  Future<void> _load(
    int epoch,
    Map<AssistanceMessageRoute, String> after,
  ) async {
    if (!ref.mounted || epoch != _epoch) return;
    final before = state;
    final route = after.keys.singleOrNull;
    try {
      requireRuntimeReviewAccount(ref, review.account);
      final page = await ref
          .read(eventAssistanceRuntimeCommandsProvider)
          .fetchSenderPage(review.view.scope, cursors: after);
      if (!ref.mounted || epoch != _epoch) return;
      requireRuntimeReviewAccount(ref, review.account);
      final base = review.view;
      // Status and the configure window are evaluated by different clocks
      // in the listened view and the callable; the reviewed automation is
      // the same while its identity and revision are.
      if (!review.isCurrent ||
          page.scope != base.scope ||
          page.revision != base.revision ||
          page.sourceHash != base.sourceHash ||
          page.eventEnd != base.eventEnd ||
          route != null && page.serverTime < before.serverTime ||
          page.senderSetup == null) {
        throw const ValidationException('Event settings changed. Reload them.');
      }
      final setup = page.senderSetup!;
      setup.requireAdvancing(after);
      final merged = {
        for (final choice in before.choices)
          (choice.route, choice.senderId): choice,
      };
      // A next page's other channels are first pages. Do not rewind them.
      for (final choice in setup.choices.where(
        (c) => route == null || c.route == route,
      )) {
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
      final cursors = route == null
          ? {...setup.nextCursors}
          : ({...before.cursors}..remove(route));
      if (route != null) {
        if (setup.nextCursors[route] case final next?) cursors[route] = next;
      }
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
