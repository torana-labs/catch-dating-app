// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_moments_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Lists, live, and mutates the moments for one event or program scope.
/// Lifecycle validation stays with the backend; the controller applies the
/// returned definitions to the list at once, and the listener brings the
/// trigger-kept rows (with their send counts) after.

@ProviderFor(OrganizerMomentsController)
final organizerMomentsControllerProvider = OrganizerMomentsControllerFamily._();

/// Lists, live, and mutates the moments for one event or program scope.
/// Lifecycle validation stays with the backend; the controller applies the
/// returned definitions to the list at once, and the listener brings the
/// trigger-kept rows (with their send counts) after.
final class OrganizerMomentsControllerProvider
    extends
        $StreamNotifierProvider<
          OrganizerMomentsController,
          OrganizerMomentsState
        > {
  /// Lists, live, and mutates the moments for one event or program scope.
  /// Lifecycle validation stays with the backend; the controller applies the
  /// returned definitions to the list at once, and the listener brings the
  /// trigger-kept rows (with their send counts) after.
  OrganizerMomentsControllerProvider._({
    required OrganizerMomentsControllerFamily super.from,
    required OrganizerMomentScope super.argument,
  }) : super(
         retry: null,
         name: r'organizerMomentsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerMomentsControllerHash();

  @override
  String toString() {
    return r'organizerMomentsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  OrganizerMomentsController create() => OrganizerMomentsController();

  @override
  bool operator ==(Object other) {
    return other is OrganizerMomentsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerMomentsControllerHash() =>
    r'b7ab6d2aa87ed3940fe3c86ce2894658d27da1c6';

/// Lists, live, and mutates the moments for one event or program scope.
/// Lifecycle validation stays with the backend; the controller applies the
/// returned definitions to the list at once, and the listener brings the
/// trigger-kept rows (with their send counts) after.

final class OrganizerMomentsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          OrganizerMomentsController,
          AsyncValue<OrganizerMomentsState>,
          OrganizerMomentsState,
          Stream<OrganizerMomentsState>,
          OrganizerMomentScope
        > {
  OrganizerMomentsControllerFamily._()
    : super(
        retry: null,
        name: r'organizerMomentsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Lists, live, and mutates the moments for one event or program scope.
  /// Lifecycle validation stays with the backend; the controller applies the
  /// returned definitions to the list at once, and the listener brings the
  /// trigger-kept rows (with their send counts) after.

  OrganizerMomentsControllerProvider call(OrganizerMomentScope scope) =>
      OrganizerMomentsControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'organizerMomentsControllerProvider';
}

/// Lists, live, and mutates the moments for one event or program scope.
/// Lifecycle validation stays with the backend; the controller applies the
/// returned definitions to the list at once, and the listener brings the
/// trigger-kept rows (with their send counts) after.

abstract class _$OrganizerMomentsController
    extends $StreamNotifier<OrganizerMomentsState> {
  late final _$args = ref.$arg as OrganizerMomentScope;
  OrganizerMomentScope get scope => _$args;

  Stream<OrganizerMomentsState> build(OrganizerMomentScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<OrganizerMomentsState>, OrganizerMomentsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<OrganizerMomentsState>,
                OrganizerMomentsState
              >,
              AsyncValue<OrganizerMomentsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
