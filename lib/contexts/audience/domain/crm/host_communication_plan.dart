import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostCommunicationIntent { individualConversation }

enum HostCommunicationOutcome { inCatch, automatic, byHand, unavailable }

enum HostCommunicationRouteId {
  personalWhatsappHandoff,
  personalEmailHandoff,
  organizerWhatsappCampaign,
  catchWhatsapp,
  catchChat,
  catchEventAnnouncement,
  organizerFollowerUpdate,
}

enum HostCommunicationExecutionMode { managedDelivery, externalHandoff }

enum HostCommunicationRouteAvailability { available, unavailable }

enum HostCommunicationRouteBlocker {
  catchAccountRequired,
  identityAmbiguous,
  missingPhone,
  missingEmail,
  organizerSuppressed,
  contactOptedOut,
  permissionRequired,
  senderUnavailable,
  intentUnsupported,
  contactUnavailable,
  endpointChanged,
}

class HostCommunicationRouteOption {
  const HostCommunicationRouteOption({
    required this.routeId,
    required this.executionMode,
    required this.availability,
    required this.blocker,
  });

  factory HostCommunicationRouteOption.fromMap(Map<Object?, Object?> map) =>
      HostCommunicationRouteOption(
        routeId: crmEnumByName(
          HostCommunicationRouteId.values,
          crmRequiredString(map, 'routeId'),
          'communication route id',
        ),
        executionMode: crmEnumByName(
          HostCommunicationExecutionMode.values,
          crmRequiredString(map, 'executionMode'),
          'communication execution mode',
        ),
        availability: crmEnumByName(
          HostCommunicationRouteAvailability.values,
          crmRequiredString(map, 'availability'),
          'communication route availability',
        ),
        blocker: map['blocker'] == null
            ? null
            : crmEnumByName(
                HostCommunicationRouteBlocker.values,
                crmRequiredString(map, 'blocker'),
                'communication route blocker',
              ),
      );

  final HostCommunicationRouteId routeId;
  final HostCommunicationExecutionMode executionMode;
  final HostCommunicationRouteAvailability availability;
  final HostCommunicationRouteBlocker? blocker;

  bool get isAvailable =>
      availability == HostCommunicationRouteAvailability.available;
}

class HostCommunicationRecipientPlan {
  const HostCommunicationRecipientPlan({
    required this.contactId,
    required this.displayName,
    required this.outcome,
    required this.recommendedRouteId,
    required this.routes,
  });

  factory HostCommunicationRecipientPlan.fromMap(Map<Object?, Object?> map) {
    final routes = crmMapList(
      map['routes'],
      'communication routes',
    ).map(HostCommunicationRouteOption.fromMap).toList(growable: false);
    if (routes.map((route) => route.routeId).toSet().length != routes.length) {
      throw const FormatException(
        'Communication plan contains duplicate routes.',
      );
    }
    for (final route in routes) {
      if (route.isAvailable != (route.blocker == null)) {
        throw FormatException(
          'Communication route ${route.routeId.name} has inconsistent '
          'availability and blocker values.',
        );
      }
    }
    final recipient = HostCommunicationRecipientPlan(
      contactId: crmRequiredString(map, 'contactId'),
      displayName: crmRequiredString(map, 'displayName'),
      outcome: crmEnumByName(
        HostCommunicationOutcome.values,
        crmRequiredString(map, 'outcome'),
        'communication outcome',
      ),
      recommendedRouteId: map['recommendedRouteId'] == null
          ? null
          : crmEnumByName(
              HostCommunicationRouteId.values,
              crmRequiredString(map, 'recommendedRouteId'),
              'recommended communication route',
            ),
      routes: routes,
    );
    final recommendedRouteId = recipient.recommendedRouteId;
    if (recommendedRouteId != null &&
        !recipient.route(recommendedRouteId).isAvailable) {
      throw const FormatException(
        'Recommended communication route must be available.',
      );
    }
    return recipient;
  }

  final String contactId;
  final String displayName;
  final HostCommunicationOutcome outcome;
  final HostCommunicationRouteId? recommendedRouteId;
  final List<HostCommunicationRouteOption> routes;

  HostCommunicationRouteOption route(HostCommunicationRouteId routeId) =>
      routes.firstWhere(
        (route) => route.routeId == routeId,
        orElse: () => throw FormatException(
          'Communication plan omitted ${routeId.name}.',
        ),
      );
}

class HostCommunicationPlan {
  const HostCommunicationPlan({
    required this.organizerId,
    required this.intent,
    required this.capabilityVersion,
    required this.resolvedAt,
    required this.recipients,
  });

  factory HostCommunicationPlan.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer communication plan');
    final plan = HostCommunicationPlan(
      organizerId: crmRequiredString(map, 'organizerId'),
      intent: crmEnumByName(
        HostCommunicationIntent.values,
        crmRequiredString(map, 'intent'),
        'communication intent',
      ),
      capabilityVersion: crmRequiredInt(map, 'capabilityVersion'),
      resolvedAt: crmRequiredDateTimeFromMillis(map, 'resolvedAtMillis'),
      recipients: crmMapList(
        map['recipients'],
        'communication recipients',
      ).map(HostCommunicationRecipientPlan.fromMap).toList(growable: false),
    );
    final recipient = plan.singleRecipient;
    recipient.route(HostCommunicationRouteId.catchChat);
    recipient.route(HostCommunicationRouteId.personalWhatsappHandoff);
    return plan;
  }

  final String organizerId;
  final HostCommunicationIntent intent;
  final int capabilityVersion;
  final DateTime resolvedAt;
  final List<HostCommunicationRecipientPlan> recipients;

  HostCommunicationRecipientPlan get singleRecipient {
    if (recipients.length != 1) {
      throw const FormatException(
        'Individual communication plan must contain one recipient.',
      );
    }
    return recipients.single;
  }
}
