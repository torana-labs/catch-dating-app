// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_late_join_setting_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAssistanceLateJoinSetting)
final eventAssistanceLateJoinSettingProvider =
    EventAssistanceLateJoinSettingFamily._();

final class EventAssistanceLateJoinSettingProvider
    extends
        $NotifierProvider<
          EventAssistanceLateJoinSetting,
          AsyncValue<LateJoinSettingSession>
        > {
  EventAssistanceLateJoinSettingProvider._({
    required EventAssistanceLateJoinSettingFamily super.from,
    required EventAssistanceGroupScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceLateJoinSettingProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceLateJoinSettingHash();

  @override
  String toString() {
    return r'eventAssistanceLateJoinSettingProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceLateJoinSetting create() => EventAssistanceLateJoinSetting();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<LateJoinSettingSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<LateJoinSettingSession>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceLateJoinSettingProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceLateJoinSettingHash() =>
    r'd0e9254ad89bfbdd2647ae2ac2591c84b6c2b7da';

final class EventAssistanceLateJoinSettingFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceLateJoinSetting,
          AsyncValue<LateJoinSettingSession>,
          AsyncValue<LateJoinSettingSession>,
          AsyncValue<LateJoinSettingSession>,
          EventAssistanceGroupScope
        > {
  EventAssistanceLateJoinSettingFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceLateJoinSettingProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceLateJoinSettingProvider call(
    EventAssistanceGroupScope query,
  ) => EventAssistanceLateJoinSettingProvider._(argument: query, from: this);

  @override
  String toString() => r'eventAssistanceLateJoinSettingProvider';
}

abstract class _$EventAssistanceLateJoinSetting
    extends $Notifier<AsyncValue<LateJoinSettingSession>> {
  late final _$args = ref.$arg as EventAssistanceGroupScope;
  EventAssistanceGroupScope get query => _$args;

  AsyncValue<LateJoinSettingSession> build(EventAssistanceGroupScope query);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LateJoinSettingSession>,
              AsyncValue<LateJoinSettingSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LateJoinSettingSession>,
                AsyncValue<LateJoinSettingSession>
              >,
              AsyncValue<LateJoinSettingSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The group's late-join setting for one sign-in period. It is a Firestore
/// listener: no cache tags or lifetime, and writes never invalidate it. Each
/// delivery is a new session and retires the previous one.

@ProviderFor(eventAssistanceLateJoinSettingForAccount)
final eventAssistanceLateJoinSettingForAccountProvider =
    EventAssistanceLateJoinSettingForAccountFamily._();

/// The group's late-join setting for one sign-in period. It is a Firestore
/// listener: no cache tags or lifetime, and writes never invalidate it. Each
/// delivery is a new session and retires the previous one.

final class EventAssistanceLateJoinSettingForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<LateJoinSettingSession>,
          LateJoinSettingSession,
          Stream<LateJoinSettingSession>
        >
    with
        $FutureModifier<LateJoinSettingSession>,
        $StreamProvider<LateJoinSettingSession> {
  /// The group's late-join setting for one sign-in period. It is a Firestore
  /// listener: no cache tags or lifetime, and writes never invalidate it. Each
  /// delivery is a new session and retires the previous one.
  EventAssistanceLateJoinSettingForAccountProvider._({
    required EventAssistanceLateJoinSettingForAccountFamily super.from,
    required (EventAssistanceGroupScope, {EventAssistanceAccount account})
    super.argument,
  }) : super(
         retry: _noSettingReadRetry,
         name: r'eventAssistanceLateJoinSettingForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceLateJoinSettingForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceLateJoinSettingForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<LateJoinSettingSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<LateJoinSettingSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceGroupScope, {EventAssistanceAccount account});
    return eventAssistanceLateJoinSettingForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceLateJoinSettingForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceLateJoinSettingForAccountHash() =>
    r'6df3e1b77f15cb3f1bd4c100b569ec338bb095a8';

/// The group's late-join setting for one sign-in period. It is a Firestore
/// listener: no cache tags or lifetime, and writes never invalidate it. Each
/// delivery is a new session and retires the previous one.

final class EventAssistanceLateJoinSettingForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<LateJoinSettingSession>,
          (EventAssistanceGroupScope, {EventAssistanceAccount account})
        > {
  EventAssistanceLateJoinSettingForAccountFamily._()
    : super(
        retry: _noSettingReadRetry,
        name: r'eventAssistanceLateJoinSettingForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The group's late-join setting for one sign-in period. It is a Firestore
  /// listener: no cache tags or lifetime, and writes never invalidate it. Each
  /// delivery is a new session and retires the previous one.

  EventAssistanceLateJoinSettingForAccountProvider call(
    EventAssistanceGroupScope query, {
    required EventAssistanceAccount account,
  }) => EventAssistanceLateJoinSettingForAccountProvider._(
    argument: (query, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceLateJoinSettingForAccountProvider';
}
