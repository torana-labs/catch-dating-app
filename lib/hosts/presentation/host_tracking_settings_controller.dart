import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_tracking_settings_controller.g.dart';

@riverpod
HostTrackingSettingsController hostTrackingSettingsController(Ref ref) =>
    HostTrackingSettingsController(
      ref.watch(hostTrackingSettingsRepositoryProvider),
      ref,
    );

class HostTrackingSettingsController {
  const HostTrackingSettingsController(this.repository, this.ref);
  final Ref ref;
  final HostTrackingSettingsRepository repository;
  static final saveMutation = Mutation<HostTrackingSettings>();

  Future<HostTrackingSettings> save({
    required HostTrackingSettingsScope scope,
    required HostTrackingSettings current,
    required String? metaPixelId,
    required String? googleMeasurementId,
    required bool enabled,
  }) async {
    void assertCurrentScope() {
      if (!ref.mounted) {
        throw const SignInRequiredException('save tracking settings');
      }
      final auth = ref.read(uidProvider);
      if (auth.isLoading ||
          auth.hasError ||
          requireSignedInUid(ref, action: 'save tracking settings') !=
              scope.accountId ||
          !identical(
            ref.read(authenticatedSessionProvider).asData?.value,
            scope.session,
          ) ||
          current.organizerId != scope.organizerId) {
        throw const SignInRequiredException('save tracking settings');
      }
    }

    assertCurrentScope();
    final result = await repository.save(
      SetOrganizerTrackingSettingsCallableRequest(
        organizerId: current.organizerId,
        expectedRevision: current.revision,
        metaPixelId: metaPixelId,
        googleMeasurementId: googleMeasurementId,
        enabled: enabled,
      ),
    );
    assertCurrentScope();
    return result;
  }
}
