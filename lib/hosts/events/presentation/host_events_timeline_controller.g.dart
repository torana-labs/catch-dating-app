// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_events_timeline_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(privateEventSetupTimelineRepository)
final privateEventSetupTimelineRepositoryProvider =
    PrivateEventSetupTimelineRepositoryProvider._();

final class PrivateEventSetupTimelineRepositoryProvider
    extends
        $FunctionalProvider<
          PrivateEventSetupRepository,
          PrivateEventSetupRepository,
          PrivateEventSetupRepository
        >
    with $Provider<PrivateEventSetupRepository> {
  PrivateEventSetupTimelineRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'privateEventSetupTimelineRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$privateEventSetupTimelineRepositoryHash();

  @$internal
  @override
  $ProviderElement<PrivateEventSetupRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PrivateEventSetupRepository create(Ref ref) {
    return privateEventSetupTimelineRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PrivateEventSetupRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PrivateEventSetupRepository>(value),
    );
  }
}

String _$privateEventSetupTimelineRepositoryHash() =>
    r'e729f2bbf842f1b1530f7e57a4de4a6c6acaf36f';

@ProviderFor(HostEventsTimelineController)
final hostEventsTimelineControllerProvider =
    HostEventsTimelineControllerFamily._();

final class HostEventsTimelineControllerProvider
    extends
        $AsyncNotifierProvider<
          HostEventsTimelineController,
          HostEventsTimelineData
        > {
  HostEventsTimelineControllerProvider._({
    required HostEventsTimelineControllerFamily super.from,
    required HostEventsTimelineRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventsTimelineControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventsTimelineControllerHash();

  @override
  String toString() {
    return r'hostEventsTimelineControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostEventsTimelineController create() => HostEventsTimelineController();

  @override
  bool operator ==(Object other) {
    return other is HostEventsTimelineControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventsTimelineControllerHash() =>
    r'a85619f404f3b62c4a46c33add3575f39f1a8449';

final class HostEventsTimelineControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostEventsTimelineController,
          AsyncValue<HostEventsTimelineData>,
          HostEventsTimelineData,
          FutureOr<HostEventsTimelineData>,
          HostEventsTimelineRequest
        > {
  HostEventsTimelineControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventsTimelineControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostEventsTimelineControllerProvider call(
    HostEventsTimelineRequest request,
  ) => HostEventsTimelineControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventsTimelineControllerProvider';
}

abstract class _$HostEventsTimelineController
    extends $AsyncNotifier<HostEventsTimelineData> {
  late final _$args = ref.$arg as HostEventsTimelineRequest;
  HostEventsTimelineRequest get request => _$args;

  FutureOr<HostEventsTimelineData> build(HostEventsTimelineRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<HostEventsTimelineData>, HostEventsTimelineData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostEventsTimelineData>,
                HostEventsTimelineData
              >,
              AsyncValue<HostEventsTimelineData>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
