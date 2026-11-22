// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'events_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's programmes for the Events tab, live from
/// `organizerProgramViews` with their counts (#2306), archived ones left
/// out. A failed read leaves the Programmes section out rather than failing
/// Events.

@ProviderFor(hostEventsProgrammes)
final hostEventsProgrammesProvider = HostEventsProgrammesFamily._();

/// The organizer's programmes for the Events tab, live from
/// `organizerProgramViews` with their counts (#2306), archived ones left
/// out. A failed read leaves the Programmes section out rather than failing
/// Events.

final class HostEventsProgrammesProvider
    extends
        $FunctionalProvider<
          List<OrganizerProgramListRow>,
          List<OrganizerProgramListRow>,
          List<OrganizerProgramListRow>
        >
    with $Provider<List<OrganizerProgramListRow>> {
  /// The organizer's programmes for the Events tab, live from
  /// `organizerProgramViews` with their counts (#2306), archived ones left
  /// out. A failed read leaves the Programmes section out rather than failing
  /// Events.
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
  $ProviderElement<List<OrganizerProgramListRow>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  List<OrganizerProgramListRow> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventsProgrammes(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<OrganizerProgramListRow> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<OrganizerProgramListRow>>(
        value,
      ),
    );
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
    r'3857992a3a192453ef3c6884d3f2b4670306064e';

/// The organizer's programmes for the Events tab, live from
/// `organizerProgramViews` with their counts (#2306), archived ones left
/// out. A failed read leaves the Programmes section out rather than failing
/// Events.

final class HostEventsProgrammesFamily extends $Family
    with $FunctionalFamilyOverride<List<OrganizerProgramListRow>, String> {
  HostEventsProgrammesFamily._()
    : super(
        retry: null,
        name: r'hostEventsProgrammesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's programmes for the Events tab, live from
  /// `organizerProgramViews` with their counts (#2306), archived ones left
  /// out. A failed read leaves the Programmes section out rather than failing
  /// Events.

  HostEventsProgrammesProvider call(String organizerId) =>
      HostEventsProgrammesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostEventsProgrammesProvider';
}

/// The Events tab: the coming events and the drafts through their
/// listeners, past events through the events read owner, and the
/// programmes. The listeners keep Upcoming and the drafts current; the
/// screen calls [refreshHostEventsHistory] when Create or a workspace
/// returns, so an event published or cancelled there moves to Past.

@ProviderFor(hostEventsController)
final hostEventsControllerProvider = HostEventsControllerFamily._();

/// The Events tab: the coming events and the drafts through their
/// listeners, past events through the events read owner, and the
/// programmes. The listeners keep Upcoming and the drafts current; the
/// screen calls [refreshHostEventsHistory] when Create or a workspace
/// returns, so an event published or cancelled there moves to Past.

final class HostEventsControllerProvider
    extends
        $FunctionalProvider<HostEventsState, HostEventsState, HostEventsState>
    with $Provider<HostEventsState> {
  /// The Events tab: the coming events and the drafts through their
  /// listeners, past events through the events read owner, and the
  /// programmes. The listeners keep Upcoming and the drafts current; the
  /// screen calls [refreshHostEventsHistory] when Create or a workspace
  /// returns, so an event published or cancelled there moves to Past.
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
    r'1cad11b023d41f463905c7c8d3115f63f7a5e896';

/// The Events tab: the coming events and the drafts through their
/// listeners, past events through the events read owner, and the
/// programmes. The listeners keep Upcoming and the drafts current; the
/// screen calls [refreshHostEventsHistory] when Create or a workspace
/// returns, so an event published or cancelled there moves to Past.

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

  /// The Events tab: the coming events and the drafts through their
  /// listeners, past events through the events read owner, and the
  /// programmes. The listeners keep Upcoming and the drafts current; the
  /// screen calls [refreshHostEventsHistory] when Create or a workspace
  /// returns, so an event published or cancelled there moves to Past.

  HostEventsControllerProvider call(HostEventsRequest request) =>
      HostEventsControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventsControllerProvider';
}
