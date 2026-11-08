// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_guests_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Names and photos for guest accounts, keyed by their ids joined with
/// commas so the same set reads once.

@ProviderFor(hostEventGuestNames)
final hostEventGuestNamesProvider = HostEventGuestNamesFamily._();

/// Names and photos for guest accounts, keyed by their ids joined with
/// commas so the same set reads once.

final class HostEventGuestNamesProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, (String, String?)>>,
          Map<String, (String, String?)>,
          FutureOr<Map<String, (String, String?)>>
        >
    with
        $FutureModifier<Map<String, (String, String?)>>,
        $FutureProvider<Map<String, (String, String?)>> {
  /// Names and photos for guest accounts, keyed by their ids joined with
  /// commas so the same set reads once.
  HostEventGuestNamesProvider._({
    required HostEventGuestNamesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventGuestNamesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventGuestNamesHash();

  @override
  String toString() {
    return r'hostEventGuestNamesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, (String, String?)>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, (String, String?)>> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventGuestNames(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventGuestNamesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventGuestNamesHash() =>
    r'53d623c9804172b3842df79aaae96ba00f8c9f61';

/// Names and photos for guest accounts, keyed by their ids joined with
/// commas so the same set reads once.

final class HostEventGuestNamesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, (String, String?)>>,
          String
        > {
  HostEventGuestNamesFamily._()
    : super(
        retry: null,
        name: r'hostEventGuestNamesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Names and photos for guest accounts, keyed by their ids joined with
  /// commas so the same set reads once.

  HostEventGuestNamesProvider call(String uids) =>
      HostEventGuestNamesProvider._(argument: uids, from: this);

  @override
  String toString() => r'hostEventGuestNamesProvider';
}

/// The guest lists, composed from the event, its attendees, its
/// participations (for the guests who asked) and the roster insight view,
/// all listeners.

@ProviderFor(hostEventGuestsController)
final hostEventGuestsControllerProvider = HostEventGuestsControllerFamily._();

/// The guest lists, composed from the event, its attendees, its
/// participations (for the guests who asked) and the roster insight view,
/// all listeners.

final class HostEventGuestsControllerProvider
    extends
        $FunctionalProvider<
          HostEventGuestsState,
          HostEventGuestsState,
          HostEventGuestsState
        >
    with $Provider<HostEventGuestsState> {
  /// The guest lists, composed from the event, its attendees, its
  /// participations (for the guests who asked) and the roster insight view,
  /// all listeners.
  HostEventGuestsControllerProvider._({
    required HostEventGuestsControllerFamily super.from,
    required HostEventRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventGuestsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventGuestsControllerHash();

  @override
  String toString() {
    return r'hostEventGuestsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventGuestsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventGuestsState create(Ref ref) {
    final argument = this.argument as HostEventRequest;
    return hostEventGuestsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventGuestsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventGuestsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventGuestsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventGuestsControllerHash() =>
    r'c2da1bd1820ac16044fd3747f1801b01014f52d1';

/// The guest lists, composed from the event, its attendees, its
/// participations (for the guests who asked) and the roster insight view,
/// all listeners.

final class HostEventGuestsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventGuestsState, HostEventRequest> {
  HostEventGuestsControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventGuestsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The guest lists, composed from the event, its attendees, its
  /// participations (for the guests who asked) and the roster insight view,
  /// all listeners.

  HostEventGuestsControllerProvider call(HostEventRequest request) =>
      HostEventGuestsControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventGuestsControllerProvider';
}
