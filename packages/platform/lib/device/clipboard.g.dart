// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'clipboard.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clipboardSetter)
final clipboardSetterProvider = ClipboardSetterProvider._();

final class ClipboardSetterProvider
    extends
        $FunctionalProvider<ClipboardSetter, ClipboardSetter, ClipboardSetter>
    with $Provider<ClipboardSetter> {
  ClipboardSetterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clipboardSetterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clipboardSetterHash();

  @$internal
  @override
  $ProviderElement<ClipboardSetter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ClipboardSetter create(Ref ref) {
    return clipboardSetter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClipboardSetter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClipboardSetter>(value),
    );
  }
}

String _$clipboardSetterHash() => r'5f4f9221cb2fed3ad30a083e2e4a032549c9b439';

@ProviderFor(clipboardController)
final clipboardControllerProvider = ClipboardControllerProvider._();

final class ClipboardControllerProvider
    extends
        $FunctionalProvider<
          ClipboardController,
          ClipboardController,
          ClipboardController
        >
    with $Provider<ClipboardController> {
  ClipboardControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clipboardControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clipboardControllerHash();

  @$internal
  @override
  $ProviderElement<ClipboardController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ClipboardController create(Ref ref) {
    return clipboardController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClipboardController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClipboardController>(value),
    );
  }
}

String _$clipboardControllerHash() =>
    r'770686764e2ff05be99a8d95a58e0a46b80baa3c';
