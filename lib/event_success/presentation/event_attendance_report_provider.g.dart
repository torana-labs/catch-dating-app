// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendance_report_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Loading, refresh and errors expose no previous report or invented zero totals.

@ProviderFor(EventAttendanceReport)
final eventAttendanceReportProvider = EventAttendanceReportFamily._();

/// Loading, refresh and errors expose no previous report or invented zero totals.
final class EventAttendanceReportProvider
    extends
        $NotifierProvider<
          EventAttendanceReport,
          AsyncValue<EventAttendanceReportReview>
        > {
  /// Loading, refresh and errors expose no previous report or invented zero totals.
  EventAttendanceReportProvider._({
    required EventAttendanceReportFamily super.from,
    required EventAssistanceRuntimeScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAttendanceReportProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAttendanceReportHash();

  @override
  String toString() {
    return r'eventAttendanceReportProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAttendanceReport create() => EventAttendanceReport();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventAttendanceReportReview> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAttendanceReportReview>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAttendanceReportProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAttendanceReportHash() =>
    r'232d9b849e9f2ee11bd0511fa221004aaa6c38a0';

/// Loading, refresh and errors expose no previous report or invented zero totals.

final class EventAttendanceReportFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAttendanceReport,
          AsyncValue<EventAttendanceReportReview>,
          AsyncValue<EventAttendanceReportReview>,
          AsyncValue<EventAttendanceReportReview>,
          EventAssistanceRuntimeScope
        > {
  EventAttendanceReportFamily._()
    : super(
        retry: null,
        name: r'eventAttendanceReportProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Loading, refresh and errors expose no previous report or invented zero totals.

  EventAttendanceReportProvider call(EventAssistanceRuntimeScope scope) =>
      EventAttendanceReportProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAttendanceReportProvider';
}

/// Loading, refresh and errors expose no previous report or invented zero totals.

abstract class _$EventAttendanceReport
    extends $Notifier<AsyncValue<EventAttendanceReportReview>> {
  late final _$args = ref.$arg as EventAssistanceRuntimeScope;
  EventAssistanceRuntimeScope get scope => _$args;

  AsyncValue<EventAttendanceReportReview> build(
    EventAssistanceRuntimeScope scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAttendanceReportReview>,
              AsyncValue<EventAttendanceReportReview>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAttendanceReportReview>,
                AsyncValue<EventAttendanceReportReview>
              >,
              AsyncValue<EventAttendanceReportReview>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(eventAttendanceReportForAccount)
final eventAttendanceReportForAccountProvider =
    EventAttendanceReportForAccountFamily._();

final class EventAttendanceReportForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAttendanceReportReview>,
          EventAttendanceReportReview,
          FutureOr<EventAttendanceReportReview>
        >
    with
        $FutureModifier<EventAttendanceReportReview>,
        $FutureProvider<EventAttendanceReportReview> {
  EventAttendanceReportForAccountProvider._({
    required EventAttendanceReportForAccountFamily super.from,
    required (EventAssistanceRuntimeScope, {EventAssistanceAccount account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventAttendanceReportForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAttendanceReportForAccountHash();

  @override
  String toString() {
    return r'eventAttendanceReportForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventAttendanceReportReview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventAttendanceReportReview> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceRuntimeScope, {EventAssistanceAccount account});
    return eventAttendanceReportForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAttendanceReportForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAttendanceReportForAccountHash() =>
    r'75a297d5756dd6f0613f82c599b5569e40132cf4';

final class EventAttendanceReportForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventAttendanceReportReview>,
          (EventAssistanceRuntimeScope, {EventAssistanceAccount account})
        > {
  EventAttendanceReportForAccountFamily._()
    : super(
        retry: null,
        name: r'eventAttendanceReportForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAttendanceReportForAccountProvider call(
    EventAssistanceRuntimeScope scope, {
    required EventAssistanceAccount account,
  }) => EventAttendanceReportForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAttendanceReportForAccountProvider';
}
