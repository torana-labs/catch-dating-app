// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'authenticated_session.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(authenticatedSession)
final authenticatedSessionProvider = AuthenticatedSessionProvider._();

final class AuthenticatedSessionProvider
    extends
        $FunctionalProvider<
          AsyncValue<AuthenticatedSession>,
          AsyncValue<AuthenticatedSession>,
          AsyncValue<AuthenticatedSession>
        >
    with $Provider<AsyncValue<AuthenticatedSession>> {
  AuthenticatedSessionProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authenticatedSessionProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authenticatedSessionHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<AuthenticatedSession>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<AuthenticatedSession> create(Ref ref) {
    return authenticatedSession(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<AuthenticatedSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<AuthenticatedSession>>(
        value,
      ),
    );
  }
}

String _$authenticatedSessionHash() =>
    r'fe81a2a56c8fc75e7fc9c4d1f0db4575a3cfef08';
