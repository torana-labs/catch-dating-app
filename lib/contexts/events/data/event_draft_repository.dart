import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:collection/collection.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'event_draft_repository.g.dart';

class EventDraftRepository {
  EventDraftRepository(this._errorLogger);

  static const _maxDrafts = 5;
  static const _maxStaleDays = 7;

  final ErrorLogger _errorLogger;

  SharedPreferences? _prefsInstance;

  Future<SharedPreferences> get _prefs async {
    _prefsInstance ??= await SharedPreferences.getInstance();
    return _prefsInstance!;
  }

  String _key(String clubId, String userId) => 'event_drafts_${clubId}_$userId';

  Future<List<EventDraft>> loadDrafts({
    required String clubId,
    required String userId,
  }) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(_key(clubId, userId));
    if (jsonString == null) return [];

    try {
      final allDrafts = EventDraft.listFromJson(jsonString);
      final staleThreshold = DateTime.now().subtract(
        const Duration(days: _maxStaleDays),
      );
      final fresh = allDrafts
          .where((d) => d.savedAt.isAfter(staleThreshold))
          .toList();
      if (fresh.length != allDrafts.length) {
        await _writeDrafts(
          clubId: clubId,
          userId: userId,
          drafts: fresh,
          prefs: prefs,
        );
      }
      fresh.sort((a, b) => b.savedAt.compareTo(a.savedAt));
      return fresh;
    } catch (error, stackTrace) {
      _errorLogger.logAppException(
        normalizeBackendError(
          error,
          stackTrace: stackTrace,
          context: const BackendErrorContext(
            service: BackendService.local,
            action: 'load event drafts',
            resource: 'shared_preferences',
          ),
        ),
      );
      return [];
    }
  }

  Future<void> saveDraft({
    required String userId,
    required EventDraft draft,
  }) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(_key(draft.clubId, userId));
    final drafts = jsonString != null
        ? EventDraft.listFromJson(jsonString)
        : <EventDraft>[];

    final existingIndex = drafts.indexWhere((d) => d.id == draft.id);
    if (existingIndex != -1) {
      drafts[existingIndex] = draft;
    } else {
      drafts.add(draft);
      while (drafts.length > _maxDrafts) {
        final oldest = minBy<EventDraft, DateTime>(drafts, (d) => d.savedAt);
        if (oldest != null) drafts.remove(oldest);
      }
    }

    await prefs.setString(
      _key(draft.clubId, userId),
      EventDraft.listToJson(drafts),
    );
  }

  Future<void> deleteDraft({
    required String clubId,
    required String userId,
    required String draftId,
  }) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(_key(clubId, userId));
    if (jsonString == null) return;

    final drafts = EventDraft.listFromJson(jsonString);
    drafts.removeWhere((d) => d.id == draftId);
    await _writeDrafts(
      clubId: clubId,
      userId: userId,
      drafts: drafts,
      prefs: prefs,
    );
  }

  Future<void> deleteAllDrafts({
    required String clubId,
    required String userId,
  }) async {
    final prefs = await _prefs;
    await prefs.remove(_key(clubId, userId));
  }

  Future<void> _writeDrafts({
    required String clubId,
    required String userId,
    required List<EventDraft> drafts,
    required SharedPreferences prefs,
  }) async {
    if (drafts.isEmpty) {
      await prefs.remove(_key(clubId, userId));
    } else {
      await prefs.setString(
        _key(clubId, userId),
        EventDraft.listToJson(drafts),
      );
    }
  }
}

@riverpod
EventDraftRepository eventDraftRepository(Ref ref) =>
    EventDraftRepository(ref.watch(errorLoggerProvider));

@riverpod
Future<List<EventDraft>> organizerEventDrafts(
  Ref ref, {
  required String clubId,
}) async {
  final uid = requireSignedInUid(ref, action: 'load drafts');
  return ref
      .read(eventDraftRepositoryProvider)
      .loadDrafts(clubId: clubId, userId: uid);
}
