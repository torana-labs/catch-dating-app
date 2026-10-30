// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_name_lookup.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerNameLookup)
final organizerNameLookupProvider = OrganizerNameLookupFamily._();

final class OrganizerNameLookupProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, String>>,
          Map<String, String>,
          FutureOr<Map<String, String>>
        >
    with
        $FutureModifier<Map<String, String>>,
        $FutureProvider<Map<String, String>> {
  OrganizerNameLookupProvider._({
    required OrganizerNameLookupFamily super.from,
    required OrganizerNameLookupQuery super.argument,
  }) : super(
         retry: null,
         name: r'organizerNameLookupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerNameLookupHash();

  @override
  String toString() {
    return r'organizerNameLookupProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, String>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, String>> create(Ref ref) {
    final argument = this.argument as OrganizerNameLookupQuery;
    return organizerNameLookup(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerNameLookupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerNameLookupHash() =>
    r'77d85b03cf646327a92da33504f3d04b441a6b5c';

final class OrganizerNameLookupFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, String>>,
          OrganizerNameLookupQuery
        > {
  OrganizerNameLookupFamily._()
    : super(
        retry: null,
        name: r'organizerNameLookupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  OrganizerNameLookupProvider call(OrganizerNameLookupQuery query) =>
      OrganizerNameLookupProvider._(argument: query, from: this);

  @override
  String toString() => r'organizerNameLookupProvider';
}
