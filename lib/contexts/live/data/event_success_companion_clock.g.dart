// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_companion_clock.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSuccessCompanionClock)
final eventSuccessCompanionClockProvider =
    EventSuccessCompanionClockProvider._();

final class EventSuccessCompanionClockProvider
    extends
        $FunctionalProvider<AsyncValue<DateTime>, DateTime, Stream<DateTime>>
    with $FutureModifier<DateTime>, $StreamProvider<DateTime> {
  EventSuccessCompanionClockProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessCompanionClockProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessCompanionClockHash();

  @$internal
  @override
  $StreamProviderElement<DateTime> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<DateTime> create(Ref ref) {
    return eventSuccessCompanionClock(ref);
  }
}

String _$eventSuccessCompanionClockHash() =>
    r'b7c42257b92835db1c5fe148487cadac75517e1c';
