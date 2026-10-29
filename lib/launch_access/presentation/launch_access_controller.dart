import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'launch_access_controller.g.dart';

// Launch access form state is route-owned. The route also owns text
// controllers, so the provider must reset with the route instead of retaining a
// stale draft after listener disposal.
@riverpod
class LaunchAccessController extends _$LaunchAccessController {
  static final submitMutation = Mutation<void>();

  @override
  LaunchAccessApplicationDraft build() => const LaunchAccessApplicationDraft();

  void seedFromApplication(LaunchAccessApplication application) {
    state = LaunchAccessApplicationDraft(
      city: application.city,
      role: application.role,
      eventTypes: application.eventTypes.toSet(),
      availabilityWindows: application.availabilityWindows.toSet(),
      wantsToHost: application.wantsToHost,
      inviteCode: application.inviteCode ?? '',
      instagramHandle: application.instagramHandle ?? '',
      referralSource: application.referralSource ?? '',
      whyCatch: application.whyCatch ?? '',
    );
  }

  void setCity(String city) => state = state.copyWith(city: city);

  void setRole(LaunchAccessRole role) => state = state.copyWith(role: role);

  void setWantsToHost(bool value) => state = state.copyWith(wantsToHost: value);

  void setInviteCode(String value) => state = state.copyWith(inviteCode: value);

  void setInstagramHandle(String value) =>
      state = state.copyWith(instagramHandle: value);

  void setReferralSource(String value) =>
      state = state.copyWith(referralSource: value);

  void setWhyCatch(String value) => state = state.copyWith(whyCatch: value);

  void setEventTypes(Set<LaunchAccessEventType> values) =>
      state = state.copyWith(eventTypes: values);

  void setAvailabilityWindows(Set<LaunchAccessAvailabilityWindow> values) =>
      state = state.copyWith(availabilityWindows: values);

  Future<void> submit() async {
    final uid = requireSignedInUid(
      ref,
      action: 'submit launch access application',
    );
    await ref
        .read(launchAccessRepositoryProvider)
        .submitApplication(uid: uid, draft: state);
  }
}
