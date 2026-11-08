// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_ticket_code_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventTicketCodeRepository)
final eventTicketCodeRepositoryProvider = EventTicketCodeRepositoryProvider._();

final class EventTicketCodeRepositoryProvider
    extends
        $FunctionalProvider<
          EventTicketCodeRepository,
          EventTicketCodeRepository,
          EventTicketCodeRepository
        >
    with $Provider<EventTicketCodeRepository> {
  EventTicketCodeRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventTicketCodeRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventTicketCodeRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventTicketCodeRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventTicketCodeRepository create(Ref ref) {
    return eventTicketCodeRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventTicketCodeRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventTicketCodeRepository>(value),
    );
  }
}

String _$eventTicketCodeRepositoryHash() =>
    r'96aec53208700ddea5fb35a8dcb8d4a4b2109001';

/// The signed-in guest's ticket for [eventId]. It fails when they hold no
/// place or ticket codes are not available, and the ticket then shows
/// without a code.

@ProviderFor(eventTicketCode)
final eventTicketCodeProvider = EventTicketCodeFamily._();

/// The signed-in guest's ticket for [eventId]. It fails when they hold no
/// place or ticket codes are not available, and the ticket then shows
/// without a code.

final class EventTicketCodeProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventTicketQrPayload>,
          EventTicketQrPayload,
          FutureOr<EventTicketQrPayload>
        >
    with
        $FutureModifier<EventTicketQrPayload>,
        $FutureProvider<EventTicketQrPayload> {
  /// The signed-in guest's ticket for [eventId]. It fails when they hold no
  /// place or ticket codes are not available, and the ticket then shows
  /// without a code.
  EventTicketCodeProvider._({
    required EventTicketCodeFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventTicketCodeProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventTicketCodeHash();

  @override
  String toString() {
    return r'eventTicketCodeProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<EventTicketQrPayload> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventTicketQrPayload> create(Ref ref) {
    final argument = this.argument as String;
    return eventTicketCode(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventTicketCodeProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventTicketCodeHash() => r'5e35cbc776f1bd133bb2e1ba6bab168d06675a5c';

/// The signed-in guest's ticket for [eventId]. It fails when they hold no
/// place or ticket codes are not available, and the ticket then shows
/// without a code.

final class EventTicketCodeFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<EventTicketQrPayload>, String> {
  EventTicketCodeFamily._()
    : super(
        retry: null,
        name: r'eventTicketCodeProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The signed-in guest's ticket for [eventId]. It fails when they hold no
  /// place or ticket codes are not available, and the ticket then shows
  /// without a code.

  EventTicketCodeProvider call(String eventId) =>
      EventTicketCodeProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventTicketCodeProvider';
}
