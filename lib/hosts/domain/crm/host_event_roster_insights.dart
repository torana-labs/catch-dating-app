import 'package:catch_dating_app/hosts/domain/crm/crm_response_fields.dart';

enum HostRosterInsightCoverage { exact, partial }

enum HostRosterSpendCoverage { catchPaymentsOnly, insufficientData }

enum HostRosterInsightAvailability {
  ready,
  projectionPending,
  ambiguousIdentity,
  insufficientHistory,
}

enum HostRosterInsightSignal {
  firstTime('first_time'),
  returning('returning'),
  regular('regular'),
  reEngaging('re_engaging'),
  reliable('reliable'),
  needsConfirmation('needs_confirmation'),
  advocate('advocate'),
  highImpactAdvocate('high_impact_advocate'),
  knownCatchSpender('known_catch_spender'),
  topCatchSpender('top_catch_spender'),

  /// A current paid member of this organizer.
  member('member');

  const HostRosterInsightSignal(this.wireValue);

  final String wireValue;

  static HostRosterInsightSignal fromWireValue(String value) =>
      values.firstWhere(
        (signal) => signal.wireValue == value,
        orElse: () => throw const FormatException(
          'Roster insight response had an invalid signal.',
        ),
      );
}

class HostRosterCatchSpend {
  const HostRosterCatchSpend({
    required this.currency,
    required this.amountMinor,
    required this.paidOrderCount,
  });

  factory HostRosterCatchSpend.fromMap(Map<Object?, Object?> map) =>
      HostRosterCatchSpend(
        currency: crmRequiredString(map, 'currency'),
        amountMinor: crmRequiredInt(map, 'amountMinor'),
        paidOrderCount: crmRequiredInt(map, 'paidOrderCount'),
      );

  final String currency;
  final int amountMinor;
  final int paidOrderCount;
}

class HostEventRosterInsight {
  const HostEventRosterInsight({
    required this.attendeeId,
    required this.contactId,
    required this.availability,
    required this.signals,
    required this.priorAttendedEventCount,
    required this.priorExpectedEventCount,
    required this.priorNoShowCount,
    required this.lastAttendedAt,
    required this.attendanceRate,
    required this.catchSpend,
  });

  factory HostEventRosterInsight.fromMap(Map<Object?, Object?> map) =>
      HostEventRosterInsight(
        attendeeId: crmRequiredString(map, 'attendeeId'),
        contactId: crmNullableString(map['contactId']),
        availability: crmEnumByName(
          HostRosterInsightAvailability.values,
          crmRequiredString(map, 'availability'),
          'availability',
        ),
        signals: crmStringList(
          map['signals'],
        ).map(HostRosterInsightSignal.fromWireValue).toSet(),
        priorAttendedEventCount: crmRequiredInt(map, 'priorAttendedEventCount'),
        priorExpectedEventCount: crmRequiredInt(map, 'priorExpectedEventCount'),
        priorNoShowCount: crmRequiredInt(map, 'priorNoShowCount'),
        lastAttendedAt: crmDateTimeFromMillis(map['lastAttendedAtMillis']),
        attendanceRate: crmNullableDouble(map['attendanceRate']),
        catchSpend: crmMapList(
          map['catchSpend'],
          'catchSpend',
        ).map(HostRosterCatchSpend.fromMap).toList(growable: false),
      );

  final String attendeeId;
  final String? contactId;
  final HostRosterInsightAvailability availability;
  final Set<HostRosterInsightSignal> signals;
  final int priorAttendedEventCount;
  final int priorExpectedEventCount;
  final int priorNoShowCount;
  final DateTime? lastAttendedAt;
  final double? attendanceRate;
  final List<HostRosterCatchSpend> catchSpend;
}

class HostEventRosterInsights {
  const HostEventRosterInsights({
    required this.eventId,
    required this.organizerId,
    required this.cutoffAt,
    required this.sourceCoverage,
    required this.spendCoverage,
    required this.rows,
    required this.computedAt,
  });

  factory HostEventRosterInsights.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'event roster insights');
    return HostEventRosterInsights(
      eventId: crmRequiredString(map, 'eventId'),
      organizerId: crmRequiredString(map, 'organizerId'),
      cutoffAt: crmRequiredDateTimeFromMillis(map, 'cutoffAtMillis'),
      sourceCoverage: crmEnumByName(
        HostRosterInsightCoverage.values,
        crmRequiredString(map, 'sourceCoverage'),
        'sourceCoverage',
      ),
      spendCoverage: crmEnumByName(
        HostRosterSpendCoverage.values,
        crmRequiredString(map, 'spendCoverage'),
        'spendCoverage',
      ),
      rows: crmMapList(
        map['rows'],
        'event roster insight rows',
      ).map(HostEventRosterInsight.fromMap).toList(growable: false),
      computedAt: crmRequiredDateTimeFromMillis(map, 'computedAtMillis'),
    );
  }

  final String eventId;
  final String organizerId;
  final DateTime cutoffAt;
  final HostRosterInsightCoverage sourceCoverage;
  final HostRosterSpendCoverage spendCoverage;
  final List<HostEventRosterInsight> rows;
  final DateTime computedAt;

  Map<String, HostEventRosterInsight> get byAttendeeId => {
    for (final row in rows) row.attendeeId: row,
  };
}
