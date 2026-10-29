// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'celebration_effects_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(celebrationEffectsController)
final celebrationEffectsControllerProvider =
    CelebrationEffectsControllerProvider._();

final class CelebrationEffectsControllerProvider
    extends
        $FunctionalProvider<
          CelebrationEffectsController,
          CelebrationEffectsController,
          CelebrationEffectsController
        >
    with $Provider<CelebrationEffectsController> {
  CelebrationEffectsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'celebrationEffectsControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$celebrationEffectsControllerHash();

  @$internal
  @override
  $ProviderElement<CelebrationEffectsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CelebrationEffectsController create(Ref ref) {
    return celebrationEffectsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CelebrationEffectsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CelebrationEffectsController>(value),
    );
  }
}

String _$celebrationEffectsControllerHash() =>
    r'a1abc9d0141f4e25e2b2dcf8e44f3872f70e4626';
