// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assignment_feature_choice_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssignmentFeatureChoiceStore)
final eventAssignmentFeatureChoiceStoreProvider =
    EventAssignmentFeatureChoiceStoreProvider._();

final class EventAssignmentFeatureChoiceStoreProvider
    extends
        $FunctionalProvider<
          EventAssignmentFeatureChoiceStore,
          EventAssignmentFeatureChoiceStore,
          EventAssignmentFeatureChoiceStore
        >
    with $Provider<EventAssignmentFeatureChoiceStore> {
  EventAssignmentFeatureChoiceStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssignmentFeatureChoiceStoreProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssignmentFeatureChoiceStoreHash();

  @$internal
  @override
  $ProviderElement<EventAssignmentFeatureChoiceStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssignmentFeatureChoiceStore create(Ref ref) {
    return eventAssignmentFeatureChoiceStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssignmentFeatureChoiceStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssignmentFeatureChoiceStore>(
        value,
      ),
    );
  }
}

String _$eventAssignmentFeatureChoiceStoreHash() =>
    r'b820c2ea0e3c60c87e6c6dfd21684828c18b89ef';
