// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_required_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(updateRequiredController)
final updateRequiredControllerProvider = UpdateRequiredControllerProvider._();

final class UpdateRequiredControllerProvider
    extends
        $FunctionalProvider<
          UpdateRequiredController,
          UpdateRequiredController,
          UpdateRequiredController
        >
    with $Provider<UpdateRequiredController> {
  UpdateRequiredControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'updateRequiredControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$updateRequiredControllerHash();

  @$internal
  @override
  $ProviderElement<UpdateRequiredController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  UpdateRequiredController create(Ref ref) {
    return updateRequiredController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(UpdateRequiredController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<UpdateRequiredController>(value),
    );
  }
}

String _$updateRequiredControllerHash() =>
    r'3fc2b7192338a7738d0bcecf3fb01f6b0decbb85';
