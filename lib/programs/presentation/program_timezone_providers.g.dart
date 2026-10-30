// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_timezone_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programTimezoneDefaults)
final programTimezoneDefaultsProvider = ProgramTimezoneDefaultsFamily._();

final class ProgramTimezoneDefaultsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ManagerEventSetupDefaults>,
          ManagerEventSetupDefaults,
          FutureOr<ManagerEventSetupDefaults>
        >
    with
        $FutureModifier<ManagerEventSetupDefaults>,
        $FutureProvider<ManagerEventSetupDefaults> {
  ProgramTimezoneDefaultsProvider._({
    required ProgramTimezoneDefaultsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programTimezoneDefaultsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTimezoneDefaultsHash();

  @override
  String toString() {
    return r'programTimezoneDefaultsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ManagerEventSetupDefaults> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ManagerEventSetupDefaults> create(Ref ref) {
    final argument = this.argument as String;
    return programTimezoneDefaults(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTimezoneDefaultsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTimezoneDefaultsHash() =>
    r'6cf90942d03841e7f86897614c292f25a475d4c2';

final class ProgramTimezoneDefaultsFamily extends $Family
    with
        $FunctionalFamilyOverride<FutureOr<ManagerEventSetupDefaults>, String> {
  ProgramTimezoneDefaultsFamily._()
    : super(
        retry: null,
        name: r'programTimezoneDefaultsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramTimezoneDefaultsProvider call(String organizerId) =>
      ProgramTimezoneDefaultsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'programTimezoneDefaultsProvider';
}

/// Resolves suggestions once per account/organizer scope. A failed private
/// defaults read remains explicit even when a city/device suggestion is usable.

@ProviderFor(programTimezoneSuggestion)
final programTimezoneSuggestionProvider = ProgramTimezoneSuggestionFamily._();

/// Resolves suggestions once per account/organizer scope. A failed private
/// defaults read remains explicit even when a city/device suggestion is usable.

final class ProgramTimezoneSuggestionProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramTimezoneSuggestion>,
          ProgramTimezoneSuggestion,
          FutureOr<ProgramTimezoneSuggestion>
        >
    with
        $FutureModifier<ProgramTimezoneSuggestion>,
        $FutureProvider<ProgramTimezoneSuggestion> {
  /// Resolves suggestions once per account/organizer scope. A failed private
  /// defaults read remains explicit even when a city/device suggestion is usable.
  ProgramTimezoneSuggestionProvider._({
    required ProgramTimezoneSuggestionFamily super.from,
    required ProgramTimezoneScope super.argument,
  }) : super(
         retry: null,
         name: r'programTimezoneSuggestionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programTimezoneSuggestionHash();

  @override
  String toString() {
    return r'programTimezoneSuggestionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramTimezoneSuggestion> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramTimezoneSuggestion> create(Ref ref) {
    final argument = this.argument as ProgramTimezoneScope;
    return programTimezoneSuggestion(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramTimezoneSuggestionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programTimezoneSuggestionHash() =>
    r'914f5efcb86517d69a83c7e26d3cd7d54c4a9331';

/// Resolves suggestions once per account/organizer scope. A failed private
/// defaults read remains explicit even when a city/device suggestion is usable.

final class ProgramTimezoneSuggestionFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramTimezoneSuggestion>,
          ProgramTimezoneScope
        > {
  ProgramTimezoneSuggestionFamily._()
    : super(
        retry: null,
        name: r'programTimezoneSuggestionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Resolves suggestions once per account/organizer scope. A failed private
  /// defaults read remains explicit even when a city/device suggestion is usable.

  ProgramTimezoneSuggestionProvider call(ProgramTimezoneScope scope) =>
      ProgramTimezoneSuggestionProvider._(argument: scope, from: this);

  @override
  String toString() => r'programTimezoneSuggestionProvider';
}
