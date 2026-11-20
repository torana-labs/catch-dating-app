// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_application_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostApplicationRepository)
final hostApplicationRepositoryProvider = HostApplicationRepositoryProvider._();

final class HostApplicationRepositoryProvider
    extends
        $FunctionalProvider<
          HostApplicationRepository,
          HostApplicationRepository,
          HostApplicationRepository
        >
    with $Provider<HostApplicationRepository> {
  HostApplicationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostApplicationRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostApplicationRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostApplicationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostApplicationRepository create(Ref ref) {
    return hostApplicationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostApplicationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostApplicationRepository>(value),
    );
  }
}

String _$hostApplicationRepositoryHash() =>
    r'25c92064f6a08f8947a36cf9e43a370d9b7bba46';

/// One application's review, as a Firestore listener on its read model:
/// writes never invalidate it, the server's triggers deliver them.

@ProviderFor(hostApplicationDetail)
final hostApplicationDetailProvider = HostApplicationDetailFamily._();

/// One application's review, as a Firestore listener on its read model:
/// writes never invalidate it, the server's triggers deliver them.

final class HostApplicationDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostApplicationDetail>,
          HostApplicationDetail,
          Stream<HostApplicationDetail>
        >
    with
        $FutureModifier<HostApplicationDetail>,
        $StreamProvider<HostApplicationDetail> {
  /// One application's review, as a Firestore listener on its read model:
  /// writes never invalidate it, the server's triggers deliver them.
  HostApplicationDetailProvider._({
    required HostApplicationDetailFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostApplicationDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostApplicationDetailHash();

  @override
  String toString() {
    return r'hostApplicationDetailProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostApplicationDetail> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostApplicationDetail> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostApplicationDetail(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostApplicationDetailProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostApplicationDetailHash() =>
    r'3675ad0af42ee25db7f7fd0962aa676b631595ba';

/// One application's review, as a Firestore listener on its read model:
/// writes never invalidate it, the server's triggers deliver them.

final class HostApplicationDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostApplicationDetail>,
          (String, String)
        > {
  HostApplicationDetailFamily._()
    : super(
        retry: null,
        name: r'hostApplicationDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One application's review, as a Firestore listener on its read model:
  /// writes never invalidate it, the server's triggers deliver them.

  HostApplicationDetailProvider call(
    String organizerId,
    String applicationId,
  ) => HostApplicationDetailProvider._(
    argument: (organizerId, applicationId),
    from: this,
  );

  @override
  String toString() => r'hostApplicationDetailProvider';
}
