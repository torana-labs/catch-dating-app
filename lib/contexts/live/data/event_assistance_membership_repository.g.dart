// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_membership_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceMembershipRepository)
final eventAssistanceMembershipRepositoryProvider =
    EventAssistanceMembershipRepositoryProvider._();

final class EventAssistanceMembershipRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceMembershipRepository,
          EventAssistanceMembershipRepository,
          EventAssistanceMembershipRepository
        >
    with $Provider<EventAssistanceMembershipRepository> {
  EventAssistanceMembershipRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceMembershipRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceMembershipRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceMembershipRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceMembershipRepository create(Ref ref) {
    return eventAssistanceMembershipRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceMembershipRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceMembershipRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceMembershipRepositoryHash() =>
    r'67e9784e7c6efd861bd39eefc9c252599fb20237';
