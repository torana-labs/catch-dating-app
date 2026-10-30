// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_entry_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventRehearsalSourcePlan)
final eventRehearsalSourcePlanProvider = EventRehearsalSourcePlanFamily._();

final class EventRehearsalSourcePlanProvider
    extends
        $FunctionalProvider<
          AsyncValue<({int guestCount, EventSuccessPlan? plan})>,
          ({int guestCount, EventSuccessPlan? plan}),
          FutureOr<({int guestCount, EventSuccessPlan? plan})>
        >
    with
        $FutureModifier<({int guestCount, EventSuccessPlan? plan})>,
        $FutureProvider<({int guestCount, EventSuccessPlan? plan})> {
  EventRehearsalSourcePlanProvider._({
    required EventRehearsalSourcePlanFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalSourcePlanProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalSourcePlanHash();

  @override
  String toString() {
    return r'eventRehearsalSourcePlanProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<({int guestCount, EventSuccessPlan? plan})>
  $createElement($ProviderPointer pointer) => $FutureProviderElement(pointer);

  @override
  FutureOr<({int guestCount, EventSuccessPlan? plan})> create(Ref ref) {
    final argument = this.argument as String;
    return eventRehearsalSourcePlan(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalSourcePlanProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalSourcePlanHash() =>
    r'bedd2db6d92b768b24da9bd2d90be05d246cb9b5';

final class EventRehearsalSourcePlanFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<({int guestCount, EventSuccessPlan? plan})>,
          String
        > {
  EventRehearsalSourcePlanFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalSourcePlanProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventRehearsalSourcePlanProvider call(String eventId) =>
      EventRehearsalSourcePlanProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventRehearsalSourcePlanProvider';
}

/// One bounded upcoming-event window; failed lookups remain errors rather than
/// being presented as an organizer with no event or no configured defaults.

@ProviderFor(eventRehearsalEntry)
final eventRehearsalEntryProvider = EventRehearsalEntryFamily._();

/// One bounded upcoming-event window; failed lookups remain errors rather than
/// being presented as an organizer with no event or no configured defaults.

final class EventRehearsalEntryProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventRehearsalEntryData>,
          EventRehearsalEntryData,
          FutureOr<EventRehearsalEntryData>
        >
    with
        $FutureModifier<EventRehearsalEntryData>,
        $FutureProvider<EventRehearsalEntryData> {
  /// One bounded upcoming-event window; failed lookups remain errors rather than
  /// being presented as an organizer with no event or no configured defaults.
  EventRehearsalEntryProvider._({
    required EventRehearsalEntryFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalEntryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalEntryHash();

  @override
  String toString() {
    return r'eventRehearsalEntryProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventRehearsalEntryData> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventRehearsalEntryData> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return eventRehearsalEntry(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalEntryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalEntryHash() =>
    r'35e77e8038994d618264a2ef46c5518dcfb128df';

/// One bounded upcoming-event window; failed lookups remain errors rather than
/// being presented as an organizer with no event or no configured defaults.

final class EventRehearsalEntryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventRehearsalEntryData>,
          (String, String?)
        > {
  EventRehearsalEntryFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalEntryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One bounded upcoming-event window; failed lookups remain errors rather than
  /// being presented as an organizer with no event or no configured defaults.

  EventRehearsalEntryProvider call(String organizerId, String? sourceEventId) =>
      EventRehearsalEntryProvider._(
        argument: (organizerId, sourceEventId),
        from: this,
      );

  @override
  String toString() => r'eventRehearsalEntryProvider';
}
