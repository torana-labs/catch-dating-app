import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PublicProfileController', () {
    test(
      'delegates block and report actions to the safety repository',
      () async {
        final repository = _FakeSafetyRepository();
        final container = ProviderContainer(
          overrides: [safetyRepositoryProvider.overrideWithValue(repository)],
        );
        addTearDown(container.dispose);

        final controller = container.read(
          publicProfileControllerProvider.notifier,
        );

        await controller.blockUser(targetUserId: 'target-1');
        await controller.reportUser(
          targetUserId: 'target-2',
          reasonCode: 'spam',
        );

        expect(repository.blockedTargetUserId, 'target-1');
        expect(repository.reportedTargetUserId, 'target-2');
        expect(repository.reportReasonCode, 'spam');
      },
    );
  });
}

class _FakeSafetyRepository extends Fake implements SafetyRepository {
  String? blockedTargetUserId;
  String? reportedTargetUserId;
  String? reportReasonCode;

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {
    blockedTargetUserId = targetUserId;
  }

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {
    reportedTargetUserId = targetUserId;
    reportReasonCode = reasonCode;
  }
}
