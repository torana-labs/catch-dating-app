import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum RehearsalConfirmedDelivery { accepted, delivered, read, revoked }

enum RehearsalDeliveryFailure {
  technical,
  policy,
  suppressed,
  invalidRecipient,
}

enum RehearsalDeliveryUncertainty { timeout, connectionLost, workerInterrupted }

sealed class RehearsalDeliveryOutcome {
  const RehearsalDeliveryOutcome();
  factory RehearsalDeliveryOutcome.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'failed':
        assistanceObject(map, {'kind', 'classification'});
        return RehearsalDeliveryFailed(
          assistanceEnum(
            RehearsalDeliveryFailure.values,
            map['classification'],
          ),
        );
      case 'unknown':
        assistanceObject(map, {'kind', 'reason'});
        return RehearsalDeliveryUnknown(
          assistanceEnum(RehearsalDeliveryUncertainty.values, map['reason']),
        );
      default:
        assistanceObject(map, {'kind'});
        return RehearsalDeliveryConfirmed(
          assistanceEnum(RehearsalConfirmedDelivery.values, map['kind']),
        );
    }
  }
  Map<String, Object?> toJson();
}

sealed class RehearsalConfirmedOutcome extends RehearsalDeliveryOutcome {
  const RehearsalConfirmedOutcome();
}

final class RehearsalDeliveryConfirmed extends RehearsalConfirmedOutcome {
  const RehearsalDeliveryConfirmed(this.result);
  final RehearsalConfirmedDelivery result;
  @override
  Map<String, Object?> toJson() => {'kind': result.name};
}

final class RehearsalDeliveryFailed extends RehearsalConfirmedOutcome {
  const RehearsalDeliveryFailed(this.classification);
  final RehearsalDeliveryFailure classification;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'failed',
    'classification': classification.name,
  };
}

final class RehearsalDeliveryUnknown extends RehearsalDeliveryOutcome {
  const RehearsalDeliveryUnknown(this.reason);
  final RehearsalDeliveryUncertainty reason;
  @override
  Map<String, Object?> toJson() => {'kind': 'unknown', 'reason': reason.name};
}
