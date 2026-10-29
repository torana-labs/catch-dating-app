import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';

abstract final class HostCampaignBlockers {
  static const providerSetupRequired = 'providerSetupRequired';
  static const senderInactive = 'senderInactive';
  static const templateMissing = 'templateMissing';
  static const templateUnapproved = 'templateUnapproved';
  static const noReachableRecipients = 'noReachableRecipients';
  static const audienceCoveragePartial = 'audienceCoveragePartial';
  static const audienceTooLarge = 'audienceTooLarge';
  static const eventMissing = 'eventMissing';
  static const eventUnavailable = 'eventUnavailable';
  static const scheduleInPast = 'scheduleInPast';
}

String? hostCampaignBridgeBlocker({
  required bool hasPersistableAudience,
  required HostMessagingSetup? messagingSetup,
  required bool audienceCoverageComplete,
}) {
  if (!hasPersistableAudience) {
    return HostCampaignBlockers.noReachableRecipients;
  }
  if (!audienceCoverageComplete) {
    return HostCampaignBlockers.audienceCoveragePartial;
  }
  if (messagingSetup?.providerConfigured == false) {
    return HostCampaignBlockers.providerSetupRequired;
  }
  if (messagingSetup?.connection?.isActive != true) {
    return HostCampaignBlockers.senderInactive;
  }
  return null;
}

bool hostCampaignTemplateUsesInvite(HostWhatsappTemplate template) =>
    template.variableNames.any(hostCampaignIsInviteVariable);

bool hostCampaignIsInviteVariable(String name) =>
    name == 'invite_url' || name == 'invite_token';
