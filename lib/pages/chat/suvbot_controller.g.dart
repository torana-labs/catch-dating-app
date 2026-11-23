// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'suvbot_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(SuvbotController)
final suvbotControllerProvider = SuvbotControllerProvider._();

final class SuvbotControllerProvider
    extends $NotifierProvider<SuvbotController, void> {
  SuvbotControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'suvbotControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$suvbotControllerHash();

  @$internal
  @override
  SuvbotController create() => SuvbotController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$suvbotControllerHash() => r'142608af730e42b8dcdb8175620689e34d0eed81';

abstract class _$SuvbotController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
