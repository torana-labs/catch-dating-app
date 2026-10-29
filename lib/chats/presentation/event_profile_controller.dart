import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_timing.dart';
import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_profile_controller.g.dart';

class EventProfileEditorState {
  EventProfileEditorState({
    required this.uid,
    required this.settings,
    required Iterable<FormProfileSummary> cards,
    required this.nextCursor,
    required this.card,
    this.cardError,
    this.busy = false,
  }) : cards = List.unmodifiable(cards);
  final String uid;
  final EventProfileSettings settings;
  final List<FormProfileSummary> cards;
  final String? nextCursor;
  final FormProfileReview? card;
  final Object? cardError;
  final bool busy;
  EventProfileEditorState pending() => EventProfileEditorState(
    uid: uid,
    settings: settings,
    cards: cards,
    nextCursor: nextCursor,
    card: card,
    cardError: cardError,
    busy: true,
  );
}

@riverpod
class EventProfileEditorController extends _$EventProfileEditorController {
  int _generation = 0, _readEpoch = 0, _pages = 1;
  bool _foreground = true, _explicitCard = false, _saving = false;
  String? _cardId;
  final _requestIds = <String, String>{};
  @override
  Future<EventProfileEditorState> build(String eventId) async {
    _generation++;
    _readEpoch++;
    _pages = 1;
    _cardId = null;
    _explicitCard = false;
    _saving = false;
    _requestIds.clear();
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) throw const SignInRequiredException('edit event profile');
    final generation = _generation, epoch = _readEpoch;
    final result = await _read(uid);
    if (!_current(uid, generation) || !_foreground || epoch != _readEpoch) {
      throw StateError('Event profile review superseded');
    }
    return result;
  }

  bool _current(String uid, int generation) =>
      ref.mounted &&
      generation == _generation &&
      ref.read(uidProvider).asData?.value == uid;
  Future<EventProfileEditorState> _read(String uid) async {
    final repo = ref.read(formProfileRepositoryProvider);
    final settings = await ref
        .read(eventChatRepositoryProvider)
        .profileSettings(uid, eventId);
    final cards = <String, FormProfileSummary>{};
    String? cursor;
    FormProfileReview? card;
    Object? cardError;
    if (settings.canShare && _foreground) {
      try {
        for (var page = 0; page < _pages; page++) {
          final result = await repo.list(cursor: cursor);
          for (final row in result.items) {
            if (row.organizerId == settings.organizerId &&
                row.claimedAt != null &&
                row.cardFieldCount > 0) {
              cards[row.responseId] = row;
            }
          }
          cursor = result.nextCursor;
          if (cursor == null) break;
        }
        final selected = _explicitCard
            ? _cardId
            : settings.selection?.card?.responseId;
        if (selected != null) {
          final reviewed = await repo.review(selected);
          if (eventCardFields(reviewed, settings.organizerId).isNotEmpty) {
            card = reviewed;
          }
        }
      } on Object catch (error) {
        cardError = error;
      }
    }
    return EventProfileEditorState(
      uid: uid,
      settings: settings,
      cards: cards.values,
      nextCursor: cursor,
      card: card,
      cardError: cardError,
    );
  }

  Future<void> refresh({bool preserveDraft = false}) async {
    if (!_foreground || _saving || state.asData?.value.busy == true) return;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    final generation = _generation, epoch = ++_readEpoch;
    final current = state.asData?.value;
    state = preserveDraft && current != null
        ? AsyncData(current.pending())
        : const AsyncLoading();
    try {
      final result = await _read(uid);
      if (_current(uid, generation) && epoch == _readEpoch && _foreground) {
        state = AsyncData(result);
      }
    } on Object catch (error, stack) {
      if (_current(uid, generation) && epoch == _readEpoch) {
        state = AsyncError(error, stack);
      }
    }
  }

  Future<void> chooseCard(
    String? responseId, {
    required String reviewedUid,
  }) async {
    final current = state.asData?.value;
    if (current == null ||
        current.busy ||
        current.uid != reviewedUid ||
        ref.read(uidProvider).asData?.value != reviewedUid) {
      return;
    }
    if (responseId != null &&
        !current.cards.any((row) => row.responseId == responseId)) {
      return;
    }
    _explicitCard = true;
    _cardId = responseId;
    await refresh(preserveDraft: true);
  }

  Future<void> loadMore() async {
    if (state.asData?.value.nextCursor == null ||
        state.asData?.value.busy == true) {
      return;
    }
    _pages++;
    await refresh(preserveDraft: true);
  }

  void setForeground(bool value) {
    if (_foreground == value) return;
    _foreground = value;
    _readEpoch++;
    if (!value) {
      state = const AsyncLoading();
    } else {
      unawaited(refresh());
    }
  }

  Future<EventParticipantProfile?> preview(
    EventProfileSelection selection, {
    required String reviewedUid,
    required int reviewedRevision,
  }) async {
    final current = state.asData?.value;
    if (current == null ||
        current.busy ||
        !_foreground ||
        !current.settings.canShare ||
        current.uid != reviewedUid ||
        current.settings.revision != reviewedRevision ||
        ref.read(uidProvider).asData?.value != reviewedUid) {
      return null;
    }
    final generation = _generation, epoch = ++_readEpoch;
    state = AsyncData(current.pending());
    try {
      final fresh = await ref
          .read(eventChatRepositoryProvider)
          .previewProfile(reviewedUid, current.settings, selection);
      if (!_current(reviewedUid, generation) ||
          epoch != _readEpoch ||
          !_foreground) {
        return null;
      }
      if (fresh.revision != reviewedRevision ||
          fresh.profileRevision != selection.profileRevision ||
          fresh.membershipRevision != selection.membershipRevision ||
          !fresh.canShare ||
          fresh.preview == null) {
        throw StateError('Event profile choices changed. Review them again.');
      }
      state = AsyncData(current);
      return fresh.preview;
    } on Object catch (error, stack) {
      if (_current(reviewedUid, generation) && epoch == _readEpoch) {
        state = AsyncError(error, stack);
      }
      return null;
    }
  }

  Future<bool> save(
    EventProfileSelection? selection, {
    required String reviewedUid,
    required int reviewedRevision,
  }) async {
    final current = state.asData?.value;
    if (current == null ||
        current.busy ||
        _saving ||
        !_foreground ||
        current.uid != reviewedUid ||
        current.settings.revision != reviewedRevision ||
        ref.read(uidProvider).asData?.value != reviewedUid) {
      return false;
    }
    final generation = _generation;
    final epoch = ++_readEpoch;
    final key = jsonEncode([
      reviewedUid,
      eventId,
      reviewedRevision,
      selection?.toJson(),
    ]);
    final requestId = _requestIds.putIfAbsent(
      key,
      () => base64Url.encode(
        List.generate(24, (_) => Random.secure().nextInt(256)),
      ),
    );
    _saving = true;
    state = AsyncData(current.pending());
    try {
      await ref
          .read(eventChatRepositoryProvider)
          .shareProfile(reviewedUid, current.settings, selection, requestId);
      if (!_current(reviewedUid, generation)) return false;
      _requestIds.remove(key);
      _cardId = selection?.card?.responseId;
      _explicitCard = true;
      if (epoch != _readEpoch || !_foreground) return false;
      state = const AsyncLoading();
      _saving = false;
      await refresh();
      return state.hasValue;
    } on Object catch (error, stack) {
      if (_current(reviewedUid, generation) && epoch == _readEpoch) {
        state = AsyncError(error, stack);
      }
      return false;
    } finally {
      if (_current(reviewedUid, generation)) {
        _saving = false;
        if (_foreground && state.isLoading) unawaited(refresh());
      }
    }
  }
}

