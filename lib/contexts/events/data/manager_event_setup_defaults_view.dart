import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Whether the server's organizer defaults view could be read completely.
enum ManagerEventSetupDefaultsCoverage {
  /// The view holds the defaults as the server last evaluated them.
  complete,

  /// A source document failed validation; the defaults are not trustworthy.
  invalidSource,

  /// The server has not written the view yet.
  missing,
}

/// The typed reason a step cannot use the organizer's defaults.
class ManagerEventSetupDefaultsUnavailable implements Exception {
  const ManagerEventSetupDefaultsUnavailable(this.coverage, {this.source});

  final ManagerEventSetupDefaultsCoverage coverage;
  final String? source;

  @override
  String toString() =>
      'ManagerEventSetupDefaultsUnavailable(${coverage.name}'
      '${source == null ? '' : ', $source'})';
}

/// One read of `hostEventSetupDefaultViews/{organizerId}`: the defaults
/// projection, hashes included, written ahead of time by the server.
class ManagerEventSetupDefaultsView {
  const ManagerEventSetupDefaultsView({
    required this.organizerId,
    required this.sourceCoverage,
    this.defaults,
    this.revision,
    this.evaluatedAt,
    this.incompleteSource,
  });

  const ManagerEventSetupDefaultsView.missing(this.organizerId)
    : sourceCoverage = ManagerEventSetupDefaultsCoverage.missing,
      defaults = null,
      revision = null,
      evaluatedAt = null,
      incompleteSource = null;

  /// A view with [defaults] as its complete projection.
  ManagerEventSetupDefaultsView.complete(
    ManagerEventSetupDefaults this.defaults,
  ) : organizerId = defaults.organizerId,
      sourceCoverage = ManagerEventSetupDefaultsCoverage.complete,
      revision = null,
      evaluatedAt = null,
      incompleteSource = null;

  /// Parses the document; [data] is null when it does not exist yet. A
  /// document for another organizer is a [FormatException].
  factory ManagerEventSetupDefaultsView.fromFirestore({
    required String organizerId,
    required Map<String, Object?>? data,
  }) {
    if (data == null) return ManagerEventSetupDefaultsView.missing(organizerId);
    final coverage = switch (data['sourceCoverage']) {
      'complete' => ManagerEventSetupDefaultsCoverage.complete,
      'invalidSource' => ManagerEventSetupDefaultsCoverage.invalidSource,
      _ => throw const FormatException('Invalid defaults view coverage'),
    };
    final revision = data['revision'];
    final evaluatedAt = data['evaluatedAt'];
    final incompleteSource = data['incompleteSource'];
    if (data['schemaVersion'] != 1 ||
        data['organizerId'] != organizerId ||
        revision is! int ||
        revision < 1 ||
        evaluatedAt is! Timestamp ||
        (incompleteSource != null && incompleteSource is! String) ||
        (coverage == ManagerEventSetupDefaultsCoverage.complete &&
            (data['view'] == null || incompleteSource != null))) {
      throw const FormatException('Organizer defaults view changed identity');
    }
    final defaults = data['view'] == null
        ? null
        : ManagerEventSetupDefaults.fromResponse(data['view']);
    if (defaults != null && defaults.organizerId != organizerId) {
      throw const FormatException('Organizer defaults view changed identity');
    }
    return ManagerEventSetupDefaultsView(
      organizerId: organizerId,
      sourceCoverage: coverage,
      defaults: defaults,
      revision: revision,
      evaluatedAt: evaluatedAt.toDate(),
      incompleteSource: incompleteSource as String?,
    );
  }

  final String organizerId;
  final ManagerEventSetupDefaultsCoverage sourceCoverage;
  final ManagerEventSetupDefaults? defaults;
  final int? revision;
  final DateTime? evaluatedAt;
  final String? incompleteSource;

  bool get isComplete =>
      sourceCoverage == ManagerEventSetupDefaultsCoverage.complete &&
      defaults != null;

  /// The defaults of a complete view; otherwise the typed reason they are not.
  ManagerEventSetupDefaults requireDefaults() {
    if (isComplete) return defaults!;
    throw ManagerEventSetupDefaultsUnavailable(
      sourceCoverage,
      source: incompleteSource,
    );
  }
}

/// The first complete defaults view. A missing view is awaited; an invalid
/// one is a [ManagerEventSetupDefaultsUnavailable].
Future<ManagerEventSetupDefaults> firstCompleteDefaultsView(
  Stream<ManagerEventSetupDefaultsView> views,
) {
  final done = Completer<ManagerEventSetupDefaults>();
  late final StreamSubscription<ManagerEventSetupDefaultsView> subscription;
  void finish(void Function() complete) {
    if (done.isCompleted) return;
    complete();
    // The answer does not wait for the listener to stop.
    unawaited(subscription.cancel());
  }

  subscription = views.listen(
    (view) {
      if (view.sourceCoverage ==
          ManagerEventSetupDefaultsCoverage.invalidSource) {
        finish(
          () => done.completeError(
            ManagerEventSetupDefaultsUnavailable(
              view.sourceCoverage,
              source: view.incompleteSource,
            ),
          ),
        );
      } else if (view.isComplete) {
        finish(() => done.complete(view.defaults));
      }
    },
    onError: (Object error, StackTrace stackTrace) =>
        finish(() => done.completeError(error, stackTrace)),
    onDone: () => finish(
      () => done.completeError(
        const ManagerEventSetupDefaultsUnavailable(
          ManagerEventSetupDefaultsCoverage.missing,
        ),
      ),
    ),
  );
  return done.future;
}

/// A defaults view for another organizer than [organizerId], as an error.
FormatException? defaultsViewMismatch(
  ManagerEventSetupDefaultsView view,
  String organizerId,
) => view.organizerId != organizerId
    ? const FormatException('Organizer defaults view changed identity')
    : null;
