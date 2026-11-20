import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// The manager listener behind one application's review: its
/// `hostApplicationDetailViews` document, which the server's triggers keep
/// equal to what `getOrganizerApplicationDetail` returns (the submitted
/// answers, none once the response is withdrawn, outreach derived from
/// them, the People link and the applicant's membership). Rules let a
/// current manager of the application's organizer get it by id.
class HostApplicationDetailReads {
  const HostApplicationDetailReads(this._db);

  static const views = 'hostApplicationDetailViews';

  final FirebaseFirestore _db;

  /// The detail map, in the callable's shape, while it is listened to. A
  /// view of another organizer, or one the server has not written yet, is
  /// reported missing.
  Stream<Map<String, Object?>> watch(
    String organizerId,
    String applicationId,
  ) => withBackendErrorStream(
    () => _db.collection(views).doc(applicationId).snapshots().map((snapshot) {
      final data = snapshot.data();
      final detail = data?['detail'];
      if (data == null ||
          data['organizerId'] != organizerId ||
          detail is! Map<String, Object?>) {
        throw const FormatException('The application view is missing.');
      }
      return detail;
    }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer application detail',
      resource: views,
    ),
  );
}