/// Member profiles have no offline snapshot. Hide on background/account change
/// and recheck membership, blocks and the person's sharing choice while visible.
@riverpod
class EventParticipantProfileController
    extends _$EventParticipantProfileController {
  int _generation = 0, _epoch = 0;
  bool _foreground = true;
  Timer? _timer;
  @override
  Future<EventParticipantProfile> build(
    String eventId,
    String participantUid,
  ) async {
    _generation++;
    _epoch++;
    _timer?.cancel();
    ref.onDispose(() => _timer?.cancel());
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) throw const SignInRequiredException('view event profile');
    final generation = _generation, epoch = _epoch;
    final result = await ref
        .watch(eventChatRepositoryProvider)
        .participantProfile(uid, eventId, participantUid);
    if (!_current(uid, generation) || !_foreground || epoch != _epoch) {
      throw StateError('Event participant profile read superseded');
    }
    _schedule();
    return result;
  }

  bool _current(String uid, int generation) =>
      ref.mounted &&
      generation == _generation &&
      ref.read(uidProvider).asData?.value == uid;
  void _schedule() {
    _timer?.cancel();
    if (_foreground && ref.mounted) {
      _timer = Timer(
        EventChatTiming.participantProfileRefresh,
        () => unawaited(refresh()),
      );
    }
  }

  Future<void> refresh() async {
    if (!_foreground) return;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;
    final generation = _generation, epoch = ++_epoch;
    try {
      final result = await ref
          .read(eventChatRepositoryProvider)
          .participantProfile(uid, eventId, participantUid);
      if (_current(uid, generation) && epoch == _epoch && _foreground) {
        state = AsyncData(result);
      }
    } on Object catch (error, stack) {
      if (_current(uid, generation) && epoch == _epoch) {
        state = AsyncError(error, stack);
      }
    } finally {
      if (_current(uid, generation) && epoch == _epoch) _schedule();
    }
  }

  void setForeground(bool value) {
    if (_foreground == value) return;
    _foreground = value;
    _epoch++;
    _timer?.cancel();
    if (!value) {
      state = const AsyncLoading();
    } else {
      unawaited(refresh());
    }
  }
}
