// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_forms_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostFormsRepository)
final hostFormsRepositoryProvider = HostFormsRepositoryProvider._();

final class HostFormsRepositoryProvider
    extends
        $FunctionalProvider<
          HostFormsRepository,
          HostFormsRepository,
          HostFormsRepository
        >
    with $Provider<HostFormsRepository> {
  HostFormsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostFormsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormsRepository create(Ref ref) {
    return hostFormsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormsRepository>(value),
    );
  }
}

String _$hostFormsRepositoryHash() =>
    r'6ad259adaa78706c2c197ccfc1728848d0f3b5cd';

@ProviderFor(hostFormTemplates)
final hostFormTemplatesProvider = HostFormTemplatesFamily._();

final class HostFormTemplatesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostFormTemplateSummary>>,
          List<HostFormTemplateSummary>,
          FutureOr<List<HostFormTemplateSummary>>
        >
    with
        $FutureModifier<List<HostFormTemplateSummary>>,
        $FutureProvider<List<HostFormTemplateSummary>> {
  HostFormTemplatesProvider._({
    required HostFormTemplatesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostFormTemplatesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormTemplatesHash();

  @override
  String toString() {
    return r'hostFormTemplatesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<HostFormTemplateSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<HostFormTemplateSummary>> create(Ref ref) {
    final argument = this.argument as String;
    return hostFormTemplates(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormTemplatesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormTemplatesHash() => r'd39b3b8569acdaa6228cc1818d582343f18d0945';

final class HostFormTemplatesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<HostFormTemplateSummary>>,
          String
        > {
  HostFormTemplatesFamily._()
    : super(
        retry: null,
        name: r'hostFormTemplatesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormTemplatesProvider call(String organizerId) =>
      HostFormTemplatesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostFormTemplatesProvider';
}

@ProviderFor(hostFormShareAssets)
final hostFormShareAssetsProvider = HostFormShareAssetsFamily._();

final class HostFormShareAssetsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormShareAssets>,
          HostFormShareAssets,
          FutureOr<HostFormShareAssets>
        >
    with
        $FutureModifier<HostFormShareAssets>,
        $FutureProvider<HostFormShareAssets> {
  HostFormShareAssetsProvider._({
    required HostFormShareAssetsFamily super.from,
    required ({String organizerId, String formId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormShareAssetsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormShareAssetsHash();

  @override
  String toString() {
    return r'hostFormShareAssetsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormShareAssets> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormShareAssets> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String formId});
    return hostFormShareAssets(
      ref,
      organizerId: argument.organizerId,
      formId: argument.formId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormShareAssetsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormShareAssetsHash() =>
    r'9b8163c639fa7588e0b559848c292eb8ac41214a';

final class HostFormShareAssetsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormShareAssets>,
          ({String organizerId, String formId})
        > {
  HostFormShareAssetsFamily._()
    : super(
        retry: null,
        name: r'hostFormShareAssetsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormShareAssetsProvider call({
    required String organizerId,
    required String formId,
  }) => HostFormShareAssetsProvider._(
    argument: (organizerId: organizerId, formId: formId),
    from: this,
  );

  @override
  String toString() => r'hostFormShareAssetsProvider';
}
