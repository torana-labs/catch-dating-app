// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consumer_router.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(consumerGoRouter)
final consumerGoRouterProvider = ConsumerGoRouterProvider._();

final class ConsumerGoRouterProvider
    extends $FunctionalProvider<GoRouter, GoRouter, GoRouter>
    with $Provider<GoRouter> {
  ConsumerGoRouterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'consumerGoRouterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$consumerGoRouterHash();

  @$internal
  @override
  $ProviderElement<GoRouter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoRouter create(Ref ref) {
    return consumerGoRouter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoRouter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoRouter>(value),
    );
  }
}

String _$consumerGoRouterHash() => r'5f89fda27af967c71576cf628ac61afe1c1bf98d';
