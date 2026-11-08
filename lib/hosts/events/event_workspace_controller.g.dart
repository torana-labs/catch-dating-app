// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_workspace_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The team members with access to the event's door, from the event staff
/// read. It is read once per visit; granting access happens elsewhere.

@ProviderFor(hostEventWorkspaceStaff)
final hostEventWorkspaceStaffProvider = HostEventWorkspaceStaffFamily._();

/// The team members with access to the event's door, from the event staff
/// read. It is read once per visit; granting access happens elsewhere.

final class HostEventWorkspaceStaffProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostEventStaffList>,
          HostEventStaffList,
          FutureOr<HostEventStaffList>
        >
    with
        $FutureModifier<HostEventStaffList>,
        $FutureProvider<HostEventStaffList> {
  /// The team members with access to the event's door, from the event staff
  /// read. It is read once per visit; granting access happens elsewhere.
  HostEventWorkspaceStaffProvider._({
    required HostEventWorkspaceStaffFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventWorkspaceStaffProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventWorkspaceStaffHash();

  @override
  String toString() {
    return r'hostEventWorkspaceStaffProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostEventStaffList> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostEventStaffList> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventWorkspaceStaff(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventWorkspaceStaffProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventWorkspaceStaffHash() =>
    r'cde52ebc0fa7ab028f38d071fdb1b31a2892945d';

/// The team members with access to the event's door, from the event staff
/// read. It is read once per visit; granting access happens elsewhere.

final class HostEventWorkspaceStaffFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostEventStaffList>, String> {
  HostEventWorkspaceStaffFamily._()
    : super(
        retry: null,
        name: r'hostEventWorkspaceStaffProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The team members with access to the event's door, from the event staff
  /// read. It is read once per visit; granting access happens elsewhere.

  HostEventWorkspaceStaffProvider call(String eventId) =>
      HostEventWorkspaceStaffProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostEventWorkspaceStaffProvider';
}

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales from the cached host report.

@ProviderFor(hostEventWorkspaceController)
final hostEventWorkspaceControllerProvider =
    HostEventWorkspaceControllerFamily._();

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales from the cached host report.

final class HostEventWorkspaceControllerProvider
    extends
        $FunctionalProvider<
          HostEventWorkspaceState,
          HostEventWorkspaceState,
          HostEventWorkspaceState
        >
    with $Provider<HostEventWorkspaceState> {
  /// The event workspace: the event, its roster insight view and attendees,
  /// tonight's plan through their listeners; the door team from the staff
  /// read; ticket sales from the cached host report.
  HostEventWorkspaceControllerProvider._({
    required HostEventWorkspaceControllerFamily super.from,
    required HostEventRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventWorkspaceControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventWorkspaceControllerHash();

  @override
  String toString() {
    return r'hostEventWorkspaceControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventWorkspaceState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventWorkspaceState create(Ref ref) {
    final argument = this.argument as HostEventRequest;
    return hostEventWorkspaceController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventWorkspaceState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventWorkspaceState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventWorkspaceControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventWorkspaceControllerHash() =>
    r'573c4cdec240fedf37d87b01c3bcfa6b198e459a';

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales from the cached host report.

final class HostEventWorkspaceControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventWorkspaceState, HostEventRequest> {
  HostEventWorkspaceControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventWorkspaceControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The event workspace: the event, its roster insight view and attendees,
  /// tonight's plan through their listeners; the door team from the staff
  /// read; ticket sales from the cached host report.

  HostEventWorkspaceControllerProvider call(HostEventRequest request) =>
      HostEventWorkspaceControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventWorkspaceControllerProvider';
}
