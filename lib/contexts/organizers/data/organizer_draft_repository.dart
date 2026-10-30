import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'organizer_draft_repository.g.dart';

class OrganizerDraftRepository {
  OrganizerDraftRepository(this._errorLogger);

  static const _maxStaleDays = 7;

  final ErrorLogger _errorLogger;

  SharedPreferences? _prefsInstance;

  Future<SharedPreferences> get _prefs async {
    _prefsInstance ??= await SharedPreferences.getInstance();
    return _prefsInstance!;
  }

  String _key(String userId) => 'club_draft_$userId';

  Future<OrganizerDraft?> loadDraft({required String userId}) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(_key(userId));
    if (jsonString == null) return null;

    try {
      final draft = OrganizerDraft.fromJsonString(jsonString);
      if (draft == null) return null;
      final staleThreshold = DateTime.now().subtract(
        const Duration(days: _maxStaleDays),
      );
      if (draft.savedAt.isBefore(staleThreshold)) {
        await deleteDraft(userId: userId);
        return null;
      }
      return draft;
    } catch (error, stackTrace) {
      _errorLogger.logAppException(
        normalizeBackendError(
          error,
          stackTrace: stackTrace,
          context: const BackendErrorContext(
            service: BackendService.local,
            action: 'load organizer draft',
            resource: 'shared_preferences',
          ),
        ),
      );
      return null;
    }
  }

  Future<void> saveDraft({required String userId, required OrganizerDraft draft}) =>
      withBackendErrorContext(
        () async {
          final prefs = await _prefs;
          await prefs.setString(_key(userId), OrganizerDraft.toJsonString(draft));
        },
        context: const BackendErrorContext(
          service: BackendService.local,
          action: 'save organizer draft',
          resource: 'shared_preferences',
        ),
      );

  Future<void> deleteDraft({required String userId}) => withBackendErrorContext(
    () async {
      final prefs = await _prefs;
      await prefs.remove(_key(userId));
    },
    context: const BackendErrorContext(
      service: BackendService.local,
      action: 'delete organizer draft',
      resource: 'shared_preferences',
    ),
  );
}

@riverpod
OrganizerDraftRepository organizerDraftRepository(Ref ref) =>
    OrganizerDraftRepository(ref.watch(errorLoggerProvider));

@riverpod
Future<OrganizerDraft?> organizerDraft(Ref ref) async {
  final uid = requireSignedInUid(ref, action: 'load organizer draft');
  return ref.read(organizerDraftRepositoryProvider).loadDraft(userId: uid);
}
