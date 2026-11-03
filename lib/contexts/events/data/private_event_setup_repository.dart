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

  /// Transitional one-shot read for the response offer screen, whose move
  /// to [firstComplete] waits on the shared library rename.
  Future<PrivateEventBasicSummary> get({
    required String organizerId,
    required String eventId,
  }) => firstComplete(organizerId: organizerId, eventId: eventId);

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
