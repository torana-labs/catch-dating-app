// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_claims_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerClaimsRepository)
final organizerClaimsRepositoryProvider = OrganizerClaimsRepositoryProvider._();

final class OrganizerClaimsRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerClaimsRepository,
          OrganizerClaimsRepository,
          OrganizerClaimsRepository
        >
    with $Provider<OrganizerClaimsRepository> {
  OrganizerClaimsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerClaimsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerClaimsRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerClaimsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerClaimsRepository create(Ref ref) {
    return organizerClaimsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerClaimsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerClaimsRepository>(value),
    );
  }
}

String _$organizerClaimsRepositoryHash() =>
    r'1cb2cc32f2ab146618a9b970b4968f7d242f5568';
