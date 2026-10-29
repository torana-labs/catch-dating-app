// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_draft_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(onboardingDraftRepository)
final onboardingDraftRepositoryProvider = OnboardingDraftRepositoryProvider._();

final class OnboardingDraftRepositoryProvider
    extends
        $FunctionalProvider<
          OnboardingDraftRepository,
          OnboardingDraftRepository,
          OnboardingDraftRepository
        >
    with $Provider<OnboardingDraftRepository> {
  OnboardingDraftRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'onboardingDraftRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$onboardingDraftRepositoryHash();

  @$internal
  @override
  $ProviderElement<OnboardingDraftRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OnboardingDraftRepository create(Ref ref) {
    return onboardingDraftRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OnboardingDraftRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OnboardingDraftRepository>(value),
    );
  }
}

String _$onboardingDraftRepositoryHash() =>
    r'6e4ac3d0f58791bb09c4a06d178ace2e7ec9f694';
