// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(authInitialCountryDialCode)
final authInitialCountryDialCodeProvider =
    AuthInitialCountryDialCodeProvider._();

final class AuthInitialCountryDialCodeProvider
    extends $FunctionalProvider<String, String, String>
    with $Provider<String> {
  AuthInitialCountryDialCodeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authInitialCountryDialCodeProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authInitialCountryDialCodeHash();

  @$internal
  @override
  $ProviderElement<String> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String create(Ref ref) {
    return authInitialCountryDialCode(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$authInitialCountryDialCodeHash() =>
    r'6e46cfda3673f7bcff6a44bc1d6e69e69a2c5e92';

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// Owns the phone-auth screen state while the user moves between phone entry
/// and OTP verification. [sendOtpMutation] and [verifyOtpMutation] expose the
/// async operation lifecycle to the UI; local text/focus/timer concerns stay in
/// the widgets.
///
/// This provider is keepAlive so the OTP step survives route rebuilds during
/// authentication. Call [reset] or invalidate the provider when the auth flow is
/// cancelled, completed, or the user signs out.
// keepalive: OTP state must survive auth route rebuilds until explicit reset.

@ProviderFor(AuthController)
final authControllerProvider = AuthControllerProvider._();

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// Owns the phone-auth screen state while the user moves between phone entry
/// and OTP verification. [sendOtpMutation] and [verifyOtpMutation] expose the
/// async operation lifecycle to the UI; local text/focus/timer concerns stay in
/// the widgets.
///
/// This provider is keepAlive so the OTP step survives route rebuilds during
/// authentication. Call [reset] or invalidate the provider when the auth flow is
/// cancelled, completed, or the user signs out.
// keepalive: OTP state must survive auth route rebuilds until explicit reset.
final class AuthControllerProvider
    extends $NotifierProvider<AuthController, AuthScreenState> {
  /// **Pattern B: Flow controller with freezed state + Mutations**
  ///
  /// Owns the phone-auth screen state while the user moves between phone entry
  /// and OTP verification. [sendOtpMutation] and [verifyOtpMutation] expose the
  /// async operation lifecycle to the UI; local text/focus/timer concerns stay in
  /// the widgets.
  ///
  /// This provider is keepAlive so the OTP step survives route rebuilds during
  /// authentication. Call [reset] or invalidate the provider when the auth flow is
  /// cancelled, completed, or the user signs out.
  // keepalive: OTP state must survive auth route rebuilds until explicit reset.
  AuthControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authControllerHash();

  @$internal
  @override
  AuthController create() => AuthController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AuthScreenState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AuthScreenState>(value),
    );
  }
}

String _$authControllerHash() => r'509a96b50a91cb407b7084733d41f35a972e8229';

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// Owns the phone-auth screen state while the user moves between phone entry
/// and OTP verification. [sendOtpMutation] and [verifyOtpMutation] expose the
/// async operation lifecycle to the UI; local text/focus/timer concerns stay in
/// the widgets.
///
/// This provider is keepAlive so the OTP step survives route rebuilds during
/// authentication. Call [reset] or invalidate the provider when the auth flow is
/// cancelled, completed, or the user signs out.
// keepalive: OTP state must survive auth route rebuilds until explicit reset.

abstract class _$AuthController extends $Notifier<AuthScreenState> {
  AuthScreenState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AuthScreenState, AuthScreenState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AuthScreenState, AuthScreenState>,
              AuthScreenState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
