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
    r'7c48b79454fbc75e9224cd661e0dd4896ae8de49';

/// The organizer's active by-hand handoffs, a page at a time, every row
/// shown live.

@ProviderFor(HostManualSendTaskPages)
final hostManualSendTaskPagesProvider = HostManualSendTaskPagesFamily._();

/// The organizer's active by-hand handoffs, a page at a time, every row
/// shown live.
final class HostManualSendTaskPagesProvider
    extends
        $StreamNotifierProvider<
          HostManualSendTaskPages,
          LivePages<HostManualSendTask>
        > {
  /// The organizer's active by-hand handoffs, a page at a time, every row
  /// shown live.
  HostManualSendTaskPagesProvider._({
    required HostManualSendTaskPagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostManualSendTaskPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostManualSendTaskPagesHash();

  @override
  String toString() {
    return r'hostManualSendTaskPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostManualSendTaskPages create() => HostManualSendTaskPages();

  @override
  bool operator ==(Object other) {
    return other is HostManualSendTaskPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostManualSendTaskPagesHash() =>
    r'5eb9d16f1ce81a99443e5178d1646775451e27d2';

/// The organizer's active by-hand handoffs, a page at a time, every row
/// shown live.

final class HostManualSendTaskPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostManualSendTaskPages,
          AsyncValue<LivePages<HostManualSendTask>>,
          LivePages<HostManualSendTask>,
          Stream<LivePages<HostManualSendTask>>,
          String
        > {
  HostManualSendTaskPagesFamily._()
    : super(
        retry: null,
        name: r'hostManualSendTaskPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's active by-hand handoffs, a page at a time, every row
  /// shown live.

  HostManualSendTaskPagesProvider call(String organizerId) =>
      HostManualSendTaskPagesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostManualSendTaskPagesProvider';
}

/// The organizer's active by-hand handoffs, a page at a time, every row
/// shown live.

abstract class _$HostManualSendTaskPages
    extends $StreamNotifier<LivePages<HostManualSendTask>> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  Stream<LivePages<HostManualSendTask>> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostManualSendTask>>,
              LivePages<HostManualSendTask>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostManualSendTask>>,
                LivePages<HostManualSendTask>
              >,
              AsyncValue<LivePages<HostManualSendTask>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
