// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_attention_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostAttentionRepository)
final hostAttentionRepositoryProvider = HostAttentionRepositoryProvider._();

final class HostAttentionRepositoryProvider
    extends
        $FunctionalProvider<
          HostAttentionRepository,
          HostAttentionRepository,
          HostAttentionRepository
        >
    with $Provider<HostAttentionRepository> {
  HostAttentionRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAttentionRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAttentionRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostAttentionRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAttentionRepository create(Ref ref) {
    return hostAttentionRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAttentionRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAttentionRepository>(value),
    );
  }
}

String _$hostAttentionRepositoryHash() =>
    r'5d9f1462e6585a89bf1a7d8238a44fe9cc2ef66c';

/// The Today attention queue read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it.

@ProviderFor(hostAttentionProjection)
final hostAttentionProjectionProvider = HostAttentionProjectionFamily._();

/// The Today attention queue read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it.

final class HostAttentionProjectionProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAttentionProjection>,
          HostAttentionProjection,
          Stream<HostAttentionProjection>
        >
    with
        $FutureModifier<HostAttentionProjection>,
        $StreamProvider<HostAttentionProjection> {
  /// The Today attention queue read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it.
  HostAttentionProjectionProvider._({
    required HostAttentionProjectionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostAttentionProjectionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAttentionProjectionHash();

  @override
  String toString() {
    return r'hostAttentionProjectionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostAttentionProjection> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostAttentionProjection> create(Ref ref) {
    final argument = this.argument as String;
    return hostAttentionProjection(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAttentionProjectionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAttentionProjectionHash() =>
    r'4d31ca9a84a5232679114011cf0763cdb9002f4c';

/// The Today attention queue read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it.

final class HostAttentionProjectionFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostAttentionProjection>, String> {
  HostAttentionProjectionFamily._()
    : super(
        retry: null,
        name: r'hostAttentionProjectionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The Today attention queue read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it.

  HostAttentionProjectionProvider call(String organizerId) =>
      HostAttentionProjectionProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostAttentionProjectionProvider';
}
