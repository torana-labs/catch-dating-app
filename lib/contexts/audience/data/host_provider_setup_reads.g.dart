// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_provider_setup_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The door's provider setup read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// door restarts it only after it ended in an error.

@ProviderFor(hostProviderSetup)
final hostProviderSetupProvider = HostProviderSetupFamily._();

/// The door's provider setup read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// door restarts it only after it ended in an error.

final class HostProviderSetupProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostProviderSetup>,
          HostProviderSetup,
          Stream<HostProviderSetup>
        >
    with
        $FutureModifier<HostProviderSetup>,
        $StreamProvider<HostProviderSetup> {
  /// The door's provider setup read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it; the
  /// door restarts it only after it ended in an error.
  HostProviderSetupProvider._({
    required HostProviderSetupFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostProviderSetupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProviderSetupHash();

  @override
  String toString() {
    return r'hostProviderSetupProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostProviderSetup> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostProviderSetup> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostProviderSetup(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostProviderSetupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProviderSetupHash() => r'c20be0f586377cb79679ad0133cba29adf188846';

/// The door's provider setup read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// door restarts it only after it ended in an error.

final class HostProviderSetupFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<HostProviderSetup>, (String, String)> {
  HostProviderSetupFamily._()
    : super(
        retry: null,
        name: r'hostProviderSetupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door's provider setup read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it; the
  /// door restarts it only after it ended in an error.

  HostProviderSetupProvider call(String organizerId, String eventId) =>
      HostProviderSetupProvider._(argument: (organizerId, eventId), from: this);

  @override
  String toString() => r'hostProviderSetupProvider';
}
