import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_source_repository.g.dart';

class EventRehearsalSourceRepository {
  const EventRehearsalSourceRepository(this._db);
  final FirebaseFirestore _db;

  // firestore-index: eventAttendees (eventId:ASCENDING, status:ASCENDING)
  Future<int> fetchGuestCount(String eventId) => withBackendErrorContext(
    () async =>
        (await _db
                .collection('eventAttendees')
                .where('eventId', isEqualTo: eventId)
                .where('status', whereIn: const ['registered', 'checkedIn'])
                .limit(ReadLimitPolicy.boundedWorkingSet)
                .count()
                .get())
            .count ??
        0,
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'count the rehearsal source roster',
      resource: 'eventAttendees',
    ),
  );
}

@riverpod
EventRehearsalSourceRepository eventRehearsalSourceRepository(Ref ref) =>
    EventRehearsalSourceRepository(ref.watch(firebaseFirestoreProvider));
