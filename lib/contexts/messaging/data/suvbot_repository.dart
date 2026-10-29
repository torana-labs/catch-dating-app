import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show RequestSuvbotDemoOperationCallableRequest;
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/messaging/domain/suvbot_identity.dart';

part 'suvbot_repository.g.dart';

/// Typed response for `listSuvbotDemoActions`.
///
/// Validated by `test/core/callable_dto_contracts_test.dart` against
/// `contracts/callable_responses/list_suvbot_demo_actions_response.schema.json`.
final class ListSuvbotDemoActionsCallableResponse {
  const ListSuvbotDemoActionsCallableResponse({required this.actions});

  factory ListSuvbotDemoActionsCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final actions = map['actions'];
      if (actions is List<Object?>) {
        return ListSuvbotDemoActionsCallableResponse(
          actions: actions
              .map(SuvbotActionItem.fromCallableData)
              .toList(growable: false),
        );
      }
    }

    throw StateError('listSuvbotDemoActions response was malformed.');
  }

  final List<SuvbotActionItem> actions;
}

class SuvbotRepository {
  const SuvbotRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<List<SuvbotActionItem>> fetchActions() => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('listSuvbotDemoActions')
          .call<Object?>();
      return ListSuvbotDemoActionsCallableResponse.fromCallableData(
        result.data,
      ).actions;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load Suvbot controls',
      resource: 'demoOpsRequests',
    ),
  );

  Future<void> requestAction({required String actionId, String? text}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('requestSuvbotDemoOperation')
            .call<Object?>(
              RequestSuvbotDemoOperationCallableRequest(
                action: actionId,
                text: text,
              ).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'ask Suvbot',
          resource: 'demoOpsRequests',
        ),
      );
}

@riverpod
SuvbotRepository suvbotRepository(Ref ref) =>
    SuvbotRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<List<SuvbotActionItem>> suvbotActions(Ref ref) =>
    ref.watch(suvbotRepositoryProvider).fetchActions();
