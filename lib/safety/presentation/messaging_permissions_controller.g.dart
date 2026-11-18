// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'messaging_permissions_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(MessagingPermissionsController)
final messagingPermissionsControllerProvider =
    MessagingPermissionsControllerProvider._();

final class MessagingPermissionsControllerProvider
    extends
        $AsyncNotifierProvider<
          MessagingPermissionsController,
          MessagingPermissionsState
        > {
  MessagingPermissionsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'messagingPermissionsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$messagingPermissionsControllerHash();

  @$internal
  @override
  MessagingPermissionsController create() => MessagingPermissionsController();
}

String _$messagingPermissionsControllerHash() =>
    r'25059130e50f03a88469e079a14015fe8ecbdeaa';

abstract class _$MessagingPermissionsController
    extends $AsyncNotifier<MessagingPermissionsState> {
  FutureOr<MessagingPermissionsState> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<MessagingPermissionsState>,
              MessagingPermissionsState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<MessagingPermissionsState>,
                MessagingPermissionsState
              >,
              AsyncValue<MessagingPermissionsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
