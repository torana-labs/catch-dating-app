// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_profile_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostProfileController)
final hostProfileControllerProvider = HostProfileControllerProvider._();

final class HostProfileControllerProvider
    extends $NotifierProvider<HostProfileController, void> {
  HostProfileControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProfileControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostProfileControllerHash();

  @$internal
  @override
  HostProfileController create() => HostProfileController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostProfileControllerHash() =>
    r'26db6d47fd09cd13c324434738dd66ca89cff14e';

abstract class _$HostProfileController extends $Notifier<void> {
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
