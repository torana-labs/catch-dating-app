// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_checkpoint_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceCheckpointRepository)
final eventAssistanceCheckpointRepositoryProvider =
    EventAssistanceCheckpointRepositoryProvider._();

final class EventAssistanceCheckpointRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceCheckpointRepository,
          EventAssistanceCheckpointRepository,
          EventAssistanceCheckpointRepository
        >
    with $Provider<EventAssistanceCheckpointRepository> {
  EventAssistanceCheckpointRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceCheckpointRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceCheckpointRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceCheckpointRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceCheckpointRepository create(Ref ref) {
    return eventAssistanceCheckpointRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceCheckpointRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceCheckpointRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceCheckpointRepositoryHash() =>
    r'949ab5dbd8614fde2bc6ae07eeb59888aadc5121';
