import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_attention_repository.g.dart';

abstract interface class HostAttentionRepository {
  Future<HostAttentionProjection> fetch(String organizerId);
}

class FirebaseHostAttentionRepository implements HostAttentionRepository {
  const FirebaseHostAttentionRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<HostAttentionProjection> fetch(String organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('listOrganizerAttentionItems')
              .call<Object?>(
                ListOrganizerAttentionItemsCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          final projection = HostAttentionProjection.fromCallableData(
            result.data,
          );
          if (projection.organizerId != organizerId) {
            throw const FormatException(
              'Organizer attention projection has the wrong organizer.',
            );
          }
          return projection;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load the Host Today attention queue',
          resource: 'listOrganizerAttentionItems',
        ),
      );
}

@riverpod
HostAttentionRepository hostAttentionRepository(Ref ref) =>
    FirebaseHostAttentionRepository(ref.watch(firebaseFunctionsProvider));
