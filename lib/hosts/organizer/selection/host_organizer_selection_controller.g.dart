// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_selection_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer the Host shell has selected for [uid].
///
/// Session lifetime: the selection survives branch changes while [uid] is
/// signed in, and starts over at sign-out or an account change.

@ProviderFor(HostOrganizerSelection)
final hostOrganizerSelectionProvider = HostOrganizerSelectionFamily._();

/// The organizer the Host shell has selected for [uid].
///
/// Session lifetime: the selection survives branch changes while [uid] is
/// signed in, and starts over at sign-out or an account change.
final class HostOrganizerSelectionProvider
    extends $NotifierProvider<HostOrganizerSelection, String?> {
  /// The organizer the Host shell has selected for [uid].
  ///
  /// Session lifetime: the selection survives branch changes while [uid] is
  /// signed in, and starts over at sign-out or an account change.
  HostOrganizerSelectionProvider._({
    required HostOrganizerSelectionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOrganizerSelectionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerSelectionHash();

  @override
  String toString() {
    return r'hostOrganizerSelectionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostOrganizerSelection create() => HostOrganizerSelection();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerSelectionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerSelectionHash() =>
    r'095193ca9da780c16695dda3db22108d89906cd5';

/// The organizer the Host shell has selected for [uid].
///
/// Session lifetime: the selection survives branch changes while [uid] is
/// signed in, and starts over at sign-out or an account change.

final class HostOrganizerSelectionFamily extends $Family
    with
        $ClassFamilyOverride<
          HostOrganizerSelection,
          String?,
          String?,
          String?,
          String
        > {
  HostOrganizerSelectionFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerSelectionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer the Host shell has selected for [uid].
  ///
  /// Session lifetime: the selection survives branch changes while [uid] is
  /// signed in, and starts over at sign-out or an account change.

  HostOrganizerSelectionProvider call(String uid) =>
      HostOrganizerSelectionProvider._(argument: uid, from: this);

  @override
  String toString() => r'hostOrganizerSelectionProvider';
}

/// The organizer the Host shell has selected for [uid].
///
/// Session lifetime: the selection survives branch changes while [uid] is
/// signed in, and starts over at sign-out or an account change.

abstract class _$HostOrganizerSelection extends $Notifier<String?> {
  late final _$args = ref.$arg as String;
  String get uid => _$args;

  String? build(String uid);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<String?, String?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String?, String?>,
              String?,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
