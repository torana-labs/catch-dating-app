import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/streams/dependent_listeners.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Manager listeners behind the door's roster labels: the event's
/// `hostEventRosterInsightViews` document and, once it names its organizer,
/// that organizer's `hostOrganizerSpendProjections` document. The server
/// writes both ahead of time; rules let a current manager get them.
class HostRosterInsightReads {
  const HostRosterInsightReads(this._db);

  static const views = 'hostEventRosterInsightViews';
  static const projections = 'hostOrganizerSpendProjections';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _db;

  /// The event's roster labels, updated while it is listened to. Until the
  /// view exists the projection is not read and the result is missing.
  Stream<HostEventRosterInsights> watch(
    String eventId, {
    bool includeHostMembership = true,
  }) {
    if (!_documentId.hasMatch(eventId)) {
      throw ArgumentError.value(eventId, 'eventId', 'Invalid event id');
    }
    return dependentListeners<
      Map<String, Object?>?,
      Map<String, Object?>?,
      HostEventRosterInsights
    >(
      _view(eventId),
      keyOf: (view) => switch (view?['organizerId']) {
        final String organizerId when _documentId.hasMatch(organizerId) =>
          organizerId,
        _ => null,
      },
      secondaryFor: _projection,
      combine: (view, projection) => HostEventRosterInsights.fromViews(
        eventId: eventId,
        view: view,
        projection: projection,
        includeHostMembership: includeHostMembership,
      ),
    );
  }

  Stream<Map<String, Object?>?> _view(String eventId) => withBackendErrorStream(
    () => _db
        .collection(views)
        .doc(eventId)
        .snapshots()
        .map((snapshot) => _withMillis(snapshot.data(), 'evaluatedAt')),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event roster customer labels',
      resource: views,
    ),
  );

  Stream<Map<String, Object?>?> _projection(String organizerId) =>
      withBackendErrorStream(
        () => _db
            .collection(projections)
            .doc(organizerId)
            .snapshots()
            .map((snapshot) => snapshot.data()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizer spend thresholds',
          resource: projections,
        ),
      );
}

/// The document with its [field] timestamp as `<field>Millis`.
Map<String, Object?>? _withMillis(Map<String, Object?>? data, String field) {
  if (data == null) return null;
  final value = data[field];
  if (value is! Timestamp) {
    throw FormatException('Roster insight view has no $field.');
  }
  return {...data, '${field}Millis': value.millisecondsSinceEpoch};
}
