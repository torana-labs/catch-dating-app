import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('campaign bridge fails closed while customer history is incomplete', () {
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: true,
        messagingSetup: null,
        audienceCoverageComplete: false,
      ),
      HostCampaignBlockers.audienceCoveragePartial,
    );
  });
}
