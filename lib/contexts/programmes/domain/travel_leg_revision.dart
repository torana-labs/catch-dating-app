import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Receipt reference to this actor's immediately preceding journey observation.
/// It never authorizes rebasing over another actor's or itinerary's changes.
class TravelLegObservationReference {
  const TravelLegObservationReference({
    required this.clientOperationId,
    required this.action,
  });

  factory TravelLegObservationReference.fromJson(Map<Object?, Object?> json) {
    final action = requiredString(json, 'action');
    if (!{'claim', 'unclaim', 'markReady', 'markDisrupted'}.contains(action)) {
      throw const FormatException('Invalid preceding observation');
    }
    return TravelLegObservationReference(
      clientOperationId: requiredString(json, 'clientOperationId'),
      action: action,
    );
  }

  final String clientOperationId;
  final String action;

  Map<String, Object?> toJson() => {
    'clientOperationId': clientOperationId,
    'action': action,
  };
}

class DispatchLegRevision {
  const DispatchLegRevision({
    required this.legId,
    required this.revision,
    this.afterObservation,
  });

  factory DispatchLegRevision.fromJson(Map<Object?, Object?> json) {
    final revision = json['revision'];
    if (revision is! int || revision < 1) {
      throw const FormatException('Invalid dispatch revision');
    }
    return DispatchLegRevision(
      legId: requiredString(json, 'legId'),
      revision: revision,
      afterObservation: json['afterObservation'] == null
          ? null
          : TravelLegObservationReference.fromJson(
              requiredMap(json['afterObservation'], 'preceding observation'),
            ),
    );
  }

  final String legId;
  final int revision;
  final TravelLegObservationReference? afterObservation;

  Map<String, Object?> toJson() => {
    'legId': legId,
    'revision': revision,
    if (afterObservation != null)
      'afterObservation': afterObservation!.toJson(),
  };
}
