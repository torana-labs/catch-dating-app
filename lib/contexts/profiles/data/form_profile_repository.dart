import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'form_profile_repository.g.dart';

class FormProfileRepository {
  const FormProfileRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<FormProfilePage> list({String? cursor}) async =>
      FormProfilePage.fromMap(
        await _call(
          'listParticipantFormProfiles',
          ListParticipantFormProfilesCallableRequest(
            cursor: cursor,
            limit: 20,
          ).toJson(),
        ),
      );

  Future<FormProfileReview> review(String responseId) async =>
      FormProfileReview.fromMap(
        await _call(
          'getParticipantFormProfile',
          GetParticipantFormProfileCallableRequest(
            responseId: responseId,
          ).toJson(),
        ),
      );

  Future<FormProfilePhotoPreview> photoPreview({
    required String responseId,
    required String questionId,
    required String assetId,
  }) async => FormProfilePhotoPreview.fromMap(
    await _call(
      'getParticipantFormPhoto',
      GetParticipantFormPhotoCallableRequest(
        responseId: responseId,
        questionId: questionId,
        assetId: assetId,
      ).toJson(),
    ),
  );

  Future<void> claim(ClaimParticipantFormProfileCallableRequest request) async {
    await _call('claimParticipantFormProfile', request.toJson());
  }

  Future<Map<Object?, Object?>> _call(
    String operation,
    Map<String, Object?> data,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(operation)
          .call<Object?>(data);
      if (result.data case final Map value) return value;
      throw const FormatException('Invalid form profile response');
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: operation,
      resource: 'participantFormProfileProposals',
    ),
  );
}

@riverpod
FormProfileRepository formProfileRepository(Ref ref) =>
    FormProfileRepository(ref.watch(firebaseFunctionsProvider));
