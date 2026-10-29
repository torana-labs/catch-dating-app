// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_group_staff_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceGroupStaffRepository)
final eventAssistanceGroupStaffRepositoryProvider =
    EventAssistanceGroupStaffRepositoryProvider._();

final class EventAssistanceGroupStaffRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceGroupStaffRepository,
          EventAssistanceGroupStaffRepository,
          EventAssistanceGroupStaffRepository
        >
    with $Provider<EventAssistanceGroupStaffRepository> {
  EventAssistanceGroupStaffRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceGroupStaffRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceGroupStaffRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceGroupStaffRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceGroupStaffRepository create(Ref ref) {
    return eventAssistanceGroupStaffRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceGroupStaffRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceGroupStaffRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceGroupStaffRepositoryHash() =>
    r'ebc14a7ff436bd073761dafdf9263c2fd221420a';
