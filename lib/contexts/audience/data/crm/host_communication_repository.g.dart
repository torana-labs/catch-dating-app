// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_communication_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostCommunicationRepository)
final hostCommunicationRepositoryProvider =
    HostCommunicationRepositoryProvider._();

final class HostCommunicationRepositoryProvider
    extends
        $FunctionalProvider<
          HostCommunicationRepository,
          HostCommunicationRepository,
          HostCommunicationRepository
        >
    with $Provider<HostCommunicationRepository> {
  HostCommunicationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostCommunicationRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostCommunicationRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostCommunicationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostCommunicationRepository create(Ref ref) {
    return hostCommunicationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostCommunicationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostCommunicationRepository>(value),
    );
  }
}

String _$hostCommunicationRepositoryHash() =>
    r'0a6da7bc178d12551b9cc580fd3ae8a85e7d48f8';

@ProviderFor(hostCommunicationPlan)
final hostCommunicationPlanProvider = HostCommunicationPlanFamily._();

final class HostCommunicationPlanProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostCommunicationPlan>,
          HostCommunicationPlan,
          FutureOr<HostCommunicationPlan>
        >
    with
        $FutureModifier<HostCommunicationPlan>,
        $FutureProvider<HostCommunicationPlan> {
  HostCommunicationPlanProvider._({
    required HostCommunicationPlanFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostCommunicationPlanProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostCommunicationPlanHash();

  @override
  String toString() {
    return r'hostCommunicationPlanProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostCommunicationPlan> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostCommunicationPlan> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostCommunicationPlan(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostCommunicationPlanProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostCommunicationPlanHash() =>
    r'0016da0a0bbb96af415ab2ce970be773e36ae2aa';

final class HostCommunicationPlanFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostCommunicationPlan>,
          (String, String)
        > {
  HostCommunicationPlanFamily._()
    : super(
        retry: null,
        name: r'hostCommunicationPlanProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostCommunicationPlanProvider call(String organizerId, String contactId) =>
      HostCommunicationPlanProvider._(
        argument: (organizerId, contactId),
        from: this,
      );

  @override
  String toString() => r'hostCommunicationPlanProvider';
}

@ProviderFor(hostManualSendTasks)
final hostManualSendTasksProvider = HostManualSendTasksFamily._();

final class HostManualSendTasksProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostManualSendTaskPage>,
          HostManualSendTaskPage,
          FutureOr<HostManualSendTaskPage>
        >
    with
        $FutureModifier<HostManualSendTaskPage>,
        $FutureProvider<HostManualSendTaskPage> {
  HostManualSendTasksProvider._({
    required HostManualSendTasksFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostManualSendTasksProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostManualSendTasksHash();

  @override
  String toString() {
    return r'hostManualSendTasksProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostManualSendTaskPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostManualSendTaskPage> create(Ref ref) {
    final argument = this.argument as String;
    return hostManualSendTasks(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostManualSendTasksProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostManualSendTasksHash() =>
    r'a35228af129d514b58634457bc61e46a5bed1ae9';

final class HostManualSendTasksFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostManualSendTaskPage>, String> {
  HostManualSendTasksFamily._()
    : super(
        retry: null,
        name: r'hostManualSendTasksProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostManualSendTasksProvider call(String organizerId) =>
      HostManualSendTasksProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostManualSendTasksProvider';
}
