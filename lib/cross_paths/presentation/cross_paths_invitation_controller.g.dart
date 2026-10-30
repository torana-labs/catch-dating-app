// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cross_paths_invitation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(CrossPathsInvitationController)
final crossPathsInvitationControllerProvider =
    CrossPathsInvitationControllerProvider._();

final class CrossPathsInvitationControllerProvider
    extends
        $AsyncNotifierProvider<
          CrossPathsInvitationController,
          CrossPathsInvitationReceipt?
        > {
  CrossPathsInvitationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'crossPathsInvitationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$crossPathsInvitationControllerHash();

  @$internal
  @override
  CrossPathsInvitationController create() => CrossPathsInvitationController();
}

String _$crossPathsInvitationControllerHash() =>
    r'5acf5f817c598ea489d385cbaf5026ff5b82c42f';

abstract class _$CrossPathsInvitationController
    extends $AsyncNotifier<CrossPathsInvitationReceipt?> {
  FutureOr<CrossPathsInvitationReceipt?> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<CrossPathsInvitationReceipt?>,
              CrossPathsInvitationReceipt?
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<CrossPathsInvitationReceipt?>,
                CrossPathsInvitationReceipt?
              >,
              AsyncValue<CrossPathsInvitationReceipt?>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
