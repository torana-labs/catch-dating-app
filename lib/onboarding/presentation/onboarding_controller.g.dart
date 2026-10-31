// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// - [OnboardingData] (freezed) holds multi-step form state that must survive
///   navigation between onboarding pages. This is why [keepAlive] is `true`.
/// - [Mutation]s ([saveProfileMutation], [completeMutation]) handle single-shot
///   async operations while the UI watches their lifecycle.
/// - The controller self-invalidates at the end of [complete] so its state
///   is freed once onboarding is done.
///
/// **When to use this pattern:** Multi-step flows where state must survive
/// navigation and a freezed data class captures the full form state.
// keepalive: onboarding state must survive step navigation until completion or
// explicit invalidation.

@ProviderFor(OnboardingController)
final onboardingControllerProvider = OnboardingControllerProvider._();

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// - [OnboardingData] (freezed) holds multi-step form state that must survive
///   navigation between onboarding pages. This is why [keepAlive] is `true`.
/// - [Mutation]s ([saveProfileMutation], [completeMutation]) handle single-shot
///   async operations while the UI watches their lifecycle.
/// - The controller self-invalidates at the end of [complete] so its state
///   is freed once onboarding is done.
///
/// **When to use this pattern:** Multi-step flows where state must survive
/// navigation and a freezed data class captures the full form state.
// keepalive: onboarding state must survive step navigation until completion or
// explicit invalidation.
final class OnboardingControllerProvider
    extends $NotifierProvider<OnboardingController, OnboardingData> {
  /// **Pattern B: Flow controller with freezed state + Mutations**
  ///
  /// - [OnboardingData] (freezed) holds multi-step form state that must survive
  ///   navigation between onboarding pages. This is why [keepAlive] is `true`.
  /// - [Mutation]s ([saveProfileMutation], [completeMutation]) handle single-shot
  ///   async operations while the UI watches their lifecycle.
  /// - The controller self-invalidates at the end of [complete] so its state
  ///   is freed once onboarding is done.
  ///
  /// **When to use this pattern:** Multi-step flows where state must survive
  /// navigation and a freezed data class captures the full form state.
  // keepalive: onboarding state must survive step navigation until completion or
  // explicit invalidation.
  OnboardingControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'onboardingControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$onboardingControllerHash();

  @$internal
  @override
  OnboardingController create() => OnboardingController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OnboardingData value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OnboardingData>(value),
    );
  }
}

String _$onboardingControllerHash() =>
    r'2656d5ed65eb6d096351e2b9228521c338f13cf0';

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// - [OnboardingData] (freezed) holds multi-step form state that must survive
///   navigation between onboarding pages. This is why [keepAlive] is `true`.
/// - [Mutation]s ([saveProfileMutation], [completeMutation]) handle single-shot
///   async operations while the UI watches their lifecycle.
/// - The controller self-invalidates at the end of [complete] so its state
///   is freed once onboarding is done.
///
/// **When to use this pattern:** Multi-step flows where state must survive
/// navigation and a freezed data class captures the full form state.
// keepalive: onboarding state must survive step navigation until completion or
// explicit invalidation.

abstract class _$OnboardingController extends $Notifier<OnboardingData> {
  OnboardingData build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<OnboardingData, OnboardingData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<OnboardingData, OnboardingData>,
              OnboardingData,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
