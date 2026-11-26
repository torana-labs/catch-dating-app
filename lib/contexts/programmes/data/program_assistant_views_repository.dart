import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_assistant_views_repository.g.dart';

/// The programme's WhatsApp sender and assistant settings read through
/// listeners (#2306) instead of the sender reads of
/// `listProgramWhatsappThreads`, `listOrganizerMoments` and
/// `getProgramAssistantSettings`: `programSenderViews` holds the
/// display-safe sender (no provider ids or secrets), and
/// `programAssistantSettingViews` the settings with each escalation grant's
/// expiry. The sender is gated on the communications duty and the settings
/// on the coordinator duty (the owner holds both), so cached rows stop when
/// the duty does. Saving stays `updateProgramAssistantSettings`, fenced by
/// the settings revision; the screen shows the result once the trigger
/// rewrites the view.
class ProgramAssistantViewsRepository {
  const ProgramAssistantViewsRepository(
    this._firestore,
    this._access,
    this._clock,
  );

  static const senders = 'programSenderViews';
  static const settings = 'programAssistantSettingViews';

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _senderContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the wedding number',
    resource: senders,
  );

  static const _settingsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the assistant settings',
    resource: settings,
  );

  /// The programme's sender view, live; null while it has none. The guest
  /// inbox duties read it for the inbox header.
  Stream<Map<Object?, Object?>?> watchSenderView(
    String programId,
    String uid,
  ) => _access.gated<Map<Object?, Object?>?>(
    programId,
    uid,
    needs: const {},
    allows: (state) => state.view!.holdsInbox(state.evaluatedAt),
    scopeOf: (state) => 'sender',
    data: (state) => _document(senders, programId, _senderContext),
  );

  /// The assistant settings and the sender, live, with the staff list
  /// rebuilt when a grant ends.
  Stream<ProgramAssistantSettings> watchSettings(String programId, String uid) {
    final source = _access
        .gated<
          ({Map<Object?, Object?>? settings, Map<Object?, Object?>? sender})
        >(
          programId,
          uid,
          needs: const {},
          allows: (state) => state.view!.holdsDuty(
            ProgramStaffDuty.programCoordinator,
            state.evaluatedAt,
          ),
          scopeOf: (state) => 'settings',
          data: (state) => combineLatest(
            _document(settings, programId, _settingsContext),
            _document(senders, programId, _senderContext),
            (settings, sender) => (settings: settings, sender: sender),
          ),
        );
    return clockedListener<
          ({Map<Object?, Object?>? settings, Map<Object?, Object?>? sender}),
          ({ProgramAssistantSettings value, DateTime? next})
        >(
          source,
          clock: _clock,
          build: (views, now) {
            final settings =
                views.settings ??
                (throw const DocumentNotFoundException('assistant settings'));
            return (
              value: programAssistantSettingsFromViews(
                settings,
                views.sender,
                now,
              ),
              next: nextAssistantStaffExpiry(settings, now),
            );
          },
          nextRebuildAt: (built) => built.next,
        )
        .map((built) => built.value);
  }

  Stream<Map<Object?, Object?>?> _document(
    String collection,
    String programId,
    BackendErrorContext context,
  ) => withBackendErrorStream(
    () => _firestore
        .collection(collection)
        .doc(programId)
        .snapshots()
        .map((snapshot) => snapshot.data()),
    context: context,
  );
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
ProgramAssistantViewsRepository programAssistantViewsRepository(Ref ref) =>
    ProgramAssistantViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// The programme's sender view, live.
@riverpod
Stream<Map<Object?, Object?>?> programSenderViewStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view the programme'));
  }
  return ref
      .watch(programAssistantViewsRepositoryProvider)
      .watchSenderView(programId, uid);
}

/// The assistant settings and the wedding's number, live.
@riverpod
Stream<ProgramAssistantSettings> programAssistantSettingsStream(
  Ref ref,
  String programId,
) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(
      const SignInRequiredException('view the assistant settings'),
    );
  }
  return ref
      .watch(programAssistantViewsRepositoryProvider)
      .watchSettings(programId, uid);
}
