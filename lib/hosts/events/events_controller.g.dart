// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'events_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's programmes, the first page of the programmes read. A
/// failed read leaves the Programmes section out rather than failing Events.

@ProviderFor(hostEventsProgrammes)
final hostEventsProgrammesProvider = HostEventsProgrammesFamily._();

/// The organizer's programmes, the first page of the programmes read. A
/// failed read leaves the Programmes section out rather than failing Events.

final class HostEventsProgrammesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerProgramListRow>>,
          List<OrganizerProgramListRow>,
          FutureOr<List<OrganizerProgramListRow>>
        >
    with
        $FutureModifier<List<OrganizerProgramListRow>>,
        $FutureProvider<List<OrganizerProgramListRow>> {
  /// The organizer's programmes, the first page of the programmes read. A
  /// failed read leaves the Programmes section out rather than failing Events.
  HostEventsProgrammesProvider._({
    required HostEventsProgrammesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventsProgrammesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventsProgrammesHash();

  @override
  String toString() {
    return r'hostEventsProgrammesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<OrganizerProgramListRow>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OrganizerProgramListRow>> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventsProgrammes(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventsProgrammesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventsProgrammesHash() =>
    r'70fa88294f9791011227def0476ca8e570f2b55e';

/// The organizer's programmes, the first page of the programmes read. A
/// failed read leaves the Programmes section out rather than failing Events.

final class HostEventsProgrammesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<OrganizerProgramListRow>>,
          String
        > {
  HostEventsProgrammesFamily._()
    : super(
        retry: null,
        name: r'hostEventsProgrammesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's programmes, the first page of the programmes read. A
  /// failed read leaves the Programmes section out rather than failing Events.

  HostEventsProgrammesProvider call(String organizerId) =>
      HostEventsProgrammesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostEventsProgrammesProvider';
}

/// The Events tab: the coming events through their listener, drafts and
/// past events through the events read owner, and the programmes. Nothing
/// here refreshes on return; the listener keeps Upcoming current.

@ProviderFor(hostEventsController)
final hostEventsControllerProvider = HostEventsControllerFamily._();

/// The Events tab: the coming events through their listener, drafts and
/// past events through the events read owner, and the programmes. Nothing
/// here refreshes on return; the listener keeps Upcoming current.

final class HostEventsControllerProvider
    extends
        $FunctionalProvider<HostEventsState, HostEventsState, HostEventsState>
    with $Provider<HostEventsState> {
  /// The Events tab: the coming events through their listener, drafts and
  /// past events through the events read owner, and the programmes. Nothing
  /// here refreshes on return; the listener keeps Upcoming current.
  HostEventsControllerProvider._({
    required HostEventsControllerFamily super.from,
    required HostEventsRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventsControllerHash();

  @override
  String toString() {
    return r'hostEventsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventsState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostEventsState create(Ref ref) {
    final argument = this.argument as HostEventsRequest;
    return hostEventsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventsControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventsControllerHash() =>
    r'e2f431e78f260ff4cc25da76ccee6ce5a9908761';

/// The Events tab: the coming events through their listener, drafts and
/// past events through the events read owner, and the programmes. Nothing
/// here refreshes on return; the listener keeps Upcoming current.

final class HostEventsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventsState, HostEventsRequest> {
  HostEventsControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The Events tab: the coming events through their listener, drafts and
  /// past events through the events read owner, and the programmes. Nothing
  /// here refreshes on return; the listener keeps Upcoming current.

  HostEventsControllerProvider call(HostEventsRequest request) =>
      HostEventsControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventsControllerProvider';
}
