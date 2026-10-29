import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'filters_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Saves swipe filter preferences to the user profile document.
/// [saveFiltersMutation] tracks the async lifecycle so the UI can
/// show a loading spinner during the save.
@riverpod
class FiltersController extends _$FiltersController {
  static final saveFiltersMutation = Mutation<void>();

  Future<void>? _saveInFlight;

  @override
  void build() {}

  Future<void> saveFilters({
    required String uid,
    required int minAgePreference,
    required int maxAgePreference,
    required List<String> interestedInGenders,
  }) {
    final existingRequest = _saveInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<void> trackedRequest;
    trackedRequest =
        _saveFilters(
          uid: uid,
          minAgePreference: minAgePreference,
          maxAgePreference: maxAgePreference,
          interestedInGenders: interestedInGenders,
        ).whenComplete(() {
          if (identical(_saveInFlight, trackedRequest)) {
            _saveInFlight = null;
          }
        });
    _saveInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> _saveFilters({
    required String uid,
    required int minAgePreference,
    required int maxAgePreference,
    required List<String> interestedInGenders,
  }) {
    return withBackendErrorContext(
      () async {
        await ref
            .read(userProfileRepositoryProvider)
            .updateUserProfile(
              uid: uid,
              patch: UpdateUserProfilePatch(
                minAgePreference: minAgePreference,
                maxAgePreference: maxAgePreference,
                interestedInGenders: interestedInGenders
                    .map(Gender.values.byName)
                    .toList(growable: false),
              ),
            );
      },
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'save swipe filters',
        resource: 'users',
      ),
    );
  }
}
