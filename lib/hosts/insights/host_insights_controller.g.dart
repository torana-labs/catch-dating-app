// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_insights_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's report for one period through the cached host-reports
/// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
/// per day or week, where visitors came from and the fullest nights.

@ProviderFor(hostInsightsController)
final hostInsightsControllerProvider = HostInsightsControllerFamily._();

/// The organizer's report for one period through the cached host-reports
/// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
/// per day or week, where visitors came from and the fullest nights.

final class HostInsightsControllerProvider
    extends
        $FunctionalProvider<
          HostInsightsState,
          HostInsightsState,
          HostInsightsState
        >
    with $Provider<HostInsightsState> {
  /// The organizer's report for one period through the cached host-reports
  /// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
  /// per day or week, where visitors came from and the fullest nights.
  HostInsightsControllerProvider._({
    required HostInsightsControllerFamily super.from,
    required HostInsightsRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostInsightsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostInsightsControllerHash();

  @override
  String toString() {
    return r'hostInsightsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostInsightsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostInsightsState create(Ref ref) {
    final argument = this.argument as HostInsightsRequest;
    return hostInsightsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostInsightsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostInsightsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostInsightsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostInsightsControllerHash() =>
    r'1e4c4e8dd0dcb172977d465518c0e8ecdaac4a59';

/// The organizer's report for one period through the cached host-reports
/// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
/// per day or week, where visitors came from and the fullest nights.

final class HostInsightsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostInsightsState, HostInsightsRequest> {
  HostInsightsControllerFamily._()
    : super(
        retry: null,
        name: r'hostInsightsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's report for one period through the cached host-reports
  /// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
  /// per day or week, where visitors came from and the fullest nights.

  HostInsightsControllerProvider call(HostInsightsRequest request) =>
      HostInsightsControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostInsightsControllerProvider';
}

/// The report for one past event, composed from its read owners: the
/// participation roster (who booked and came), the roster view (new faces),
/// the attendees (the faces), the reviews, the organizer's coming events,
/// and the event's row in the cached host report (ticket sales, payments and
/// pairs who matched). A failed or pending report leaves those figures out.

@ProviderFor(hostEventReportController)
final hostEventReportControllerProvider = HostEventReportControllerFamily._();

/// The report for one past event, composed from its read owners: the
/// participation roster (who booked and came), the roster view (new faces),
/// the attendees (the faces), the reviews, the organizer's coming events,
/// and the event's row in the cached host report (ticket sales, payments and
/// pairs who matched). A failed or pending report leaves those figures out.

final class HostEventReportControllerProvider
    extends
        $FunctionalProvider<
          HostEventReportState,
          HostEventReportState,
          HostEventReportState
        >
    with $Provider<HostEventReportState> {
  /// The report for one past event, composed from its read owners: the
  /// participation roster (who booked and came), the roster view (new faces),
  /// the attendees (the faces), the reviews, the organizer's coming events,
  /// and the event's row in the cached host report (ticket sales, payments and
  /// pairs who matched). A failed or pending report leaves those figures out.
  HostEventReportControllerProvider._({
    required HostEventReportControllerFamily super.from,
    required HostEventReportRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventReportControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventReportControllerHash();

  @override
  String toString() {
    return r'hostEventReportControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventReportState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventReportState create(Ref ref) {
    final argument = this.argument as HostEventReportRequest;
    return hostEventReportController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventReportState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventReportState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventReportControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventReportControllerHash() =>
    r'b9aeefeaea37225ccd5768c7a13dd83ad2ab0fc6';

/// The report for one past event, composed from its read owners: the
/// participation roster (who booked and came), the roster view (new faces),
/// the attendees (the faces), the reviews, the organizer's coming events,
/// and the event's row in the cached host report (ticket sales, payments and
/// pairs who matched). A failed or pending report leaves those figures out.

final class HostEventReportControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostEventReportState,
          HostEventReportRequest
        > {
  HostEventReportControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventReportControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The report for one past event, composed from its read owners: the
  /// participation roster (who booked and came), the roster view (new faces),
  /// the attendees (the faces), the reviews, the organizer's coming events,
  /// and the event's row in the cached host report (ticket sales, payments and
  /// pairs who matched). A failed or pending report leaves those figures out.

  HostEventReportControllerProvider call(HostEventReportRequest request) =>
      HostEventReportControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventReportControllerProvider';
}
