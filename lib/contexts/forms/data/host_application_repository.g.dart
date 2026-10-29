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
    r'c0073b9e1ad3d65345e4f5db3664ce0931eef798';

@ProviderFor(hostApplications)
final hostApplicationsProvider = HostApplicationsFamily._();

final class HostApplicationsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostApplicationPage>,
          HostApplicationPage,
          FutureOr<HostApplicationPage>
        >
    with
        $FutureModifier<HostApplicationPage>,
        $FutureProvider<HostApplicationPage> {
  HostApplicationsProvider._({
    required HostApplicationsFamily super.from,
    required HostApplicationListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostApplicationsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostApplicationsHash();

  @override
  String toString() {
    return r'hostApplicationsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostApplicationPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostApplicationPage> create(Ref ref) {
    final argument = this.argument as HostApplicationListRequest;
    return hostApplications(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostApplicationsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostApplicationsHash() => r'222bbe5dbaa95c3629a350f78de6d116f3d19c82';

final class HostApplicationsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostApplicationPage>,
          HostApplicationListRequest
        > {
  HostApplicationsFamily._()
    : super(
        retry: null,
        name: r'hostApplicationsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostApplicationsProvider call(HostApplicationListRequest request) =>
      HostApplicationsProvider._(argument: request, from: this);

  @override
  String toString() => r'hostApplicationsProvider';
}

@ProviderFor(hostApplicationDetail)
final hostApplicationDetailProvider = HostApplicationDetailFamily._();

final class HostApplicationDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostApplicationDetail>,
          HostApplicationDetail,
          FutureOr<HostApplicationDetail>
        >
    with
        $FutureModifier<HostApplicationDetail>,
        $FutureProvider<HostApplicationDetail> {
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
  $FutureProviderElement<HostApplicationDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostApplicationDetail> create(Ref ref) {
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
    r'9945708dda2d460b78c558f17dcacb432401c036';

final class HostApplicationDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostApplicationDetail>,
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
