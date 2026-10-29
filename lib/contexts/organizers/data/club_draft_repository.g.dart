// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_draft_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clubDraftRepository)
final clubDraftRepositoryProvider = ClubDraftRepositoryProvider._();

final class ClubDraftRepositoryProvider
    extends
        $FunctionalProvider<
          ClubDraftRepository,
          ClubDraftRepository,
          ClubDraftRepository
        >
    with $Provider<ClubDraftRepository> {
  ClubDraftRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubDraftRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clubDraftRepositoryHash();

  @$internal
  @override
  $ProviderElement<ClubDraftRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ClubDraftRepository create(Ref ref) {
    return clubDraftRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClubDraftRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClubDraftRepository>(value),
    );
  }
}

String _$clubDraftRepositoryHash() =>
    r'9b1d1ade09a292061113ddbf19a418d320d89f6e';

@ProviderFor(clubDraft)
final clubDraftProvider = ClubDraftProvider._();

final class ClubDraftProvider
    extends
        $FunctionalProvider<
          AsyncValue<ClubDraft?>,
          ClubDraft?,
          FutureOr<ClubDraft?>
        >
    with $FutureModifier<ClubDraft?>, $FutureProvider<ClubDraft?> {
  ClubDraftProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubDraftProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clubDraftHash();

  @$internal
  @override
  $FutureProviderElement<ClubDraft?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<ClubDraft?> create(Ref ref) {
    return clubDraft(ref);
  }
}

String _$clubDraftHash() => r'6ef67b781af921e210a0cb127bf162b09a09f94c';
