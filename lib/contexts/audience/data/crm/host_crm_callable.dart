import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

Future<T> callHostCrm<T>(
  FirebaseFunctions functions, {
  required String name,
  required Map<String, Object?> payload,
  required String action,
  required T Function(Object?) parse,
}) => withBackendErrorContext(
  () async {
    final result = await functions.httpsCallable(name).call<Object?>(payload);
    return parse(result.data);
  },
  context: BackendErrorContext(
    service: BackendService.functions,
    action: action,
    resource: name,
  ),
);
