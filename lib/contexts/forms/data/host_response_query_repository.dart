import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

/// The route opts into this gateway only when the manager callable is live.
abstract interface class HostResponseQueryGateway {
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request);
}

const _queryContext = BackendErrorContext(
  service: BackendService.functions,
  action: 'query form responses',
  resource: 'form_responses',
);

/// Decodes the bare typed query payload and keeps Firebase errors in data.
class HostResponseQueryRepository implements HostResponseQueryGateway {
  const HostResponseQueryRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('queryOrganizerFormResponses')
              .call<Object?>(request.toJson());
          return HostResponseQueryPage.fromCallableData(response.data);
        },
        context: _queryContext,
        mapper: (error, stackTrace, context) {
          final details = error is FirebaseFunctionsException
              ? error.details
              : null;
          if (error is FirebaseFunctionsException &&
              error.code == 'aborted' &&
              details is Map &&
              details['reason'] == 'response-query-stale') {
            return BackendOperationException(
              code: 'response-query-stale',
              message: 'Response results changed. Refresh to continue.',
              cause: error,
              stackTrace: stackTrace,
              context: context,
            );
          }
          return mapMissingCallableAsUnavailable(error, stackTrace, context);
        },
      );
}
