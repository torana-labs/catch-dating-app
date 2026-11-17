// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_requests_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostRequestsRepository)
final hostRequestsRepositoryProvider = HostRequestsRepositoryProvider._();

final class HostRequestsRepositoryProvider
    extends
        $FunctionalProvider<
          HostRequestsRepository,
          HostRequestsRepository,
          HostRequestsRepository
        >
    with $Provider<HostRequestsRepository> {
  HostRequestsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostRequestsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostRequestsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostRequestsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRequestsRepository create(Ref ref) {
    return hostRequestsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRequestsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRequestsRepository>(value),
    );
  }
}

String _$hostRequestsRepositoryHash() =>
    r'e92a15288b4b6734fa8f8ceba2bf156e120d4be2';

/// The organizer's requests read owner. It is a set of Firestore listeners:
/// it declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error. A new account gets a
/// new list.

@ProviderFor(hostOrganizerRequests)
final hostOrganizerRequestsProvider = HostOrganizerRequestsFamily._();

/// The organizer's requests read owner. It is a set of Firestore listeners:
/// it declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error. A new account gets a
/// new list.

final class HostOrganizerRequestsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostRequests>,
          HostRequests,
          Stream<HostRequests>
        >
    with $FutureModifier<HostRequests>, $StreamProvider<HostRequests> {
  /// The organizer's requests read owner. It is a set of Firestore listeners:
  /// it declares no cache tags or lifetime, and writes never invalidate it; a
  /// screen restarts it only after it ended in an error. A new account gets a
  /// new list.
  HostOrganizerRequestsProvider._({
    required HostOrganizerRequestsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOrganizerRequestsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerRequestsHash();

  @override
  String toString() {
    return r'hostOrganizerRequestsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostRequests> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostRequests> create(Ref ref) {
    final argument = this.argument as String;
    return hostOrganizerRequests(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerRequestsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerRequestsHash() =>
    r'd71f421a9ee51fe6228afbbfa946badd898577f2';

/// The organizer's requests read owner. It is a set of Firestore listeners:
/// it declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error. A new account gets a
/// new list.

final class HostOrganizerRequestsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostRequests>, String> {
  HostOrganizerRequestsFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerRequestsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's requests read owner. It is a set of Firestore listeners:
  /// it declares no cache tags or lifetime, and writes never invalidate it; a
  /// screen restarts it only after it ended in an error. A new account gets a
  /// new list.

  HostOrganizerRequestsProvider call(String organizerId) =>
      HostOrganizerRequestsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerRequestsProvider';
}
