// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_draft_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerDraftRepository)
final organizerDraftRepositoryProvider = OrganizerDraftRepositoryProvider._();

final class OrganizerDraftRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerDraftRepository,
          OrganizerDraftRepository,
          OrganizerDraftRepository
        >
    with $Provider<OrganizerDraftRepository> {
  OrganizerDraftRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerDraftRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerDraftRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerDraftRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerDraftRepository create(Ref ref) {
    return organizerDraftRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerDraftRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerDraftRepository>(value),
    );
  }
}

String _$organizerDraftRepositoryHash() =>
    r'becbc05537d0b029f41100ab1407fc15b94dcca2';

@ProviderFor(organizerDraft)
final organizerDraftProvider = OrganizerDraftProvider._();

final class OrganizerDraftProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerDraft?>,
          OrganizerDraft?,
          FutureOr<OrganizerDraft?>
        >
    with $FutureModifier<OrganizerDraft?>, $FutureProvider<OrganizerDraft?> {
  OrganizerDraftProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerDraftProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerDraftHash();

  @$internal
  @override
  $FutureProviderElement<OrganizerDraft?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<OrganizerDraft?> create(Ref ref) {
    return organizerDraft(ref);
  }
}

String _$organizerDraftHash() => r'a2126216014f5aa68a9109faa86a50266437f833';
