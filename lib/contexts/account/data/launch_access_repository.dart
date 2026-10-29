import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'launch_access_repository.g.dart';

class LaunchAccessRepository {
  const LaunchAccessRepository(this._db);

  static const collectionPath = 'accessApplications';

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _applicationRef(String uid) =>
      _db.collection(collectionPath).doc(uid);

  Future<LaunchAccessApplication?> fetchApplication({required String uid}) =>
      withBackendErrorContext(
        () async {
          final snap = await _applicationRef(uid).get();
          if (!snap.exists) return null;
          return LaunchAccessApplication.fromJson({
            ...snap.data()!,
            'uid': snap.id,
          });
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'fetch launch access application',
          resource: collectionPath,
        ),
      );

  Stream<LaunchAccessApplication?> watchApplication({required String uid}) =>
      withBackendErrorStream(
        () => _applicationRef(uid).snapshots().map((snap) {
          if (!snap.exists) return null;
          return LaunchAccessApplication.fromJson({
            ...snap.data()!,
            'uid': snap.id,
          });
        }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch launch access application',
          resource: collectionPath,
        ),
      );

  Future<void> submitApplication({
    required String uid,
    required LaunchAccessApplicationDraft draft,
  }) => withBackendErrorContext(
    () async {
      final normalized = draft.normalized();
      if (!normalized.canSubmit) {
        throw const ValidationException(
          'Please complete your access application.',
          code: 'launch-access-incomplete',
        );
      }

      final ref = _applicationRef(uid);
      await _db.runTransaction((transaction) async {
        final snap = await transaction.get(ref);
        LaunchAccessApplicationStatus status =
            LaunchAccessApplicationStatus.pending;
        var submissionCount = 1;
        final existingData = snap.data();
        if (snap.exists && existingData != null) {
          final existing = LaunchAccessApplication.fromJson({
            ...existingData,
            'uid': snap.id,
          });
          if (!existing.status.canEditApplication) {
            throw const ValidationException(
              'This access application is already locked for review.',
              code: 'launch-access-locked',
            );
          }
          status = existing.status;
          submissionCount = existing.submissionCount + 1;
        }

        final application = normalized.toApplication(uid: uid);
        final fields = _applicationFields(
          application,
          status: status,
          submissionCount: submissionCount,
          includeCreatedAt: !snap.exists,
        );

        transaction.set(ref, fields, SetOptions(merge: true));
      });
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'submit launch access application',
      resource: collectionPath,
    ),
  );

  Map<String, Object?> _applicationFields(
    LaunchAccessApplication application, {
    required LaunchAccessApplicationStatus status,
    required int submissionCount,
    required bool includeCreatedAt,
  }) {
    return {
      'applicationVersion': application.applicationVersion,
      'status': status.name,
      'city': application.city,
      'role': application.role.name,
      'eventTypes': application.eventTypes.map((e) => e.name).toList(),
      'availabilityWindows': application.availabilityWindows
          .map((e) => e.name)
          .toList(),
      'wantsToHost': application.wantsToHost,
      'inviteCode': application.inviteCode,
      'instagramHandle': application.instagramHandle,
      'referralSource': application.referralSource,
      'whyCatch': application.whyCatch,
      'submissionCount': submissionCount,
      if (includeCreatedAt) 'createdAt': FieldValue.serverTimestamp(),
      'submittedAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }
}

// keepalive: launch access repository is a shared Firestore facade for the
// pre-launch request flow.
@Riverpod(keepAlive: true)
LaunchAccessRepository launchAccessRepository(Ref ref) =>
    LaunchAccessRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<LaunchAccessApplication?> watchLaunchAccessApplication(
  Ref ref,
  String uid,
) => ref.watch(launchAccessRepositoryProvider).watchApplication(uid: uid);
