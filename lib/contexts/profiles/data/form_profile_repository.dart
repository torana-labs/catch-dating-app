import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'form_profile_repository.g.dart';

// firestore-index: participantFormProfileViews (uid:ASCENDING,submittedAtMillis:DESCENDING,__name__:DESCENDING)

/// The guest's form profiles, read from their own read models: one
/// `participantFormProfileViews` row per submitted form, their
/// `participantIntakeProfileViews` document and their `users` document.
/// The photo preview and the claim stay callables: one signs URLs, the
/// other rereads every source behind its revision fence.
class FormProfileRepository {
  const FormProfileRepository(this._functions, this._db);
  final FirebaseFunctions _functions;
  final FirebaseFirestore _db;

  static const views = 'participantFormProfileViews';
  static const intakeViews = 'participantIntakeProfileViews';
  static const pageSize = 20;

  /// The keys of the claim's reviewed profile, as the claim payload schema
  /// lists them. A test keeps this in step with the contract.
  static const claimProfileKeys = {
    'name',
    'firstName',
    'lastName',
    'displayName',
    'gender',
    'email',
    'instagramHandle',
    'city',
    'height',
    'occupation',
    'company',
    'education',
    'religion',
    'languages',
    'relationshipGoal',
    'drinking',
    'smoking',
    'workout',
    'diet',
    'children',
    'dateOfBirth',
    'interestedInGenders',
  };

  /// One page of the guest's rows, newest submission first. The cursor is
  /// the last row id of the previous page; a cursor row that has since gone
  /// restarts from the newest, and callers merge rows by response id.
  Future<FormProfilePage> list(String uid, {String? cursor}) =>
      withBackendErrorContext(
        () async {
          final rows = _db.collection(views);
          var query = rows
              .where('uid', isEqualTo: uid)
              .orderBy('submittedAtMillis', descending: true)
              .orderBy(FieldPath.documentId, descending: true);
          if (cursor != null) {
            final last = await rows.doc(cursor).get();
            if (last.exists) query = query.startAfterDocument(last);
          }
          final snapshot = await query.limit(pageSize + 1).get();
          final page = snapshot.docs.take(pageSize).toList();
          return FormProfilePage(
            items: page.map(
              (doc) => FormProfileSummary.fromView(doc.id, doc.data()),
            ),
            nextCursor: snapshot.docs.length > pageSize ? page.last.id : null,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'listParticipantFormProfiles',
          resource: views,
        ),
      );

  /// The review of one submitted form, updated while listened to. A row the
  /// server has confirmed missing, or a deleted account, is unavailable.
  Stream<FormProfileReview> watchReview(String uid, String responseId) {
    final view = _confirmed(_db.collection(views).doc(responseId)).map((doc) {
      final data = doc.data();
      if (data == null || data['uid'] != uid) {
        throw const DocumentNotFoundException('this form profile');
      }
      return data;
    });
    final user = _confirmed(_db.collection('users').doc(uid)).map((doc) {
      final data = doc.data();
      if (data?['deleted'] == true) {
        throw const DocumentNotFoundException('this form profile');
      }
      return data;
    });
    final intake = _confirmed(
      _db.collection(intakeViews).doc(uid),
    ).map((doc) => doc.data());
    return withBackendErrorStream(
      () => combineLatest(
        combineLatest(view, user, (view, user) => (view, user)),
        intake,
        (pair, intake) => FormProfileReview.fromViews(
          responseId: responseId,
          view: pair.$1,
          profileRevision: pair.$2?['profileRevision'] as int? ?? 0,
          currentProfile: currentReviewedProfile(pair.$2),
          intake: intake,
        ),
      ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'getParticipantFormProfile',
        resource: views,
      ),
    );
  }

  /// The reviewed profile values the claim starts from, as the review
  /// callable computed them: only the claim's profile keys, the birth date
  /// as a UTC calendar date, and none until a birth date and gender exist.
  static Map<String, Object?>? currentReviewedProfile(
    Map<String, Object?>? user,
  ) {
    final birthday = user?['dateOfBirth'];
    if (user == null || birthday is! Timestamp || user['gender'] == null) {
      return null;
    }
    return {
      for (final entry in user.entries)
        if (claimProfileKeys.contains(entry.key)) entry.key: entry.value,
      'dateOfBirth': birthday.toDate().toUtc().toIso8601String().substring(
        0,
        10,
      ),
    };
  }

  /// Snapshots, holding back a cached "missing" until the server confirms.
  Stream<DocumentSnapshot<Map<String, dynamic>>> _confirmed(
    DocumentReference<Map<String, dynamic>> ref,
  ) {
    final snapshots = ref.snapshots();
    return snapshots.where((doc) => doc.exists || !doc.metadata.isFromCache);
  }

  Future<FormProfilePhotoPreview> photoPreview({
    required String responseId,
    required String questionId,
    required String assetId,
  }) async => FormProfilePhotoPreview.fromMap(
    await _call(
      'getParticipantFormPhoto',
      GetParticipantFormPhotoCallableRequest(
        responseId: responseId,
        questionId: questionId,
        assetId: assetId,
      ).toJson(),
    ),
  );

  Future<void> claim(ClaimParticipantFormProfileCallableRequest request) async {
    await _call('claimParticipantFormProfile', request.toJson());
  }

  Future<Map<Object?, Object?>> _call(
    String operation,
    Map<String, Object?> data,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(operation)
          .call<Object?>(data);
      if (result.data case final Map value) return value;
      throw const FormatException('Invalid form profile response');
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: operation,
      resource: 'participantFormProfileProposals',
    ),
  );
}

@riverpod
FormProfileRepository formProfileRepository(Ref ref) => FormProfileRepository(
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseFirestoreProvider),
);
