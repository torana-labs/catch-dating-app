import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('campaign bridge requires a saved audience and active sender', () {
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: true,
        messagingSetup: _messagingSetup(),
        audienceCoverageComplete: true,
      ),
      isNull,
    );
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: false,
        messagingSetup: _messagingSetup(),
        audienceCoverageComplete: true,
      ),
      HostCampaignBlockers.noReachableRecipients,
    );
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: true,
        messagingSetup: _messagingSetup(providerConfigured: false),
        audienceCoverageComplete: true,
      ),
      HostCampaignBlockers.providerSetupRequired,
    );
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: true,
        messagingSetup: _messagingSetup(connectionStatus: 'pending'),
        audienceCoverageComplete: true,
      ),
      HostCampaignBlockers.senderInactive,
    );
  });
}

HostMessagingSetup _messagingSetup({
  bool providerConfigured = true,
  String connectionStatus = 'active',
}) => HostMessagingSetup(
  organizerId: 'organizer-1',
  providerConfigured: providerConfigured,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'app-id',
    configId: 'config-id',
    graphVersion: 'v24.0',
  ),
  connection: HostWhatsappConnection(
    connectionId: 'connection-1',
    status: connectionStatus,
    displayPhoneNumber: '+91 98765 43210',
    verifiedName: 'Catch Social',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_1K',
    templateSyncStatus: 'ready',
    webhookStatus: 'healthy',
    testStatus: 'verified',
    revision: 1,
  ),
  templates: const [],
);
