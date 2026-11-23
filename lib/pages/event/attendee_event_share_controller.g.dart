// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'attendee_event_share_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(attendeeEventShareActions)
final attendeeEventShareActionsProvider = AttendeeEventShareActionsProvider._();

final class AttendeeEventShareActionsProvider
    extends
        $FunctionalProvider<
          AttendeeEventShareActions,
          AttendeeEventShareActions,
          AttendeeEventShareActions
        >
    with $Provider<AttendeeEventShareActions> {
  AttendeeEventShareActionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'attendeeEventShareActionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$attendeeEventShareActionsHash();

  @$internal
  @override
  $ProviderElement<AttendeeEventShareActions> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AttendeeEventShareActions create(Ref ref) {
    return attendeeEventShareActions(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AttendeeEventShareActions value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AttendeeEventShareActions>(value),
    );
  }
}

String _$attendeeEventShareActionsHash() =>
    r'8b6db28dfa178556cd5af739152cc8d04152a0d1';
