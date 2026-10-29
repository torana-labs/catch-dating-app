// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_attendance_outbox.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostAttendanceOutboxStore)
final hostAttendanceOutboxStoreProvider = HostAttendanceOutboxStoreProvider._();

final class HostAttendanceOutboxStoreProvider
    extends
        $FunctionalProvider<
          HostAttendanceOutboxStore,
          HostAttendanceOutboxStore,
          HostAttendanceOutboxStore
        >
    with $Provider<HostAttendanceOutboxStore> {
  HostAttendanceOutboxStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAttendanceOutboxStoreProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAttendanceOutboxStoreHash();

  @$internal
  @override
  $ProviderElement<HostAttendanceOutboxStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAttendanceOutboxStore create(Ref ref) {
    return hostAttendanceOutboxStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAttendanceOutboxStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAttendanceOutboxStore>(value),
    );
  }
}

String _$hostAttendanceOutboxStoreHash() =>
    r'd9203c59d5bc5766a2f1b3548e5b612f1bab485e';

@ProviderFor(hostAttendanceOutbox)
final hostAttendanceOutboxProvider = HostAttendanceOutboxProvider._();

final class HostAttendanceOutboxProvider
    extends
        $FunctionalProvider<
          HostAttendanceOutbox,
          HostAttendanceOutbox,
          HostAttendanceOutbox
        >
    with $Provider<HostAttendanceOutbox> {
  HostAttendanceOutboxProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAttendanceOutboxProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAttendanceOutboxHash();

  @$internal
  @override
  $ProviderElement<HostAttendanceOutbox> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAttendanceOutbox create(Ref ref) {
    return hostAttendanceOutbox(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAttendanceOutbox value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAttendanceOutbox>(value),
    );
  }
}

String _$hostAttendanceOutboxHash() =>
    r'6cd07bdb5b27581f37b4a8707a673560fe3c7283';
