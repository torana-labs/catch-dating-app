import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpsertOrganizerEventVenueCallableRequest;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_event_venue_repository.g.dart';

class OrganizerEventVenueRepository {
  const OrganizerEventVenueRepository(this._db, this._functions);

  static const collectionPath = 'organizerEventVenues';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<OrganizerEventVenue> get _venuesRef => _db
      .collection(collectionPath)
      .withDocumentIdConverter<OrganizerEventVenue>(
        idField: 'id',
        fromJson: OrganizerEventVenue.fromJson,
        toJson: (venue) => venue.toJson(),
      );

  Stream<List<OrganizerEventVenue>> watchActive(String organizerId) =>
      withBackendErrorStream(
        () => _venuesRef
            .where('organizerId', isEqualTo: organizerId)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snapshot) {
              final venues = snapshot.docs
                  .map((document) => document.data())
                  .where(
                    (venue) => venue.status == OrganizerEventVenueStatus.active,
                  )
                  .toList();
              venues.sort(
                (a, b) =>
                    a.label.toLowerCase().compareTo(b.label.toLowerCase()),
              );
              return venues;
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load organizer saved places',
          resource: collectionPath,
        ),
      );

  Future<OrganizerEventVenue> upsert({
    required String organizerId,
    required String label,
    required Map<String, Object?> meetingLocation,
    String? venueId,
    int? defaultEventCapacity,
    OrganizerEventVenueStatus status = OrganizerEventVenueStatus.active,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('upsertOrganizerEventVenue')
          .call(
            UpsertOrganizerEventVenueCallableRequest(
              organizerId: organizerId,
              venueId: venueId,
              label: label,
              meetingLocation: meetingLocation,
              defaultEventCapacity: defaultEventCapacity,
              status: status.name,
            ).toJson(),
          );
      final data = Map<String, dynamic>.from(response.data as Map);
      return OrganizerEventVenue.fromJson(
        Map<String, dynamic>.from(data['venue'] as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save organizer venue',
      resource: collectionPath,
    ),
  );
}

@riverpod
OrganizerEventVenueRepository organizerEventVenueRepository(Ref ref) =>
    OrganizerEventVenueRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<OrganizerEventVenue>> watchOrganizerEventVenues(
  Ref ref,
  String organizerId,
) => ref.watch(organizerEventVenueRepositoryProvider).watchActive(organizerId);
