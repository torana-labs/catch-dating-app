// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_trip_actions_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Trip-lifecycle mutations for the hotel desk and ledger surfaces.
/// Widgets go through this controller rather than reaching into
/// repository providers directly.

@ProviderFor(ProgramTripActions)
final programTripActionsProvider = ProgramTripActionsProvider._();

/// Trip-lifecycle mutations for the hotel desk and ledger surfaces.
/// Widgets go through this controller rather than reaching into
/// repository providers directly.
final class ProgramTripActionsProvider
    extends $NotifierProvider<ProgramTripActions, void> {
  /// Trip-lifecycle mutations for the hotel desk and ledger surfaces.
  /// Widgets go through this controller rather than reaching into
  /// repository providers directly.
  ProgramTripActionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programTripActionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programTripActionsHash();

  @$internal
  @override
  ProgramTripActions create() => ProgramTripActions();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$programTripActionsHash() =>
    r'5a69f45b9a6ba73dee59bddf617851d39ed319eb';

/// Trip-lifecycle mutations for the hotel desk and ledger surfaces.
/// Widgets go through this controller rather than reaching into
/// repository providers directly.

abstract class _$ProgramTripActions extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
