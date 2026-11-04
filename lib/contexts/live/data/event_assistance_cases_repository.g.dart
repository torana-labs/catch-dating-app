// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_cases_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceCasesRepository)
final eventAssistanceCasesRepositoryProvider =
    EventAssistanceCasesRepositoryProvider._();

final class EventAssistanceCasesRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceCasesRepository,
          EventAssistanceCasesRepository,
          EventAssistanceCasesRepository
        >
    with $Provider<EventAssistanceCasesRepository> {
  EventAssistanceCasesRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceCasesRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCasesRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceCasesRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceCasesRepository create(Ref ref) {
    return eventAssistanceCasesRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceCasesRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceCasesRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceCasesRepositoryHash() =>
    r'6815cb85e646e9fd5ded82e39e5d9b2b51524e29';

@ProviderFor(eventAssistanceCaseCommands)
final eventAssistanceCaseCommandsProvider =
    EventAssistanceCaseCommandsProvider._();

final class EventAssistanceCaseCommandsProvider
    extends
        $FunctionalProvider<
          EventAssistanceCaseCommands,
          EventAssistanceCaseCommands,
          EventAssistanceCaseCommands
        >
    with $Provider<EventAssistanceCaseCommands> {
  EventAssistanceCaseCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceCaseCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCaseCommandsHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceCaseCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceCaseCommands create(Ref ref) {
    return eventAssistanceCaseCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceCaseCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceCaseCommands>(value),
    );
  }
}

String _$eventAssistanceCaseCommandsHash() =>
    r'7ac2466729b0199a5a5129d97104abd40c26f7bb';
