// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_moments_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerMomentsRepository)
final organizerMomentsRepositoryProvider =
    OrganizerMomentsRepositoryProvider._();

final class OrganizerMomentsRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerMomentsRepository,
          OrganizerMomentsRepository,
          OrganizerMomentsRepository
        >
    with $Provider<OrganizerMomentsRepository> {
  OrganizerMomentsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerMomentsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerMomentsRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerMomentsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerMomentsRepository create(Ref ref) {
    return organizerMomentsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerMomentsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerMomentsRepository>(value),
    );
  }
}

String _$organizerMomentsRepositoryHash() =>
    r'3f25e7b8fdf0489786107c118fd02d2d1337b068';
