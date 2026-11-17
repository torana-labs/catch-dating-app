import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_summary_reads.g.dart';

/// The first unpublished events of one live draft list, and whether more
/// follow.
class HostEventDraftWindow {
  const HostEventDraftWindow({required this.events, required this.hasMore});

  final List<PrivateEventSetupInventoryItem> events;
  final bool hasMore;
}

/// The unpublished event inventory from `hostEventSummaries`, as a
/// listener. Published events are read from `events` directly.
class HostEventSummaryReads {
  const HostEventSummaryReads(this.reader);
  final HostSummaryReader reader;
  static const marker = 'eventSummaryVersion';

  /// The first [limit] active unpublished events starting at or after
  /// [from], soonest first, while they are listened to: a draft saved,
  /// published or cancelled elsewhere shows at once.
  Stream<HostEventDraftWindow> watchDrafts({
    required String organizerId,
    required DateTime from,
    required int limit,
  }) => reader
      .watchWindow(
        collection: 'hostEventSummaries',
        organizerId: organizerId,
        orderField: 'startTimeMillis',
        descending: false,
        limit: limit,
        marker: marker,
        equalities: const {'status': 'active'},
        lowerInclusive: from.millisecondsSinceEpoch,
      )
      .map(
        (window) => HostEventDraftWindow(
          events: [
            for (final doc in window.documents)
              PrivateEventSetupInventoryItem.fromResponse(doc['row']),
          ],
          hasMore: window.hasMore,
        ),
      );
}

/// The signed-in manager's `hostEventSummaries` listener.
@riverpod
HostEventSummaryReads hostEventSummaryReads(Ref ref) => HostEventSummaryReads(
  HostSummaryReader(
    ref.watch(firebaseFirestoreProvider),
    actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
  ),
);
