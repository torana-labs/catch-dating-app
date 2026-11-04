// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_setup_default_view_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventSetupDefaultViewReads)
final hostEventSetupDefaultViewReadsProvider =
    HostEventSetupDefaultViewReadsProvider._();

final class HostEventSetupDefaultViewReadsProvider
    extends
        $FunctionalProvider<
          HostEventSetupDefaultViewReads,
          HostEventSetupDefaultViewReads,
          HostEventSetupDefaultViewReads
        >
    with $Provider<HostEventSetupDefaultViewReads> {
  HostEventSetupDefaultViewReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventSetupDefaultViewReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventSetupDefaultViewReadsHash();

  @$internal
  @override
  $ProviderElement<HostEventSetupDefaultViewReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventSetupDefaultViewReads create(Ref ref) {
    return hostEventSetupDefaultViewReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventSetupDefaultViewReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventSetupDefaultViewReads>(
        value,
      ),
    );
  }
}

String _$hostEventSetupDefaultViewReadsHash() =>
    r'73f24cdfd1a3d1b12cb58c5d37cb25f85e6b118a';

/// The organizer defaults read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

@ProviderFor(managerEventSetupDefaultsView)
final managerEventSetupDefaultsViewProvider =
    ManagerEventSetupDefaultsViewFamily._();

/// The organizer defaults read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

final class ManagerEventSetupDefaultsViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<ManagerEventSetupDefaultsView>,
          ManagerEventSetupDefaultsView,
          Stream<ManagerEventSetupDefaultsView>
        >
    with
        $FutureModifier<ManagerEventSetupDefaultsView>,
        $StreamProvider<ManagerEventSetupDefaultsView> {
  /// The organizer defaults read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and writes never invalidate it; a step restarts
  /// it only after it ended in an error.
  ManagerEventSetupDefaultsViewProvider._({
    required ManagerEventSetupDefaultsViewFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'managerEventSetupDefaultsViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$managerEventSetupDefaultsViewHash();

  @override
  String toString() {
    return r'managerEventSetupDefaultsViewProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ManagerEventSetupDefaultsView> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ManagerEventSetupDefaultsView> create(Ref ref) {
    final argument = this.argument as String;
    return managerEventSetupDefaultsView(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ManagerEventSetupDefaultsViewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$managerEventSetupDefaultsViewHash() =>
    r'a0d00573b9034dec521a261700a56d7c7262ff34';

/// The organizer defaults read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

final class ManagerEventSetupDefaultsViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<ManagerEventSetupDefaultsView>,
          String
        > {
  ManagerEventSetupDefaultsViewFamily._()
    : super(
        retry: null,
        name: r'managerEventSetupDefaultsViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer defaults read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and writes never invalidate it; a step restarts
  /// it only after it ended in an error.

  ManagerEventSetupDefaultsViewProvider call(String organizerId) =>
      ManagerEventSetupDefaultsViewProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'managerEventSetupDefaultsViewProvider';
}
