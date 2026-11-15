import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_signals.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_timing.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_controller.g.dart';

/// Deprecated alias of `appClockProvider`; 1.3b moves the callers and deletes
/// it. Not annotated `@Deprecated`, which would flag Widgetbook's callers.
@riverpod
DateTime Function() eventChatNow(Ref ref) => ref.watch(appClockProvider).now;

class EventChatState {
  EventChatState({
    required this.uid,
    required this.access,
    required Iterable<EventChatMessage> messages,
    required Iterable<EventChatTyping> typing,
    required this.nextBeforeSequence,
    required this.receivedAt,
    required this.serverTimeMillis,
    this.active = true,
    this.ownTypingRevision = 0,
    this.busy = false,
    this.error,
  }) : messages = List.unmodifiable(messages),
       typing = List.unmodifiable(typing);
  final String uid;
  final EventChatAccess access;
  final List<EventChatMessage> messages;
  final List<EventChatTyping> typing;
  final int? nextBeforeSequence;
  final DateTime receivedAt;
  final int serverTimeMillis, ownTypingRevision;
  final bool busy, active;
  final Object? error;
  bool get canSend =>
      active && access.canPostMessages && !busy && error == null;
  List<EventChatTyping> typingAt(DateTime now) {
    final estimatedServerTime =
        serverTimeMillis + now.difference(receivedAt).inMilliseconds;
    return typing
        .where((p) => p.expiresAtMillis > estimatedServerTime)
        .toList();
  }

  EventChatState pending() => EventChatState(
    uid: uid,
    access: access,
    messages: messages,
    typing: typing,
    nextBeforeSequence: nextBeforeSequence,
    receivedAt: receivedAt,
    serverTimeMillis: serverTimeMillis,
    ownTypingRevision: ownTypingRevision,
    active: active,
    busy: true,
  );
}

/// All visible history is revalidated, including reply quotes. Failed reads,
/// backgrounding and identity changes never retain an old readable snapshot.
///
/// Nothing polls. The controller listens to the chat's content-free change
/// signal and reads through the callables only when it moves: at once for
/// messages, the room or memberships, and at most every
/// [EventChatTiming.typingRefreshGap] for typing. A timer covers the one
/// change no write announces, a scheduled room opening or closing.
@riverpod
class EventChatController extends _$EventChatController {
  int _generation = 0;
  int _readEpoch = 0;
  int _pageCount = 1;
  bool _foreground = true;
  bool _loadingEarlier = false;
  Timer? _timer;
  Timer? _typingRefresh;
  StreamSubscription<EventChatSignal>? _signals;
  EventChatSignal? _seenSignal;
  bool _signalReadRunning = false;
  bool _signalReadAgain = false;
  DateTime? _lastReadAt;
  final _requests = <String, String>{};
  bool _typingWanted = false;
  bool _typingBusy = false;
  bool _typingMayBeActive = false;
  int _typingRevision = 0;
  DateTime? _lastTypingWrite;
  DateTime? _lastDraftActivity;
  DateTime _now() => ref.read(eventChatNowProvider)();

