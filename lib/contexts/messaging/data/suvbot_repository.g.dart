// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'suvbot_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(suvbotRepository)
final suvbotRepositoryProvider = SuvbotRepositoryProvider._();

final class SuvbotRepositoryProvider
    extends
        $FunctionalProvider<
          SuvbotRepository,
          SuvbotRepository,
          SuvbotRepository
        >
    with $Provider<SuvbotRepository> {
  SuvbotRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'suvbotRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$suvbotRepositoryHash();

  @$internal
  @override
  $ProviderElement<SuvbotRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  SuvbotRepository create(Ref ref) {
    return suvbotRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SuvbotRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SuvbotRepository>(value),
    );
  }
}

String _$suvbotRepositoryHash() => r'bf4e440ebe7e8dc0eba1a56b9ee8e63c30fd6073';

@ProviderFor(suvbotActions)
final suvbotActionsProvider = SuvbotActionsProvider._();

final class SuvbotActionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<SuvbotActionItem>>,
          List<SuvbotActionItem>,
          FutureOr<List<SuvbotActionItem>>
        >
    with
        $FutureModifier<List<SuvbotActionItem>>,
        $FutureProvider<List<SuvbotActionItem>> {
  SuvbotActionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'suvbotActionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$suvbotActionsHash();

  @$internal
  @override
  $FutureProviderElement<List<SuvbotActionItem>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<SuvbotActionItem>> create(Ref ref) {
    return suvbotActions(ref);
  }
}

String _$suvbotActionsHash() => r'6d57c6a878b28a68c0e6156ec942e412e447d299';
