import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostCrmChannelReadiness {
  currentEventOnly,
  providerSetupRequired,
  providerAndDltSetupRequired,
}

class HostCrmSummary {
  const HostCrmSummary({
    required this.organizerId,
    required this.contactCount,
    required this.pastAttendeeCount,
    required this.repeatAttendeeCount,
    required this.linkedAccountCount,
    required this.importedContactCount,
    required this.whatsappOptInCount,
    required this.smsOptInCount,
    required this.truncated,
    required this.inAppReadiness,
    required this.whatsappReadiness,
    required this.smsReadiness,
  });

  factory HostCrmSummary.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'CRM summary response');
    final readiness = crmRequiredMap(map['readiness'], 'CRM readiness');
    return HostCrmSummary(
      organizerId: crmRequiredString(map, 'organizerId'),
      contactCount: crmRequiredInt(map, 'contactCount'),
      pastAttendeeCount: crmRequiredInt(map, 'pastAttendeeCount'),
      repeatAttendeeCount: crmRequiredInt(map, 'repeatAttendeeCount'),
      linkedAccountCount: crmRequiredInt(map, 'linkedAccountCount'),
      importedContactCount: crmRequiredInt(map, 'importedContactCount'),
      whatsappOptInCount: crmRequiredInt(map, 'whatsappOptInCount'),
      smsOptInCount: crmRequiredInt(map, 'smsOptInCount'),
      truncated: crmRequiredBool(map, 'truncated'),
      inAppReadiness: _readiness(readiness['inApp']),
      whatsappReadiness: _readiness(readiness['whatsapp']),
      smsReadiness: _readiness(readiness['sms']),
    );
  }

  final String organizerId;
  final int contactCount;
  final int pastAttendeeCount;
  final int repeatAttendeeCount;
  final int linkedAccountCount;
  final int importedContactCount;
  final int whatsappOptInCount;
  final int smsOptInCount;
  final bool truncated;
  final HostCrmChannelReadiness inAppReadiness;
  final HostCrmChannelReadiness whatsappReadiness;
  final HostCrmChannelReadiness smsReadiness;
}

HostCrmChannelReadiness _readiness(Object? value) => switch (value) {
  'currentEventOnly' => HostCrmChannelReadiness.currentEventOnly,
  'providerSetupRequired' => HostCrmChannelReadiness.providerSetupRequired,
  'providerAndDltSetupRequired' =>
    HostCrmChannelReadiness.providerAndDltSetupRequired,
  _ => throw const FormatException('CRM response had invalid readiness.'),
};
