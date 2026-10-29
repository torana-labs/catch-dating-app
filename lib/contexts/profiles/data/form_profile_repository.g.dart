// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'form_profile_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(formProfileRepository)
final formProfileRepositoryProvider = FormProfileRepositoryProvider._();

final class FormProfileRepositoryProvider
    extends
        $FunctionalProvider<
          FormProfileRepository,
          FormProfileRepository,
          FormProfileRepository
        >
    with $Provider<FormProfileRepository> {
  FormProfileRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'formProfileRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$formProfileRepositoryHash();

  @$internal
  @override
  $ProviderElement<FormProfileRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  FormProfileRepository create(Ref ref) {
    return formProfileRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FormProfileRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FormProfileRepository>(value),
    );
  }
}

String _$formProfileRepositoryHash() =>
    r'0c1d0ebfca5c5c113e0301be44adea43c58a6fa8';
