import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/private_event_setup_models.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Whether the server's setup view could be read completely.
enum PrivateEventSetupCoverage {
  /// The view holds the event as the server last evaluated it.
  complete,

  /// A source document failed validation; the summary is not trustworthy.
  invalidSource,

  /// The server has not written the view yet, for example just after create.
  missing,
}

/// The typed reason a setup step cannot show the event.
class PrivateEventSetupViewUnavailable implements Exception {
  const PrivateEventSetupViewUnavailable(this.coverage, {this.source});

  final PrivateEventSetupCoverage coverage;

  /// The collection whose document failed validation, for invalidSource.
  final String? source;

  @override
  String toString() =>
      'PrivateEventSetupViewUnavailable(${coverage.name}'
      '${source == null ? '' : ', $source'})';
}

/// What the server states about the night: places booked, money taken for
/// it in minor units, and whether the arrival message is armed.
class PrivateEventSetupFacts {
  const PrivateEventSetupFacts({
    required this.ticketsSold,
    required this.grossMinor,
    required this.arrivalReady,
  });

  final int ticketsSold;
  final int grossMinor;
  final bool arrivalReady;

  /// Null when the view was written before it carried facts.
  static PrivateEventSetupFacts? fromView(Object? raw) {
    if (raw == null) return null;
    if (raw is! Map ||
        raw['ticketsSold'] is! int ||
        raw['grossMinor'] is! int ||
        raw['arrivalMessage'] is! Map ||
        (raw['arrivalMessage'] as Map)['ready'] is! bool) {
      throw const FormatException('Invalid setup view facts');
    }
    return PrivateEventSetupFacts(
      ticketsSold: raw['ticketsSold'] as int,
      grossMinor: raw['grossMinor'] as int,
      arrivalReady: (raw['arrivalMessage'] as Map)['ready'] as bool,
    );
  }
}

/// One read of `hostEventSetupViews/{eventId}`: the manager projection of an
/// event, written ahead of time by the server.
class PrivateEventSetupView {
  const PrivateEventSetupView({
    required this.organizerId,
    required this.eventId,
    required this.sourceCoverage,
    this.summary,
    this.setupRevision,
    this.evaluatedAt,
    this.incompleteSource,
    this.facts,
  });

  const PrivateEventSetupView.missing({
    required this.organizerId,
    required this.eventId,
  }) : sourceCoverage = PrivateEventSetupCoverage.missing,
       summary = null,
       setupRevision = null,
       evaluatedAt = null,
       incompleteSource = null,
       facts = null;

  /// A view with [summary] as its complete projection.
  PrivateEventSetupView.complete(PrivateEventBasicSummary this.summary)
    : organizerId = summary.organizerId,
      eventId = summary.eventId,
      sourceCoverage = PrivateEventSetupCoverage.complete,
      setupRevision = summary.setupRevision,
      evaluatedAt = null,
      incompleteSource = null,
      facts = null;

  /// Parses the document; [data] is null when it does not exist yet. A
  /// document for another event or organizer is a [FormatException].
  factory PrivateEventSetupView.fromFirestore({
    required String organizerId,
    required String eventId,
    required Map<String, Object?>? data,
    required DateTime now,
  }) {
    if (data == null) {
      return PrivateEventSetupView.missing(
        organizerId: organizerId,
        eventId: eventId,
      );
    }
    final coverage = switch (data['sourceCoverage']) {
      'complete' => PrivateEventSetupCoverage.complete,
      'invalidSource' => PrivateEventSetupCoverage.invalidSource,
      _ => throw const FormatException('Invalid setup view coverage'),
    };
    final setupRevision = data['setupRevision'];
    final evaluatedAt = data['evaluatedAt'];
    final incompleteSource = data['incompleteSource'];
    if (data['schemaVersion'] != 1 ||
        data['organizerId'] != organizerId ||
        data['eventId'] != eventId ||
        setupRevision is! int ||
        setupRevision < 1 ||
        evaluatedAt is! Timestamp ||
        (incompleteSource != null && incompleteSource is! String) ||
        (coverage == PrivateEventSetupCoverage.complete &&
            (data['summary'] == null || incompleteSource != null))) {
      throw const FormatException('Private event setup view changed identity');
    }
    final summary = data['summary'] == null
        ? null
        : PrivateEventBasicSummary.fromFirestore(data['summary'], now: now);
    if (summary != null &&
        (summary.organizerId != organizerId || summary.eventId != eventId)) {
      throw const FormatException('Private event setup view changed identity');
    }
    return PrivateEventSetupView(
      organizerId: organizerId,
      eventId: eventId,
      sourceCoverage: coverage,
      summary: summary,
      setupRevision: setupRevision,
      evaluatedAt: evaluatedAt.toDate(),
      incompleteSource: incompleteSource as String?,
      facts: PrivateEventSetupFacts.fromView(data['facts']),
    );
  }

  final String organizerId;
  final String eventId;
  final PrivateEventSetupCoverage sourceCoverage;
  final PrivateEventBasicSummary? summary;
  final int? setupRevision;
  final DateTime? evaluatedAt;
  final String? incompleteSource;

  /// The trigger-owned facts; null on views written before them.
  final PrivateEventSetupFacts? facts;

  bool get isComplete =>
      sourceCoverage == PrivateEventSetupCoverage.complete && summary != null;

  /// The summary of a complete view; otherwise the typed reason it is not.
  PrivateEventBasicSummary requireSummary() {
    if (isComplete) return summary!;
    throw PrivateEventSetupViewUnavailable(
      sourceCoverage,
      source: incompleteSource,
    );
  }

  /// Whether this view already reflects a command that committed [revision].
  bool reflects(int revision) => isComplete && (setupRevision ?? 0) >= revision;
}

/// The first complete view at or above [atLeastRevision]. A missing view is
/// awaited (the server writes it after create); an invalid one is a
/// [PrivateEventSetupViewUnavailable].
Future<PrivateEventBasicSummary> firstCompleteSetupView(
  Stream<PrivateEventSetupView> views, {
  int atLeastRevision = 1,
}) {
  final done = Completer<PrivateEventBasicSummary>();
  late final StreamSubscription<PrivateEventSetupView> subscription;
  void finish(void Function() complete) {
    if (done.isCompleted) return;
    complete();
    // The answer does not wait for the listener to stop.
    unawaited(subscription.cancel());
  }

  subscription = views.listen(
    (view) {
      if (view.sourceCoverage == PrivateEventSetupCoverage.invalidSource) {
        finish(
          () => done.completeError(
            PrivateEventSetupViewUnavailable(
              view.sourceCoverage,
              source: view.incompleteSource,
            ),
          ),
        );
      } else if (view.reflects(atLeastRevision)) {
        finish(() => done.complete(view.summary));
      }
    },
    onError: (Object error, StackTrace stackTrace) =>
        finish(() => done.completeError(error, stackTrace)),
    onDone: () => finish(
      () => done.completeError(
        const PrivateEventSetupViewUnavailable(
          PrivateEventSetupCoverage.missing,
        ),
      ),
    ),
  );
  return done.future;
}

/// A view for another event or organizer than [scope] names, as an error.
FormatException? privateEventSetupViewMismatch(
  PrivateEventSetupView view,
  ({String organizerId, String eventId, String userId}) scope,
) => view.organizerId != scope.organizerId || view.eventId != scope.eventId
    ? const FormatException('Private event setup view changed identity')
    : null;
