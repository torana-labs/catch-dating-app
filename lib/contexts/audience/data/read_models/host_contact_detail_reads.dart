import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// The directory row of one contact: its `hostContactSummaries` row and
/// whether an account is linked.
typedef HostContactSummaryRow = ({
  HostAudienceContact contact,
  bool linkedAccount,
});

/// The team's newest notes on one contact and whether older ones exist.
typedef HostContactNotes = ({List<HostCustomerNote> notes, bool truncated});

/// Manager listeners behind one person's page, each section its own
/// bounded read: the contact's `hostContactSummaries` row (name, endpoints,
/// tags, revision), its `hostContactDetailViews` document (traits, revenue
/// and the newest event rows, kept by the server's triggers) and its newest
/// `organizerContactNotes`. Rules let a current manager of the contact's
/// organizer read all three.
class HostContactDetailReads {
  const HostContactDetailReads(this._db);

  static const summaries = 'hostContactSummaries';
  static const views = 'hostContactDetailViews';
  static const notes = 'organizerContactNotes';

  final FirebaseFirestore _db;

  /// The contact's directory row while it is listened to. A row of another
  /// organizer, or none, is not this organizer's contact.
  Stream<HostContactSummaryRow> watchSummary(
    String organizerId,
    String contactId,
  ) => withBackendErrorStream(
    () => _db.collection(summaries).doc(contactId).snapshots().map((snapshot) {
      final data = snapshot.data();
      if (data == null || data['organizerId'] != organizerId) {
        throw const FormatException('The contact is not in this directory.');
      }
      final row = data['row'];
      if (row is! Map) throw const FormatException('Contact row is missing.');
      return (
        contact: HostAudienceContact.fromMap(row),
        linkedAccount: data['linkedAccount'] == true,
      );
    }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer contact',
      resource: summaries,
    ),
  );

  /// The contact's traits, revenue and newest event rows while listened to.
  /// Until the server writes the view the read reports it missing.
  Stream<HostContactDetailFacts> watchFacts(
    String organizerId,
    String contactId,
  ) => withBackendErrorStream(
    () => _db.collection(views).doc(contactId).snapshots().map((snapshot) {
      final data = snapshot.data();
      if (data == null || data['organizerId'] != organizerId) {
        throw const FormatException('The contact detail view is missing.');
      }
      return HostContactDetailFacts.fromMap(data);
    }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer contact detail',
      resource: views,
    ),
  );

  /// The newest note on the contact (the person page shows one) and
  /// whether there are older ones.
  // firestore-index: organizerContactNotes (organizerId:ASCENDING, contactId:ASCENDING, createdAt:DESCENDING, __name__:DESCENDING)
  Stream<HostContactNotes> watchNotes(String organizerId, String contactId) =>
      withBackendErrorStream(
        () => _db
            .collection(notes)
            .where('organizerId', isEqualTo: organizerId)
            .where('contactId', isEqualTo: contactId)
            .orderBy('createdAt', descending: true)
            .orderBy(FieldPath.documentId, descending: true)
            .limit(ReadLimitPolicy.lookup + 1)
            .snapshots()
            .map((snapshot) {
              final rows = snapshot.docs
                  .take(ReadLimitPolicy.lookup)
                  .map(_note)
                  .nonNulls
                  .toList(growable: false);
              return (
                notes: rows,
                truncated: snapshot.docs.length > ReadLimitPolicy.lookup,
              );
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizer contact notes',
          resource: notes,
        ),
      );
}

/// One note document as the detail callable returned it; a blank note is
/// not shown.
HostCustomerNote? _note(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
  final data = doc.data();
  final body = data['body'];
  if (body is! String || body.trim().isEmpty) return null;
  final createdAt = data['createdAt'];
  final updatedAt = data['updatedAt'];
  if (createdAt is! Timestamp || updatedAt is! Timestamp) {
    throw const FormatException('Contact note has no time.');
  }
  return HostCustomerNote.fromMap({
    'noteId': doc.id,
    'body': body,
    'authorUid': data['authorUid'],
    'createdAtMillis': createdAt.millisecondsSinceEpoch,
    'updatedAtMillis': updatedAt.millisecondsSinceEpoch,
    'revision': data['revision'],
  });
}
