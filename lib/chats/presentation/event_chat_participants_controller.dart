import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_participant.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_timing.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_participants_controller.g.dart';

class EventChatParticipantsState {
  const EventChatParticipantsState({
    required this.uid,
    required this.page,
    this.access,
  });
  final String uid;
  final EventChatParticipantPage page;
  final EventChatAccess? access;
}

/// No offline roster: refresh every loaded page, discard on authority failure,
/// and hide names on backgrounding or account changes.
@riverpod
class EventChatParticipantsController
    extends _$EventChatParticipantsController {
  int _generation = 0, _epoch = 0, _pages = 1;
  bool _foreground = true, _loading = false;
  Timer? _timer;
  final _requests = <String, String>{};

  @override
  Future<EventChatParticipantsState> build(String eventId) async {
    _generation++;
    _epoch++;
    _pages = 1;
    _loading = false;
    _timer?.cancel();
    _requests.clear();
    ref.onDispose(() => _timer?.cancel());
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) throw const SignInRequiredException('view participants');
    final generation = _generation, epoch = _epoch;
    final result = await _read(uid);
    if (!_current(uid, generation, epoch)) {
      throw StateError('Participant list read superseded');
    }
    _schedule();
    return result;
  }

  bool _current(String uid, int generation, int epoch) =>
      ref.mounted &&
      _foreground &&
      generation == _generation &&
      epoch == _epoch &&
      ref.read(uidProvider).asData?.value == uid;

  Future<EventChatParticipantsState> _read(String uid) async {
    final repo = ref.read(eventChatRepositoryProvider);
    final access = await repo.access(eventId);
    final items = <String, EventChatParticipant>{};
    Map<String, Object?>? cursor;
    for (var page = 0; page < _pages; page++) {
      final result = await repo.participants(uid, eventId, cursor: cursor);
      for (final row in result.items) {
        items[row.uid] = row;
      }
      cursor = result.nextCursor;
      if (cursor == null) break;
    }
    return EventChatParticipantsState(
      uid: uid,
      access: access,
      page: EventChatParticipantPage(items: items.values, nextCursor: cursor),
    );
  }

  Future<bool> manageMember(EventChatParticipant person, String action) async {
    final current = state.asData?.value;
    if (current == null ||
        !_foreground ||
        _loading ||
        current.access?.canManage != true ||
        person.uid == current.uid ||
        person.isHost ||
        !current.page.items.any(
          (row) => row.uid == person.uid &&
              row.membershipRevision == person.membershipRevision &&
              row.membershipStatus == person.membershipStatus,
        )) {
      return false;
    }
    final uid = ref.read(uidProvider).asData?.value;
    if (uid != current.uid) {
      return false;
    }
    final key = jsonEncode([
      uid,
      eventId,
      person.uid,
      action,
      person.membershipRevision,
    ]);
    final requestId = _requests.putIfAbsent(
      key,
      () => base64Url.encode(
        List.generate(24, (_) => Random.secure().nextInt(256)),
      ),
    );
    _timer?.cancel();
    state = const AsyncLoading();
    try {
      await ref.read(eventChatRepositoryProvider).manageMember(
        uid!,
        current.access!,
        person.uid,
        action,
        person.membershipRevision,
        requestId,
      );
      _requests.remove(key);
      await refresh();
      return true;
    } on Object catch (error, stack) {
      if (ref.mounted && ref.read(uidProvider).asData?.value == uid) {
        state = AsyncError(error, stack);
      }
      return false;
    }
  }

  void _schedule() {
    _timer?.cancel();
    if (_foreground && ref.mounted) {
      _timer = Timer(
        EventChatTiming.participantProfileRefresh * _pages,
        () => unawaited(refresh()),
      );
    }
  }

  Future<void> refresh() async {
    if (!_foreground || _loading) return;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    final generation = _generation, epoch = ++_epoch;
    _timer?.cancel();
    _loading = true;
    state = const AsyncLoading();
    try {
      final result = await _read(uid);
      if (_current(uid, generation, epoch)) state = AsyncData(result);
    } on Object catch (error, stack) {
      if (_current(uid, generation, epoch)) state = AsyncError(error, stack);
    } finally {
      if (ref.mounted && generation == _generation && epoch == _epoch) {
        _loading = false;
        _schedule();
      }
    }
  }

  Future<void> loadMore() async {
    if (_loading || state.asData?.value.page.nextCursor == null) return;
    _pages++;
    await refresh();
  }

  void setForeground(bool value) {
    if (_foreground == value) return;
    _foreground = value;
    _epoch++;
    _loading = false;
    _timer?.cancel();
    if (!value) {
      state = const AsyncLoading();
    } else {
      unawaited(refresh());
    }
  }
}
