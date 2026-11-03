// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'callable_read.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(callableReadClient)
final callableReadClientProvider = CallableReadClientProvider._();

final class CallableReadClientProvider
    extends
        $FunctionalProvider<
          CallableReadClient,
          CallableReadClient,
          CallableReadClient
        >
    with $Provider<CallableReadClient> {
  CallableReadClientProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'callableReadClientProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$callableReadClientHash();

  @$internal
  @override
  $ProviderElement<CallableReadClient> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CallableReadClient create(Ref ref) {
    return callableReadClient(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CallableReadClient value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CallableReadClient>(value),
    );
  }
}

String _$callableReadClientHash() =>
    r'25f8572f02911dcf29bd52c6ecbcbb9d21d06f3b';
