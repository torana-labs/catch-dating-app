// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_runtime_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceRuntimeRepository)
final eventAssistanceRuntimeRepositoryProvider =
    EventAssistanceRuntimeRepositoryProvider._();

final class EventAssistanceRuntimeRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceRuntimeRepository,
          EventAssistanceRuntimeRepository,
          EventAssistanceRuntimeRepository
        >
    with $Provider<EventAssistanceRuntimeRepository> {
  EventAssistanceRuntimeRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceRuntimeRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceRuntimeRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceRuntimeRepository create(Ref ref) {
    return eventAssistanceRuntimeRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceRuntimeRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceRuntimeRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceRuntimeRepositoryHash() =>
    r'0042e3f1273be97d7d547ce6de9c7f3b61a52b22';

@ProviderFor(eventAssistanceRuntimeCommands)
final eventAssistanceRuntimeCommandsProvider =
    EventAssistanceRuntimeCommandsProvider._();

final class EventAssistanceRuntimeCommandsProvider
    extends
        $FunctionalProvider<
          EventAssistanceRuntimeCommands,
          EventAssistanceRuntimeCommands,
          EventAssistanceRuntimeCommands
        >
    with $Provider<EventAssistanceRuntimeCommands> {
  EventAssistanceRuntimeCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceRuntimeCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeCommandsHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceRuntimeCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceRuntimeCommands create(Ref ref) {
    return eventAssistanceRuntimeCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceRuntimeCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceRuntimeCommands>(
        value,
      ),
    );
  }
}

String _$eventAssistanceRuntimeCommandsHash() =>
    r'b7d7c7103c9f8b54cb94aba5370f381c290deae2';
