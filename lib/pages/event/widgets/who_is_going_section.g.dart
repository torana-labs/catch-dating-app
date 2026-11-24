// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'who_is_going_section.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(attendeeProfiles)
final attendeeProfilesProvider = AttendeeProfilesFamily._();

final class AttendeeProfilesProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, (String, String?)>>,
          Map<String, (String, String?)>,
          FutureOr<Map<String, (String, String?)>>
        >
    with
        $FutureModifier<Map<String, (String, String?)>>,
        $FutureProvider<Map<String, (String, String?)>> {
  AttendeeProfilesProvider._({
    required AttendeeProfilesFamily super.from,
    required List<String> super.argument,
  }) : super(
         retry: null,
         name: r'attendeeProfilesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$attendeeProfilesHash();

  @override
  String toString() {
    return r'attendeeProfilesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, (String, String?)>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, (String, String?)>> create(Ref ref) {
    final argument = this.argument as List<String>;
    return attendeeProfiles(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is AttendeeProfilesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$attendeeProfilesHash() => r'ddfad6be352a2f7dbf0b0df7597018b4ff53f254';

final class AttendeeProfilesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, (String, String?)>>,
          List<String>
        > {
  AttendeeProfilesFamily._()
    : super(
        retry: null,
        name: r'attendeeProfilesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  AttendeeProfilesProvider call(List<String> uids) =>
      AttendeeProfilesProvider._(argument: uids, from: this);

  @override
  String toString() => r'attendeeProfilesProvider';
}
