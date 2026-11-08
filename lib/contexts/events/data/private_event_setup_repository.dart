import 'package:catch_dating_app/contexts/events/data/private_event_setup_models.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_view.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_summary_reads.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';

export 'private_event_setup_models.dart';
export 'private_event_setup_view.dart';
export 'read_models/host_event_setup_view_reads.dart'
    show privateEventSetupViewProvider;

// firestore-index: hostEventSummaries (organizerId:ASCENDING, status:ASCENDING, startTimeMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostEventSummaries (organizerId:ASCENDING, status:ASCENDING, startTimeMillis:DESCENDING, __name__:DESCENDING)
class PrivateEventSetupRepository {
  const PrivateEventSetupRepository(
    this._functions, {
    this.summaries,
    this.views,
  });

  final HostEventSummaryReads? summaries;

  /// The manager listener on `hostEventSetupViews`; reads need it.
  final HostEventSetupViewReads? views;

  final FirebaseFunctions _functions;

  Future<PrivateEventCreateReceipt> create({
    required String organizerId,
    required String requestId,
    required PrivateEventBasics basics,
  }) {
    if (!basics.isValid) {
      throw ArgumentError.value(basics, 'basics', 'Invalid first-save fields');
    }
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('createPrivateEventSetup')
            .call<Object?>({
              'organizerId': organizerId,
              'requestId': requestId,
              'basics': basics.toJson(),
            });
        return PrivateEventCreateReceipt.fromResponse(response.data);
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'create private event',
        resource: 'createPrivateEventSetup',
      ),
    );
  }

  /// Creates a weekly series from one set of basics: [basics]' date is the
  /// first event, each later one a week after the one before. Each event has
  /// its own receipt under `$requestId-<index>`, so retrying the same
  /// [requestId] replays the events already made. [sourceEventId], the
  /// event the series repeats, is tagged as its first (index 0) and the new
  /// events count on from 1.
  Future<PrivateEventSeriesReceipt> createSeries({
    required String organizerId,
    required String requestId,
    required PrivateEventBasics basics,
    required int count,
    String? sourceEventId,
  }) {
    if (!basics.isValid || count < 2 || count > 8 || requestId.length > 124) {
      throw ArgumentError.value(basics, 'basics', 'Invalid series');
    }
    final date = DateTime.parse('${basics.localDate}T00:00:00Z');
    const weekdays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('createPrivateEventSeries')
            .call<Object?>({
              'organizerId': organizerId,
              'requestId': requestId,
              'sourceEventId': ?sourceEventId,
              'template': basics.toJson(),
              'cadence': {
                'kind': 'weekly',
                'weekday': weekdays[date.weekday - 1],
                'count': count,
              },
            });
        return PrivateEventSeriesReceipt.fromResponse(response.data);
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'create private event series',
        resource: 'createPrivateEventSeries',
      ),
    );
  }

  Future<PrivateEventCreateReceipt> update(
    PrivateEventBasicsUpdateRequest request,
  ) {
    if (!request.isValid) {
      throw ArgumentError.value(request, 'request', 'Invalid basics update');
    }
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('updatePrivateEventBasics')
            .call<Object?>(request.toJson());
        final receipt = PrivateEventCreateReceipt.fromResponse(response.data);
        if (receipt.eventId != request.eventId) {
          throw const FormatException('Basics update changed event identity');
        }
        return receipt;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'update private event basics',
        resource: 'updatePrivateEventBasics',
      ),
    );
  }

  /// The event as the server last evaluated it for the setup steps, updated
  /// while it is listened to.
  Stream<PrivateEventSetupView> watch({
    required String organizerId,
    required String eventId,
  }) {
    final reads = views;
    if (reads == null) {
      throw StateError('Private event setup reads need the setup view.');
    }
    return reads.watch(organizerId: organizerId, eventId: eventId);
  }

  /// The first complete view that reflects [atLeastRevision]: a missing view
  /// just after create is awaited, an invalid one is a typed error.
  Future<PrivateEventBasicSummary> firstComplete({
    required String organizerId,
    required String eventId,
    int atLeastRevision = 1,
  }) => firstCompleteSetupView(
    watch(organizerId: organizerId, eventId: eventId),
    atLeastRevision: atLeastRevision,
  );

  /// Manager inventory for basics-only private events that cannot be decoded
  /// through the public rich Event model or a device-local draft list.
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) {
    if (!isValidPrivateEventInventoryRequest(
      organizerId: organizerId,
      limit: limit,
      cursor: cursor,
    )) {
      throw ArgumentError('Invalid private event inventory request');
    }
    return withBackendErrorContext(
      () async {
        final page = await summaries?.list(
          organizerId: organizerId,
          scope: scope ?? PrivateEventSetupScope.upcoming,
          limit: limit,
          cursor: cursor,
        );
        if (page != null) return page;
        final response = await _functions
            .httpsCallable('listPrivateEventSetups')
            .call<Object?>({
              'scope': (scope ?? PrivateEventSetupScope.upcoming).name,
              'organizerId': organizerId,
              'limit': limit,
              'cursor': ?cursor,
            });
        return PrivateEventSetupInventoryPage.fromResponse(response.data);
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'list private event setups',
        resource: 'listPrivateEventSetups',
      ),
    );
  }
}
