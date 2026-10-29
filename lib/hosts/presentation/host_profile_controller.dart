import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_profile_controller.g.dart';

@riverpod
class HostProfileController extends _$HostProfileController {
  static final ensureProfileMutation = Mutation<void>();
  static final saveProfileMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> ensureProfile({
    String displayName = StructuredDomainCopy.hostDefaultDisplayName,
  }) async {
    final uid = requireSignedInUid(ref, action: 'create a host profile');
    await ref
        .read(hostProfileRepositoryProvider)
        .ensureHostProfile(uid: uid, displayName: displayName);
  }

  Future<void> saveProfile({
    required String displayName,
    String? roleTitle,
    String? bio,
  }) async {
    final uid = requireSignedInUid(ref, action: 'save a host profile');
    await ref
        .read(hostProfileRepositoryProvider)
        .saveHostProfile(
          uid: uid,
          displayName: displayName,
          roleTitle: roleTitle,
          bio: bio,
        );
  }
}
