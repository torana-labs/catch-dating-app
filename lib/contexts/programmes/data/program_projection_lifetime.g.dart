// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_projection_lifetime.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programProjectionClock)
final programProjectionClockProvider = ProgramProjectionClockProvider._();

final class ProgramProjectionClockProvider
    extends
        $FunctionalProvider<
          DateTime Function(),
          DateTime Function(),
          DateTime Function()
        >
    with $Provider<DateTime Function()> {
  ProgramProjectionClockProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programProjectionClockProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programProjectionClockHash();

  @$internal
  @override
  $ProviderElement<DateTime Function()> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DateTime Function() create(Ref ref) {
    return programProjectionClock(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DateTime Function() value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DateTime Function()>(value),
    );
  }
}

String _$programProjectionClockHash() =>
    r'cc1b7e179d1cc54d25bd884bb5cfba8bd61e3d59';

@ProviderFor(programProjectionActive)
final programProjectionActiveProvider = ProgramProjectionActiveFamily._();

final class ProgramProjectionActiveProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  ProgramProjectionActiveProvider._({
    required ProgramProjectionActiveFamily super.from,
    required DateTime? super.argument,
  }) : super(
         retry: null,
         name: r'programProjectionActiveProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programProjectionActiveHash();

  @override
  String toString() {
    return r'programProjectionActiveProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    final argument = this.argument as DateTime?;
    return programProjectionActive(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramProjectionActiveProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programProjectionActiveHash() =>
    r'02f7b72450e180cba9ad6d1e3640bc900d7fa94b';

final class ProgramProjectionActiveFamily extends $Family
    with $FunctionalFamilyOverride<bool, DateTime?> {
  ProgramProjectionActiveFamily._()
    : super(
        retry: null,
        name: r'programProjectionActiveProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramProjectionActiveProvider call(DateTime? expiresAt) =>
      ProgramProjectionActiveProvider._(argument: expiresAt, from: this);

  @override
  String toString() => r'programProjectionActiveProvider';
}
