// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_assistance_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// A deliberate review fetch, separate from the constantly polling runtime.

@ProviderFor(EventRehearsalAssistance)
final eventRehearsalAssistanceProvider = EventRehearsalAssistanceFamily._();

/// A deliberate review fetch, separate from the constantly polling runtime.
final class EventRehearsalAssistanceProvider
    extends
        $NotifierProvider<
          EventRehearsalAssistance,
          AsyncValue<RehearsalAssistanceReview>
        > {
  /// A deliberate review fetch, separate from the constantly polling runtime.
  EventRehearsalAssistanceProvider._({
    required EventRehearsalAssistanceFamily super.from,
    required (String, {String? practiceOperatorId}) super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalAssistanceProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalAssistanceHash();

  @override
  String toString() {
    return r'eventRehearsalAssistanceProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  EventRehearsalAssistance create() => EventRehearsalAssistance();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<RehearsalAssistanceReview> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<RehearsalAssistanceReview>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalAssistanceProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalAssistanceHash() =>
    r'89bbaa1a314c5238f577a1c47b7a8e2d9bbb32e9';

/// A deliberate review fetch, separate from the constantly polling runtime.

final class EventRehearsalAssistanceFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalAssistance,
          AsyncValue<RehearsalAssistanceReview>,
          AsyncValue<RehearsalAssistanceReview>,
          AsyncValue<RehearsalAssistanceReview>,
          (String, {String? practiceOperatorId})
        > {
  EventRehearsalAssistanceFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalAssistanceProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A deliberate review fetch, separate from the constantly polling runtime.

  EventRehearsalAssistanceProvider call(
    String sessionId, {
    String? practiceOperatorId,
  }) => EventRehearsalAssistanceProvider._(
    argument: (sessionId, practiceOperatorId: practiceOperatorId),
    from: this,
  );

  @override
  String toString() => r'eventRehearsalAssistanceProvider';
}

/// A deliberate review fetch, separate from the constantly polling runtime.

abstract class _$EventRehearsalAssistance
    extends $Notifier<AsyncValue<RehearsalAssistanceReview>> {
  late final _$args = ref.$arg as (String, {String? practiceOperatorId});
  String get sessionId => _$args.$1;
  String? get practiceOperatorId => _$args.practiceOperatorId;

  AsyncValue<RehearsalAssistanceReview> build(
    String sessionId, {
    String? practiceOperatorId,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<RehearsalAssistanceReview>,
              AsyncValue<RehearsalAssistanceReview>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<RehearsalAssistanceReview>,
                AsyncValue<RehearsalAssistanceReview>
              >,
              AsyncValue<RehearsalAssistanceReview>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(_$args.$1, practiceOperatorId: _$args.practiceOperatorId),
    );
  }
}

@ProviderFor(eventRehearsalAssistanceForAccount)
final eventRehearsalAssistanceForAccountProvider =
    EventRehearsalAssistanceForAccountFamily._();

final class EventRehearsalAssistanceForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<RehearsalAssistanceReview>,
          RehearsalAssistanceReview,
          FutureOr<RehearsalAssistanceReview>
        >
    with
        $FutureModifier<RehearsalAssistanceReview>,
        $FutureProvider<RehearsalAssistanceReview> {
  EventRehearsalAssistanceForAccountProvider._({
    required EventRehearsalAssistanceForAccountFamily super.from,
    required (
      String, {
      AuthenticatedSession account,
      String? practiceOperatorId,
    })
    super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalAssistanceForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventRehearsalAssistanceForAccountHash();

  @override
  String toString() {
    return r'eventRehearsalAssistanceForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<RehearsalAssistanceReview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<RehearsalAssistanceReview> create(Ref ref) {
    final argument =
        this.argument
            as (
              String, {
              AuthenticatedSession account,
              String? practiceOperatorId,
            });
    return eventRehearsalAssistanceForAccount(
      ref,
      argument.$1,
      account: argument.account,
      practiceOperatorId: argument.practiceOperatorId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalAssistanceForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalAssistanceForAccountHash() =>
    r'66e69917839d652c7df1cea47ae70dc211ff7dbe';

final class EventRehearsalAssistanceForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<RehearsalAssistanceReview>,
          (String, {AuthenticatedSession account, String? practiceOperatorId})
        > {
  EventRehearsalAssistanceForAccountFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalAssistanceForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventRehearsalAssistanceForAccountProvider call(
    String sessionId, {
    required AuthenticatedSession account,
    String? practiceOperatorId,
  }) => EventRehearsalAssistanceForAccountProvider._(
    argument: (
      sessionId,
      account: account,
      practiceOperatorId: practiceOperatorId,
    ),
    from: this,
  );

  @override
  String toString() => r'eventRehearsalAssistanceForAccountProvider';
}
