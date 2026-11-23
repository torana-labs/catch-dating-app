// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cross_paths_event_consent_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(CrossPathsEventConsentController)
final crossPathsEventConsentControllerProvider =
    CrossPathsEventConsentControllerProvider._();

final class CrossPathsEventConsentControllerProvider
    extends $NotifierProvider<CrossPathsEventConsentController, void> {
  CrossPathsEventConsentControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'crossPathsEventConsentControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$crossPathsEventConsentControllerHash();

  @$internal
  @override
  CrossPathsEventConsentController create() =>
      CrossPathsEventConsentController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$crossPathsEventConsentControllerHash() =>
    r'd9572f4eb334c24bd842f142b2ab5b39d5afc7a6';

abstract class _$CrossPathsEventConsentController extends $Notifier<void> {
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
