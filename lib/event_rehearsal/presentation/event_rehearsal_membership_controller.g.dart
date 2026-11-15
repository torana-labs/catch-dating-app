// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_membership_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One synthetic guest owns one pending group decision across refresh and closure.

@ProviderFor(EventRehearsalMembershipController)
final eventRehearsalMembershipControllerProvider =
    EventRehearsalMembershipControllerFamily._();

/// One synthetic guest owns one pending group decision across refresh and closure.
final class EventRehearsalMembershipControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalMembershipController,
          RehearsalMembershipEditorState
        > {
  /// One synthetic guest owns one pending group decision across refresh and closure.
  EventRehearsalMembershipControllerProvider._({
    required EventRehearsalMembershipControllerFamily super.from,
    required RehearsalMembershipScope super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalMembershipControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventRehearsalMembershipControllerHash();

  @override
  String toString() {
    return r'eventRehearsalMembershipControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalMembershipController create() =>
      EventRehearsalMembershipController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalMembershipEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalMembershipEditorState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalMembershipControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalMembershipControllerHash() =>
    r'e8aec05c10520aa4476ebba1bf16f410cc78fd5f';

/// One synthetic guest owns one pending group decision across refresh and closure.

final class EventRehearsalMembershipControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalMembershipController,
          RehearsalMembershipEditorState,
          RehearsalMembershipEditorState,
          RehearsalMembershipEditorState,
          RehearsalMembershipScope
        > {
  EventRehearsalMembershipControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalMembershipControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One synthetic guest owns one pending group decision across refresh and closure.

  EventRehearsalMembershipControllerProvider call(
    RehearsalMembershipScope scope,
  ) =>
      EventRehearsalMembershipControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventRehearsalMembershipControllerProvider';
}

/// One synthetic guest owns one pending group decision across refresh and closure.

abstract class _$EventRehearsalMembershipController
    extends $Notifier<RehearsalMembershipEditorState> {
  late final _$args = ref.$arg as RehearsalMembershipScope;
  RehearsalMembershipScope get scope => _$args;

  RehearsalMembershipEditorState build(RehearsalMembershipScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              RehearsalMembershipEditorState,
              RehearsalMembershipEditorState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalMembershipEditorState,
                RehearsalMembershipEditorState
              >,
              RehearsalMembershipEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
