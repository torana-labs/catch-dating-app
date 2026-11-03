// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_setup_view_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventSetupViewReads)
final hostEventSetupViewReadsProvider = HostEventSetupViewReadsProvider._();

final class HostEventSetupViewReadsProvider
    extends
        $FunctionalProvider<
          HostEventSetupViewReads,
          HostEventSetupViewReads,
          HostEventSetupViewReads
        >
    with $Provider<HostEventSetupViewReads> {
  HostEventSetupViewReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventSetupViewReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventSetupViewReadsHash();

  @$internal
  @override
  $ProviderElement<HostEventSetupViewReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventSetupViewReads create(Ref ref) {
    return hostEventSetupViewReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventSetupViewReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventSetupViewReads>(value),
    );
  }
}

String _$hostEventSetupViewReadsHash() =>
    r'e9a75de6cb10ddd952a097a24fbb43df6e467745';

/// The setup steps' event read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

@ProviderFor(privateEventSetupView)
final privateEventSetupViewProvider = PrivateEventSetupViewFamily._();

/// The setup steps' event read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

final class PrivateEventSetupViewProvider
    extends
        $FunctionalProvider<
          AsyncValue<PrivateEventSetupView>,
          PrivateEventSetupView,
          Stream<PrivateEventSetupView>
        >
    with
        $FutureModifier<PrivateEventSetupView>,
        $StreamProvider<PrivateEventSetupView> {
  /// The setup steps' event read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and writes never invalidate it; a step restarts
  /// it only after it ended in an error.
  PrivateEventSetupViewProvider._({
    required PrivateEventSetupViewFamily super.from,
    required ({String organizerId, String eventId}) super.argument,
  }) : super(
         retry: null,
         name: r'privateEventSetupViewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$privateEventSetupViewHash();

  @override
  String toString() {
    return r'privateEventSetupViewProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<PrivateEventSetupView> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<PrivateEventSetupView> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String eventId});
    return privateEventSetupView(
      ref,
      organizerId: argument.organizerId,
      eventId: argument.eventId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is PrivateEventSetupViewProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$privateEventSetupViewHash() =>
    r'25ec7bdf4fcbc9ade9e254f3e797d2af5908d207';

/// The setup steps' event read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and writes never invalidate it; a step restarts
/// it only after it ended in an error.

final class PrivateEventSetupViewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<PrivateEventSetupView>,
          ({String organizerId, String eventId})
        > {
  PrivateEventSetupViewFamily._()
    : super(
        retry: null,
        name: r'privateEventSetupViewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The setup steps' event read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and writes never invalidate it; a step restarts
  /// it only after it ended in an error.

  PrivateEventSetupViewProvider call({
    required String organizerId,
    required String eventId,
  }) => PrivateEventSetupViewProvider._(
    argument: (organizerId: organizerId, eventId: eventId),
    from: this,
  );

  @override
  String toString() => r'privateEventSetupViewProvider';
}
