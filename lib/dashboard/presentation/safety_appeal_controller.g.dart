// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'safety_appeal_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Sends the appeal of a safety decision from a From Catch notice.
/// [appealMutation] tracks the send so the sheet can show it is on its way.

@ProviderFor(SafetyAppealController)
final safetyAppealControllerProvider = SafetyAppealControllerProvider._();

/// Sends the appeal of a safety decision from a From Catch notice.
/// [appealMutation] tracks the send so the sheet can show it is on its way.
final class SafetyAppealControllerProvider
    extends $NotifierProvider<SafetyAppealController, void> {
  /// Sends the appeal of a safety decision from a From Catch notice.
  /// [appealMutation] tracks the send so the sheet can show it is on its way.
  SafetyAppealControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'safetyAppealControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$safetyAppealControllerHash();

  @$internal
  @override
  SafetyAppealController create() => SafetyAppealController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$safetyAppealControllerHash() =>
    r'f8b1312bdc992d84d7429ad8f4d78c94f88b595d';

/// Sends the appeal of a safety decision from a From Catch notice.
/// [appealMutation] tracks the send so the sheet can show it is on its way.

abstract class _$SafetyAppealController extends $Notifier<void> {
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
