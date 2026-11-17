// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_workspace_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The team members with access to the event's door, read from the event's
/// staff grants once per visit; granting access happens elsewhere.

@ProviderFor(hostEventWorkspaceStaff)
final hostEventWorkspaceStaffProvider = HostEventWorkspaceStaffFamily._();

/// The team members with access to the event's door, read from the event's
/// staff grants once per visit; granting access happens elsewhere.

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
  /// The team members with access to the event's door, read from the event's
  /// staff grants once per visit; granting access happens elsewhere.
  HostEventWorkspaceStaffProvider._({
    required HostEventWorkspaceStaffFamily super.from,
    required HostEventRequest super.argument,
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
    final argument = this.argument as HostEventRequest;
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
    r'58be9bf32b9f3c0d15788e74c5fdf4de7a8afc7d';

/// The team members with access to the event's door, read from the event's
/// staff grants once per visit; granting access happens elsewhere.

final class HostEventWorkspaceStaffFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostEventStaffList>,
          HostEventRequest
        > {
  HostEventWorkspaceStaffFamily._()
    : super(
        retry: null,
        name: r'hostEventWorkspaceStaffProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The team members with access to the event's door, read from the event's
  /// staff grants once per visit; granting access happens elsewhere.

  HostEventWorkspaceStaffProvider call(HostEventRequest request) =>
      HostEventWorkspaceStaffProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventWorkspaceStaffProvider';
}

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales and the arrival message from the setup view's facts,
/// with the cached host report standing in for sales before they exist.

@ProviderFor(hostEventWorkspaceController)
final hostEventWorkspaceControllerProvider =
    HostEventWorkspaceControllerFamily._();

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales and the arrival message from the setup view's facts,
/// with the cached host report standing in for sales before they exist.

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
  /// read; ticket sales and the arrival message from the setup view's facts,
  /// with the cached host report standing in for sales before they exist.
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
    r'e35c67cf7797ab6ceb4541ec7a179f2e2b593adb';

/// The event workspace: the event, its roster insight view and attendees,
/// tonight's plan through their listeners; the door team from the staff
/// read; ticket sales and the arrival message from the setup view's facts,
/// with the cached host report standing in for sales before they exist.

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
  /// read; ticket sales and the arrival message from the setup view's facts,
  /// with the cached host report standing in for sales before they exist.

  HostEventWorkspaceControllerProvider call(HostEventRequest request) =>
      HostEventWorkspaceControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventWorkspaceControllerProvider';
}
