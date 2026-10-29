// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_name_lookup.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clubNameLookup)
final clubNameLookupProvider = ClubNameLookupFamily._();

final class ClubNameLookupProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, String>>,
          Map<String, String>,
          FutureOr<Map<String, String>>
        >
    with
        $FutureModifier<Map<String, String>>,
        $FutureProvider<Map<String, String>> {
  ClubNameLookupProvider._({
    required ClubNameLookupFamily super.from,
    required ClubNameLookupQuery super.argument,
  }) : super(
         retry: null,
         name: r'clubNameLookupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$clubNameLookupHash();

  @override
  String toString() {
    return r'clubNameLookupProvider'
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
    final argument = this.argument as ClubNameLookupQuery;
    return clubNameLookup(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ClubNameLookupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$clubNameLookupHash() => r'2a071c4279fa54bcdff30f25bc2e8e41f97ff24e';

final class ClubNameLookupFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, String>>,
          ClubNameLookupQuery
        > {
  ClubNameLookupFamily._()
    : super(
        retry: null,
        name: r'clubNameLookupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ClubNameLookupProvider call(ClubNameLookupQuery query) =>
      ClubNameLookupProvider._(argument: query, from: this);

  @override
  String toString() => r'clubNameLookupProvider';
}