  @override
  Future<EventChatState> build(String eventId) async {
    _generation++;
    _readEpoch++;
    _pageCount = 1;
    _loadingEarlier = false;
    _requests.clear();
    _timer?.cancel();
    _typingWanted = false;
    _typingBusy = false;
    _typingMayBeActive = false;
    _typingRevision = 0;
    _lastTypingWrite = null;
    _lastDraftActivity = null;
    _typingRefresh?.cancel();
    unawaited(_signals?.cancel());
    _signals = null;
    _seenSignal = null;
    _signalReadAgain = false;
    _lastReadAt = null;
    ref.onDispose(() {
      _timer?.cancel();
      _typingRefresh?.cancel();
      unawaited(_signals?.cancel());
    });
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) throw const SignInRequiredException('open event chat');
    final generation = _generation;
    final repository = ref.watch(eventChatRepositoryProvider);
    // Listen before the first read so a change made during it is not lost.
    _signals = ref
        .read(eventChatSignalSourceProvider)
        .watch(eventId)
        .listen(
          (signal) => _onSignal(uid, generation, signal),
          // The next foreground return or write reads again; a failed
          // signal never clears a readable chat.
          onError: (Object _, StackTrace _) {},
        );
    final result = await _read(repository, uid, eventId);
    if (_current(uid, generation)) {
      _rememberTypingRevision(result.ownTypingRevision);
      _scheduleRoomBoundary(result);
    }
    return result;
  }

  /// The first snapshot is the baseline the opening read already covers;
  /// later ones read again only for what moved.
  void _onSignal(String uid, int generation, EventChatSignal signal) {
    if (!_current(uid, generation)) return;
    final seen = _seenSignal;
    _seenSignal = signal;
    if (seen == null || !_foreground) return;
    if (signal.contentChangedSince(seen)) {
      _typingRefresh?.cancel();
      unawaited(_readForSignal());
    } else if (signal.typingChangedSince(seen)) {
      _paceTypingRead();
    }
  }

  void _paceTypingRead() {
    if (_typingRefresh?.isActive ?? false) return;
    final last = _lastReadAt;
    final wait = last == null
        ? Duration.zero
        : EventChatTiming.typingRefreshGap - _now().difference(last);
    if (wait <= Duration.zero) {
      unawaited(_readForSignal());
      return;
    }
    _typingRefresh = Timer(wait, () => unawaited(_readForSignal()));
  }

  /// Signal reads never overlap: one more runs after the current one when
  /// the signal moved meanwhile.
  Future<void> _readForSignal() async {
    if (_signalReadRunning) {
      _signalReadAgain = true;
      return;
    }
    _signalReadRunning = true;
    try {
      await refresh();
    } finally {
      _signalReadRunning = false;
      if (_signalReadAgain && ref.mounted) {
        _signalReadAgain = false;
        unawaited(_readForSignal());
      }
    }
  }

  bool _current(String uid, int generation) =>
      ref.mounted &&
      generation == _generation &&
      ref.read(uidProvider).asData?.value == uid;

  Future<EventChatState> _read(
    EventChatRepository repository,
    String uid,
    String eventId,
  ) async {
    final access = await repository.access(eventId);
    final messages = <String, EventChatMessage>{};
    EventChatPage? latest;
    int? cursor;
    if (_foreground && access.canReadMessages) {
      for (var page = 0; page < _pageCount; page++) {
        final result = await repository.messages(
          eventId,
          beforeSequence: cursor,
        );
        latest ??= result;
        for (final message in result.messages) {
          messages[message.messageId] = message;
        }
        cursor = result.nextBeforeSequence;
        if (cursor == null) break;
      }
    }
    final ordered = messages.values.toList()
      ..sort((a, b) => b.sequence.compareTo(a.sequence));
    _lastReadAt = _now();
    return EventChatState(
      uid: uid,
      access: access,
      messages: _foreground ? ordered : const [],
      active: _foreground,
      typing: _foreground ? latest?.typing ?? const [] : const [],
      nextBeforeSequence: cursor,
      receivedAt: _now(),
      serverTimeMillis: latest?.serverTimeMillis ?? 0,
      ownTypingRevision: latest?.ownTypingRevision ?? 0,
    );
  }

  /// A scheduled room opens or closes without a write; read again just
  /// after the next boundary, estimated on the server's clock.
  void _scheduleRoomBoundary(EventChatState? current) {
    _timer?.cancel();
    if (current == null || !_foreground || !ref.mounted) return;
    final serverNow =
        current.serverTimeMillis +
        _now().difference(current.receivedAt).inMilliseconds;
    final boundaries = [
      current.access.opensAtMillis,
      current.access.closesAtMillis,
    ].whereType<int>().where((at) => at > serverNow);
    if (boundaries.isEmpty) return;
    final next = boundaries.reduce(min);
    _timer = Timer(
      Duration(milliseconds: next - serverNow) +
          EventChatTiming.roomBoundaryGrace,
      () => unawaited(refresh()),
    );
  }

  Future<void> refresh() async {
    if (!ref.mounted || !_foreground || state.asData?.value.busy == true) {
      return;
    }
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    final generation = _generation;
    final epoch = ++_readEpoch;
    try {
      final result = await _read(
        ref.read(eventChatRepositoryProvider),
        uid,
        eventId,
      );
      if (!_current(uid, generation) || epoch != _readEpoch || !_foreground) {
        return;
      }
      _rememberTypingRevision(result.ownTypingRevision);
      state = AsyncData(result);
      unawaited(_syncTyping());
    } on Object catch (error, stack) {
      if (_current(uid, generation) && epoch == _readEpoch) {
        // No stale messages or composer after a failed authority refresh.
        state = AsyncError(error, stack);
      }
    } finally {
      if (_current(uid, generation) && epoch == _readEpoch) {
        _scheduleRoomBoundary(state.asData?.value);
      }
    }
  }

  Future<void> loadEarlier() async {
    final current = state.asData?.value;
    if (current == null ||
        current.busy ||
        _loadingEarlier ||
        current.nextBeforeSequence == null) {
      return;
    }
    _loadingEarlier = true;
    _pageCount++;
    try {
      await refresh();
    } finally {
      _loadingEarlier = false;
    }
  }

  void setForeground(bool value) {
    if (_foreground == value) return;
    _foreground = value;
    _timer?.cancel();
    _typingRefresh?.cancel();
    _readEpoch++;
    if (!value) {
      _typingWanted = false;
      unawaited(_syncTyping());
      state = const AsyncLoading();
    } else {
      unawaited(refresh());
    }
  }

  void draftChanged(bool hasText) {
    _typingWanted = hasText && _foreground;
    if (_typingWanted) _lastDraftActivity = _now();
    unawaited(_syncTyping());
  }

  void _rememberTypingRevision(int revision) {
    if (revision > _typingRevision) {
      _typingRevision = revision;
      _typingMayBeActive = true;
    }
  }

  Future<void> _syncTyping() async {
    if (_typingBusy || !ref.mounted) return;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    if (_lastDraftActivity != null &&
        _now().difference(_lastDraftActivity!) > EventChatTiming.idleTyping) {
      _typingWanted = false;
    }
    if (_typingWanted && state.asData?.value.canSend != true) return;
    if (!_typingWanted && !_typingMayBeActive) return;
    final now = _now();
    if (_typingWanted &&
        _lastTypingWrite != null &&
        now.difference(_lastTypingWrite!) < EventChatTiming.typingHeartbeat) {
      return;
    }
    final generation = _generation;
    final wanted = _typingWanted;
    _typingBusy = true;
    if (wanted) _typingMayBeActive = true;
    try {
      final revision = await ref
          .read(eventChatRepositoryProvider)
          .typing(uid, eventId, wanted, _typingRevision);
      if (!_current(uid, generation)) return;
      _typingRevision = max(_typingRevision, revision);
      _typingMayBeActive = wanted;
      _lastTypingWrite = now;
    } on Object {
      // Presence is ephemeral. Read its revision again before another write;
      // never replay an old start over a more recent stop.
      if (_current(uid, generation)) _lastTypingWrite = now;
    } finally {
      if (_current(uid, generation)) {
        _typingBusy = false;
        if (wanted != _typingWanted) unawaited(_syncTyping());
      }
    }
  }

  String _requestId(String key) => _requests.putIfAbsent(
    key,
    () => base64Url.encode(
      List.generate(24, (_) => Random.secure().nextInt(256)),
    ),
  );

  Future<bool> _mutate(
    String key,
    Future<void> Function(EventChatRepository repository, String requestId) run,
  ) async {
    final current = state.asData?.value;
    if (current == null || current.busy || !_foreground) return false;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null || uid != current.uid) return false;
    final generation = _generation;
    _readEpoch++;
    _timer?.cancel();
    state = AsyncData(current.pending());
    final requestKey = jsonEncode([uid, eventId, key]);
    try {
      await run(ref.read(eventChatRepositoryProvider), _requestId(requestKey));
      if (!_current(uid, generation)) return false;
      _requests.remove(requestKey);
      state = const AsyncLoading();
      await refresh();
      return true;
    } on Object catch (error, stack) {
      if (_current(uid, generation)) {
        _scheduleRoomBoundary(current);
        state = AsyncError(error, stack);
      }
      return false;
    }
  }

  Future<bool> updateAccess(
    EventChatAction action, {
    required String reviewedUid,
    DateTime? opensAt,
    DateTime? closesAt,
  }) async {
    final current = state.asData?.value;
    if (current == null || current.uid != reviewedUid) return false;
    final access = current.access;
    return _mutate(
      jsonEncode([
        'access',
        action.name,
        access.revisionFor(action),
        access.termsVersion,
        if (action == EventChatAction.schedule) ...[
          opensAt?.millisecondsSinceEpoch,
          closesAt?.millisecondsSinceEpoch,
        ],
      ]),
      (repository, requestId) => repository.updateAccess(
        current.uid,
        access,
        action,
        requestId,
        opensAt: opensAt,
        closesAt: closesAt,
      ),
    );
  }

  Future<bool> send(
    String text, {
    required String reviewedUid,
    String? replyToMessageId,
    bool announcement = false,
  }) async {
    final current = state.asData?.value;
    if (current?.canSend != true ||
        current!.uid != reviewedUid ||
        (announcement && !current.access.canManage) ||
        (current.access.roomStatus == 'announcementsOnly' && !announcement) ||
        text.trim().isEmpty) {
      return false;
    }
    if (replyToMessageId != null &&
        !current.messages.any(
          (message) =>
              message.messageId == replyToMessageId && message.available,
        )) {
      return false;
    }
    final normalized = text.trim();
    final sent = await _mutate(
      jsonEncode([
        'send',
        normalized,
        replyToMessageId,
        if (announcement) true,
      ]),
      (repository, requestId) => announcement
          ? repository.sendAnnouncement(
              current.uid,
              eventId,
              normalized,
              replyToMessageId,
              requestId,
            )
          : repository.send(
              current.uid,
              eventId,
              normalized,
              replyToMessageId,
              requestId,
            ),
    );
    if (sent) draftChanged(false);
    return sent;
  }

  Future<bool> actOnMessage(
    EventChatMessage reviewed,
    EventChatSafetyAction action, {
    required String reviewedUid,
    EventChatReportReason? reason,
  }) async {
    final current = state.asData?.value;
    if (current == null ||
        !current.active ||
        current.busy ||
        !current.access.canReadMessages ||
        current.uid != reviewedUid) {
      return false;
    }
    final message = current.messages
        .where((row) => row.messageId == reviewed.messageId)
        .firstOrNull;
    if (message == null ||
        !message.available ||
        message.senderUid != reviewed.senderUid ||
        (action == EventChatSafetyAction.report) != (reason != null)) {
      return false;
    }
    final own = message.senderUid == current.uid;
    if (action == EventChatSafetyAction.remove
        ? !own && !current.access.canManage
        : own) {
      return false;
    }
    return _mutate(
      jsonEncode([
        'messageAction',
        message.messageId,
        action.name,
        reason?.name,
      ]),
      (repository, requestId) => repository.actOnMessage(
        current.uid,
        eventId,
        message.messageId,
        action,
        reason,
        requestId,
      ),
    );
  }

  Future<bool> react(
    EventChatMessage reviewed,
    EventChatReaction? reaction, {
    required String reviewedUid,
  }) async {
    final current = state.asData?.value;
    if (current?.canSend != true || current!.uid != reviewedUid) return false;
    final message = current.messages
        .where((row) => row.messageId == reviewed.messageId)
        .firstOrNull;
    if (message == null ||
        !message.available ||
        message.myReactionRevision != reviewed.myReactionRevision) {
      return false;
    }
    return _mutate(
      jsonEncode([
        'reaction',
        reviewed.messageId,
        reviewed.myReactionRevision,
        reaction?.name,
      ]),
      (repository, requestId) =>
          repository.react(current.uid, eventId, reviewed, reaction, requestId),
    );
  }
}
