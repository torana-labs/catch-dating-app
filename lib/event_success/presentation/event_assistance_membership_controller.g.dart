// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_membership_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One guest owns one pending group decision across review refresh and closure.

@ProviderFor(EventAssistanceMembershipController)
final eventAssistanceMembershipControllerProvider =
    EventAssistanceMembershipControllerFamily._();

/// One guest owns one pending group decision across review refresh and closure.
final class EventAssistanceMembershipControllerProvider
    extends
        $NotifierProvider<
          EventAssistanceMembershipController,
          MembershipEditorState
        > {
  /// One guest owns one pending group decision across review refresh and closure.
  EventAssistanceMembershipControllerProvider._({
    required EventAssistanceMembershipControllerFamily super.from,
    required EventAssistanceGuestScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceMembershipControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceMembershipControllerHash();

  @override
  String toString() {
    return r'eventAssistanceMembershipControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceMembershipController create() =>
      EventAssistanceMembershipController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MembershipEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MembershipEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceMembershipControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceMembershipControllerHash() =>
    r'9b2edd1c814b6ee71d2bdad5d52d3c8f05c2c4ad';

/// One guest owns one pending group decision across review refresh and closure.

final class EventAssistanceMembershipControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceMembershipController,
          MembershipEditorState,
          MembershipEditorState,
          MembershipEditorState,
          EventAssistanceGuestScope
        > {
  EventAssistanceMembershipControllerFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceMembershipControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One guest owns one pending group decision across review refresh and closure.

  EventAssistanceMembershipControllerProvider call(
    EventAssistanceGuestScope scope,
  ) => EventAssistanceMembershipControllerProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'eventAssistanceMembershipControllerProvider';
}

/// One guest owns one pending group decision across review refresh and closure.

abstract class _$EventAssistanceMembershipController
    extends $Notifier<MembershipEditorState> {
  late final _$args = ref.$arg as EventAssistanceGuestScope;
  EventAssistanceGuestScope get scope => _$args;

  MembershipEditorState build(EventAssistanceGuestScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<MembershipEditorState, MembershipEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MembershipEditorState, MembershipEditorState>,
              MembershipEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
