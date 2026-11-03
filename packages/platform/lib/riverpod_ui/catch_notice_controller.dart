import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'catch_notice_controller.g.dart';

@immutable
class CatchNoticeQueue {
  const CatchNoticeQueue([this.notices = const <CatchNoticeData>[]]);

  final List<CatchNoticeData> notices;

  CatchNoticeData? get current => notices.isEmpty ? null : notices.first;
}

// keepalive: notice queue is app-wide UI state that must survive route
// transitions until dismissed.
@Riverpod(keepAlive: true)
class CatchNoticeController extends _$CatchNoticeController {
  @override
  CatchNoticeQueue build() => const CatchNoticeQueue();

  void show(CatchNoticeData notice) {
    final dedupeKey = notice.dedupeKey;
    final notices = [
      for (final item in state.notices)
        if (item.id != notice.id &&
            (dedupeKey == null || item.dedupeKey != dedupeKey))
          item,
    ];
    // Stable FIFO within a priority; a burst cannot create an unbounded backlog.
    final index = notices.indexWhere((item) => item.priority < notice.priority);
    notices.insert(index < 0 ? notices.length : index, notice);
    state = CatchNoticeQueue(List.unmodifiable(notices.take(8)));
  }

  void dismiss(String id) {
    state = CatchNoticeQueue(
      List.unmodifiable(state.notices.where((notice) => notice.id != id)),
    );
  }

  void clear() {
    state = const CatchNoticeQueue();
  }

  void dismissByDedupeKey(String key) {
    final remaining = state.notices
        .where((notice) => notice.dedupeKey != key)
        .toList();
    if (remaining.length == state.notices.length) return;
    state = CatchNoticeQueue(List.unmodifiable(remaining));
  }
}
