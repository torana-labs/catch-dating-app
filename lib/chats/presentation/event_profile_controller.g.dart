// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_profile_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventProfileEditorController)
final eventProfileEditorControllerProvider =
    EventProfileEditorControllerFamily._();

final class EventProfileEditorControllerProvider
    extends
        $AsyncNotifierProvider<
          EventProfileEditorController,
          EventProfileEditorState
        > {
  EventProfileEditorControllerProvider._({
    required EventProfileEditorControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventProfileEditorControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventProfileEditorControllerHash();

  @override
  String toString() {
    return r'eventProfileEditorControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventProfileEditorController create() => EventProfileEditorController();

  @override
  bool operator ==(Object other) {
    return other is EventProfileEditorControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventProfileEditorControllerHash() =>
    r'80e7acc72ca15d3fa216158b2e0d49175868b589';

final class EventProfileEditorControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventProfileEditorController,
          AsyncValue<EventProfileEditorState>,
          EventProfileEditorState,
          FutureOr<EventProfileEditorState>,
          String
        > {
  EventProfileEditorControllerFamily._()
    : super(
        retry: null,
        name: r'eventProfileEditorControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventProfileEditorControllerProvider call(String eventId) =>
      EventProfileEditorControllerProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventProfileEditorControllerProvider';
}

abstract class _$EventProfileEditorController
    extends $AsyncNotifier<EventProfileEditorState> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  FutureOr<EventProfileEditorState> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventProfileEditorState>,
              EventProfileEditorState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventProfileEditorState>,
                EventProfileEditorState
              >,
              AsyncValue<EventProfileEditorState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// Member profiles have no offline snapshot. Hide on background/account change
/// and recheck membership, blocks and the person's sharing choice while visible.

@ProviderFor(EventParticipantProfileController)
final eventParticipantProfileControllerProvider =
    EventParticipantProfileControllerFamily._();

/// Member profiles have no offline snapshot. Hide on background/account change
/// and recheck membership, blocks and the person's sharing choice while visible.
final class EventParticipantProfileControllerProvider
    extends
        $AsyncNotifierProvider<
          EventParticipantProfileController,
          EventParticipantProfile
        > {
  /// Member profiles have no offline snapshot. Hide on background/account change
  /// and recheck membership, blocks and the person's sharing choice while visible.
  EventParticipantProfileControllerProvider._({
    required EventParticipantProfileControllerFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'eventParticipantProfileControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventParticipantProfileControllerHash();

  @override
  String toString() {
    return r'eventParticipantProfileControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  EventParticipantProfileController create() =>
      EventParticipantProfileController();

  @override
  bool operator ==(Object other) {
    return other is EventParticipantProfileControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventParticipantProfileControllerHash() =>
    r'd50a31f5d8f751c166508627e7578991148dc28f';

/// Member profiles have no offline snapshot. Hide on background/account change
/// and recheck membership, blocks and the person's sharing choice while visible.

final class EventParticipantProfileControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventParticipantProfileController,
          AsyncValue<EventParticipantProfile>,
          EventParticipantProfile,
          FutureOr<EventParticipantProfile>,
          (String, String)
        > {
  EventParticipantProfileControllerFamily._()
    : super(
        retry: null,
        name: r'eventParticipantProfileControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Member profiles have no offline snapshot. Hide on background/account change
  /// and recheck membership, blocks and the person's sharing choice while visible.

  EventParticipantProfileControllerProvider call(
    String eventId,
    String participantUid,
  ) => EventParticipantProfileControllerProvider._(
    argument: (eventId, participantUid),
    from: this,
  );

  @override
  String toString() => r'eventParticipantProfileControllerProvider';
}

/// Member profiles have no offline snapshot. Hide on background/account change
/// and recheck membership, blocks and the person's sharing choice while visible.

abstract class _$EventParticipantProfileController
    extends $AsyncNotifier<EventParticipantProfile> {
  late final _$args = ref.$arg as (String, String);
  String get eventId => _$args.$1;
  String get participantUid => _$args.$2;

  FutureOr<EventParticipantProfile> build(
    String eventId,
    String participantUid,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventParticipantProfile>,
              EventParticipantProfile
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventParticipantProfile>,
                EventParticipantProfile
              >,
              AsyncValue<EventParticipantProfile>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}
