// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_manage_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventManageActions)
final hostEventManageActionsProvider = HostEventManageActionsProvider._();

final class HostEventManageActionsProvider
    extends
        $FunctionalProvider<
          HostEventManageActions,
          HostEventManageActions,
          HostEventManageActions
        >
    with $Provider<HostEventManageActions> {
  HostEventManageActionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventManageActionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventManageActionsHash();

  @$internal
  @override
  $ProviderElement<HostEventManageActions> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventManageActions create(Ref ref) {
    return hostEventManageActions(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventManageActions value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventManageActions>(value),
    );
  }
}

String _$hostEventManageActionsHash() =>
    r'64f80ac00ae08abfd750e80fca71fa76856edd5f';
