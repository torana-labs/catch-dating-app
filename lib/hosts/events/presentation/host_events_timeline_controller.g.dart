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
    r'47f8d1ad7c283aa746b3bbb67a595c047ea82fdb';

/// The organizer's unpublished events starting on or after [from], soonest
/// first, as a listener: a draft saved, published or cancelled in Create or
/// a workspace shows on return without a reread.

@ProviderFor(hostEventDrafts)
final hostEventDraftsProvider = HostEventDraftsFamily._();

/// The organizer's unpublished events starting on or after [from], soonest
/// first, as a listener: a draft saved, published or cancelled in Create or
/// a workspace shows on return without a reread.

final class HostEventDraftsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostEventDraftWindow>,
          HostEventDraftWindow,
          Stream<HostEventDraftWindow>
        >
    with
        $FutureModifier<HostEventDraftWindow>,
        $StreamProvider<HostEventDraftWindow> {
  /// The organizer's unpublished events starting on or after [from], soonest
  /// first, as a listener: a draft saved, published or cancelled in Create or
  /// a workspace shows on return without a reread.
  HostEventDraftsProvider._({
    required HostEventDraftsFamily super.from,
    required (String, DateTime) super.argument,
  }) : super(
         retry: null,
         name: r'hostEventDraftsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventDraftsHash();

  @override
  String toString() {
    return r'hostEventDraftsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostEventDraftWindow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostEventDraftWindow> create(Ref ref) {
    final argument = this.argument as (String, DateTime);
    return hostEventDrafts(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventDraftsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventDraftsHash() => r'e89a7213fa3d855b52a0f804e1c854f47c1c8caa';

/// The organizer's unpublished events starting on or after [from], soonest
/// first, as a listener: a draft saved, published or cancelled in Create or
/// a workspace shows on return without a reread.

final class HostEventDraftsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostEventDraftWindow>,
          (String, DateTime)
        > {
  HostEventDraftsFamily._()
    : super(
        retry: null,
        name: r'hostEventDraftsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's unpublished events starting on or after [from], soonest
  /// first, as a listener: a draft saved, published or cancelled in Create or
  /// a workspace shows on return without a reread.

  HostEventDraftsProvider call(String organizerId, DateTime from) =>
      HostEventDraftsProvider._(argument: (organizerId, from), from: this);

  @override
  String toString() => r'hostEventDraftsProvider';
}

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
    r'a611ac1975259fbfbaae8a50880a457536ca9244';

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
