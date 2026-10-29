import 'package:catch_dating_app/contexts/events/data/private_event_setup_models.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_summary_reads.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

export 'private_event_setup_models.dart';

// firestore-index: hostEventSummaries (organizerId:ASCENDING, status:ASCENDING, startTimeMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostEventSummaries (organizerId:ASCENDING, status:ASCENDING, startTimeMillis:DESCENDING, __name__:DESCENDING)
class PrivateEventSetupRepository {
  const PrivateEventSetupRepository(this._functions, {this.summaries});

  final HostEventSummaryReads? summaries;

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

  Future<PrivateEventBasicSummary> get({
    required String organizerId,
    required String eventId,
  }) {
    if (organizerId.trim().isEmpty || eventId.trim().isEmpty) {
      throw ArgumentError('Organizer and event ids are required');
    }
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('getPrivateEventSetup')
            .call<Object?>({'organizerId': organizerId, 'eventId': eventId});
        final summary = PrivateEventBasicSummary.fromResponse(response.data);
        if (summary.organizerId != organizerId || summary.eventId != eventId) {
          throw const FormatException('Private event read changed identity');
        }
        return summary;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'read private event setup',
        resource: 'getPrivateEventSetup',
      ),
    );
  }

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
