// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_roster_file_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostRosterFileService)
final hostRosterFileServiceProvider = HostRosterFileServiceProvider._();

final class HostRosterFileServiceProvider
    extends
        $FunctionalProvider<
          HostRosterFileService,
          HostRosterFileService,
          HostRosterFileService
        >
    with $Provider<HostRosterFileService> {
  HostRosterFileServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostRosterFileServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostRosterFileServiceHash();

  @$internal
  @override
  $ProviderElement<HostRosterFileService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRosterFileService create(Ref ref) {
    return hostRosterFileService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRosterFileService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRosterFileService>(value),
    );
  }
}

String _$hostRosterFileServiceHash() =>
    r'1cbb2a25da7aee5371386f28778e7708e0029a64';
