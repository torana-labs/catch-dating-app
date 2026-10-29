import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'form_profiles_controller.g.dart';

class FormProfilesState {
  const FormProfilesState({
    required this.page,
    this.loadingMore = false,
    this.error,
  });
  final FormProfilePage page;
  final bool loadingMore;
  final Object? error;
}

@riverpod
class FormProfilesController extends _$FormProfilesController {
  int _generation = 0;
  @override
  Future<FormProfilesState> build() async {
    _generation++;
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) {
      throw const SignInRequiredException('review form profiles');
    }
    final page = await ref.watch(formProfileRepositoryProvider).list();
    return FormProfilesState(page: page);
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null ||
        current.loadingMore ||
        current.page.nextCursor == null) {
      return;
    }
    final generation = _generation;
    final uid = requireSignedInUid(ref, action: 'review form profiles');
    state = AsyncData(FormProfilesState(page: current.page, loadingMore: true));
    try {
      final page = await ref
          .read(formProfileRepositoryProvider)
          .list(cursor: current.page.nextCursor);
      if (!ref.mounted ||
          generation != _generation ||
          ref.read(uidProvider).asData?.value != uid) {
        return;
      }
      final byId = {
        for (final row in current.page.items) row.responseId: row,
        for (final row in page.items) row.responseId: row,
      };
      state = AsyncData(
        FormProfilesState(
          page: FormProfilePage(
            items: byId.values,
            nextCursor: page.nextCursor,
          ),
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted ||
          generation != _generation ||
          ref.read(uidProvider).asData?.value != uid) {
        return;
      }
      state = AsyncData(FormProfilesState(page: current.page, error: error));
    }
  }
}

@riverpod
Future<FormProfileReview> formProfileReview(Ref ref, String responseId) async {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null) throw const SignInRequiredException('review form profile');
  return ref.watch(formProfileRepositoryProvider).review(responseId);
}

@riverpod
class FormProfileClaimController extends _$FormProfileClaimController {
  static final saveMutation = Mutation<void>();
  @override
  void build() {}

  Future<void> save(
    String reviewedUid,
    ClaimParticipantFormProfileCallableRequest request,
  ) async {
    final uid = requireSignedInUid(ref, action: 'claim form profile');
    if (uid != reviewedUid) {
      throw const SignInRequiredException('review form profile again');
    }
    await ref.read(formProfileRepositoryProvider).claim(request);
    if (!ref.mounted || ref.read(uidProvider).asData?.value != uid) return;
    ref.invalidate(formProfilesControllerProvider);
    ref.invalidate(formProfileReviewProvider(request.responseId));
  }
}

@riverpod
Future<FormProfilePhotoPreview> formProfilePhotoPreview(
  Ref ref,
  String responseId,
  String questionId,
  String assetId,
) async {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null) throw const SignInRequiredException('preview form photo');
  return ref
      .watch(formProfileRepositoryProvider)
      .photoPreview(
        responseId: responseId,
        questionId: questionId,
        assetId: assetId,
      );
}
