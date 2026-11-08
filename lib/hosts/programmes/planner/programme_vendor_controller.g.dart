// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_vendor_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The car vendor command the vendor page runs: `upsertTransportVendor`.

@ProviderFor(HostProgrammeVendorCommands)
final hostProgrammeVendorCommandsProvider =
    HostProgrammeVendorCommandsProvider._();

/// The car vendor command the vendor page runs: `upsertTransportVendor`.
final class HostProgrammeVendorCommandsProvider
    extends $NotifierProvider<HostProgrammeVendorCommands, void> {
  /// The car vendor command the vendor page runs: `upsertTransportVendor`.
  HostProgrammeVendorCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProgrammeVendorCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeVendorCommandsHash();

  @$internal
  @override
  HostProgrammeVendorCommands create() => HostProgrammeVendorCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostProgrammeVendorCommandsHash() =>
    r'511ce18bb9b057c3de02b2115cb6dd7611d9178d';

/// The car vendor command the vendor page runs: `upsertTransportVendor`.

abstract class _$HostProgrammeVendorCommands extends $Notifier<void> {
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
