import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

/// Whether the server's roster insight view could be read completely.
enum HostRosterInsightCoverage {
  /// Every attendee has a row built from complete history.
  exact,

  /// Some labels are still being prepared, or history was capped.
  partial,

  /// A source row failed validation; the rows are the last valid ones.
  invalidSource,

  /// The server has not written the event's view yet.
  missing,
}

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

  /// This row with its labels replaced; the stored facts stay as they are.
  HostEventRosterInsight withSignals(Set<HostRosterInsightSignal> signals) =>
      HostEventRosterInsight(
        attendeeId: attendeeId,
        contactId: contactId,
        availability: availability,
        signals: signals,
        priorAttendedEventCount: priorAttendedEventCount,
        priorExpectedEventCount: priorExpectedEventCount,
        priorNoShowCount: priorNoShowCount,
        lastAttendedAt: lastAttendedAt,
        attendanceRate: attendanceRate,
        catchSpend: catchSpend,
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

  /// No view yet: the server has not evaluated the event's roster.
  const HostEventRosterInsights.missing(this.eventId)
    : organizerId = null,
      cutoffAt = null,
      sourceCoverage = HostRosterInsightCoverage.missing,
      spendCoverage = HostRosterSpendCoverage.insufficientData,
      rows = const [],
      computedAt = null;

  /// Composes `hostEventRosterInsightViews/{eventId}` ([view], null when it
  /// does not exist; its `evaluatedAt` as `evaluatedAtMillis`) with its
  /// organizer's `hostOrganizerSpendProjections` document ([projection],
  /// null when the organizer has no counted Catch payment yet). The phone adds `top_catch_spender` from the thresholds,
  /// and drops `member` unless [includeHostMembership]. A view for another
  /// event, or a projection for another organizer, is a [FormatException].
  factory HostEventRosterInsights.fromViews({
    required String eventId,
    required Map<String, Object?>? view,
    required Map<String, Object?>? projection,
    bool includeHostMembership = true,
  }) {
    if (view == null) return HostEventRosterInsights.missing(eventId);
    final organizerId = crmRequiredString(view, 'organizerId');
    if (view['schemaVersion'] != 1 || view['eventId'] != eventId) {
      throw const FormatException('Roster insight view changed identity.');
    }
    final thresholds = <String, int>{};
    var spendCoverage = HostRosterSpendCoverage.catchPaymentsOnly;
    if (projection != null) {
      if (projection['schemaVersion'] != 1 ||
          projection['organizerId'] != organizerId) {
        throw const FormatException('Spend projection changed identity.');
      }
      spendCoverage = crmEnumByName(
        HostRosterSpendCoverage.values,
        crmRequiredString(projection, 'spendCoverage'),
        'spendCoverage',
      );
      final byCurrency = crmRequiredMap(
        projection['topQuartileThresholdByCurrency'],
        'spend thresholds',
      );
      for (final MapEntry(:key, :value) in byCurrency.entries) {
        if (key is! String || value is! num) {
          throw const FormatException('Invalid spend threshold.');
        }
        thresholds[key] = value.toInt();
      }
    }
    return HostEventRosterInsights(
      eventId: eventId,
      organizerId: organizerId,
      cutoffAt: crmRequiredDateTimeFromMillis(view, 'cutoffAtMillis'),
      sourceCoverage: crmEnumByName(
        HostRosterInsightCoverage.values,
        crmRequiredString(view, 'sourceCoverage'),
        'sourceCoverage',
      ),
      spendCoverage: spendCoverage,
      rows: [
        for (final row in crmMapList(view['rows'], 'roster insight rows'))
          _withPhoneSignals(
            HostEventRosterInsight.fromMap(row),
            thresholds:
                spendCoverage == HostRosterSpendCoverage.catchPaymentsOnly
                ? thresholds
                : const {},
            includeHostMembership: includeHostMembership,
          ),
      ],
      computedAt: crmRequiredDateTimeFromMillis(view, 'evaluatedAtMillis'),
    );
  }

  final String eventId;

  /// Null while the view is [HostRosterInsightCoverage.missing].
  final String? organizerId;

  /// The event's start; labels use history from before it.
  final DateTime? cutoffAt;
  final HostRosterInsightCoverage sourceCoverage;
  final HostRosterSpendCoverage spendCoverage;
  final List<HostEventRosterInsight> rows;

  /// When the server last evaluated the view.
  final DateTime? computedAt;

  Map<String, HostEventRosterInsight> get byAttendeeId => {
    for (final row in rows) row.attendeeId: row,
  };
}

/// Adds `top_catch_spender` where a spend amount with at least two paid
/// orders reaches its currency's top-quartile threshold (right after
/// `known_catch_spender`, where the retired callable put it), and drops
/// `member` unless the screen shows membership.
HostEventRosterInsight _withPhoneSignals(
  HostEventRosterInsight row, {
  required Map<String, int> thresholds,
  required bool includeHostMembership,
}) {
  final topSpender = row.catchSpend.any((amount) {
    final threshold = thresholds[amount.currency];
    return threshold != null &&
        amount.paidOrderCount >= 2 &&
        amount.amountMinor >= threshold;
  });
  if (!topSpender &&
      (includeHostMembership ||
          !row.signals.contains(HostRosterInsightSignal.member))) {
    return row;
  }
  return row.withSignals({
    for (final signal in row.signals)
      if (includeHostMembership ||
          signal != HostRosterInsightSignal.member) ...[
        signal,
        if (topSpender && signal == HostRosterInsightSignal.knownCatchSpender)
          HostRosterInsightSignal.topCatchSpender,
      ],
  });
}
