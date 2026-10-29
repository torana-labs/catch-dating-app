import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/organizers/domain/organizer_supply_capabilities.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('OrganizerAuthority', () {
    test('maps every claim state explicitly without a claimed fallback', () {
      const expected = <OrganizerClaimState, OrganizerTrustState>{
        OrganizerClaimState.unclaimed: OrganizerTrustState.crawledUnclaimed,
        OrganizerClaimState.claimPending: OrganizerTrustState.claimPending,
        OrganizerClaimState.claimed: OrganizerTrustState.claimedUnverified,
        OrganizerClaimState.verified: OrganizerTrustState.ownerVerified,
        OrganizerClaimState.suppressed: OrganizerTrustState.suppressed,
      };

      for (final entry in expected.entries) {
        final authority = OrganizerAuthority.resolve(
          hasLegacyOwner: false,
          claim: OrganizerClaim.fromJson({'state': entry.key.name}),
        );
        expect(authority.trustState, entry.value, reason: entry.key.name);
      }
    });

    test('distinguishes source evidence from owner verification', () {
      final sourceBacked = OrganizerAuthority.resolve(
        hasLegacyOwner: false,
        provenance: OrganizerProvenance.fromJson({
          'origin': 'scraper',
          'sourceConfidence': 'high',
          'verificationStatus': 'sourceBacked',
        }),
      );
      final ownerVerified = OrganizerAuthority.resolve(
        hasLegacyOwner: false,
        provenance: OrganizerProvenance.fromJson({
          'origin': 'scraper',
          'sourceConfidence': 'ownerVerified',
          'verificationStatus': 'ownerVerified',
        }),
      );

      expect(sourceBacked.trustState, OrganizerTrustState.sourceBacked);
      expect(sourceBacked.isOwnerVerified, isFalse);
      expect(ownerVerified.trustState, OrganizerTrustState.ownerVerified);
      expect(ownerVerified.isOwnerVerified, isTrue);
    });

    test('keeps first-party origin distinct from owner verification', () {
      final authority = OrganizerAuthority.resolve(
        hasLegacyOwner: false,
        ownership: OrganizerOwnership.fromJson({'state': 'userCreated'}),
        claim: OrganizerClaim.fromJson({'state': 'claimed'}),
        provenance: OrganizerProvenance.fromJson({
          'origin': 'userCreated',
          'sourceConfidence': 'high',
          'verificationStatus': 'sourceBacked',
        }),
      );

      expect(authority.trustState, OrganizerTrustState.firstParty);
      expect(authority.isOwnerVerified, isFalse);
    });

    test('first-party creation wins for the canonical verified payload', () {
      final authority = OrganizerAuthority.resolve(
        hasLegacyOwner: true,
        ownership: OrganizerOwnership.fromJson({'state': 'userCreated'}),
        claim: OrganizerClaim.fromJson({'state': 'verified'}),
        provenance: OrganizerProvenance.fromJson({
          'origin': 'userCreated',
          'sourceConfidence': 'ownerVerified',
          'verificationStatus': 'ownerVerified',
        }),
      );

      expect(authority.trustState, OrganizerTrustState.firstParty);
      expect(authority.isOwnerVerified, isFalse);
    });

    test('claim suppression overrides otherwise verified authority', () {
      final authority = OrganizerAuthority.resolve(
        hasLegacyOwner: true,
        claim: OrganizerClaim.fromJson({'state': 'suppressed'}),
        publicPage: OrganizerPublicPage.fromJson({
          'publishStatus': 'removed',
          'indexStatus': 'indexed',
        }),
      );

      expect(authority.trustState, OrganizerTrustState.suppressed);
      expect(authority.blocksPublicRead, isTrue);
    });

    test('marketing removal does not hide a discoverable native organizer', () {
      final publicPage = OrganizerPublicPage.fromJson({
        'publishStatus': 'removed',
        'indexStatus': 'noindex',
      });
      final authority = OrganizerAuthority.resolve(
        hasLegacyOwner: false,
        claim: OrganizerClaim.fromJson({'state': 'unclaimed'}),
        publicPage: publicPage,
      );

      expect(authority.trustState, OrganizerTrustState.crawledUnclaimed);
      expect(authority.blocksPublicRead, isFalse);
      expect(publicPage.blocksPublicRead, isTrue);
    });

    test('legacy records retain conservative compatibility states', () {
      final owned = OrganizerAuthority.resolve(hasLegacyOwner: true);
      final unowned = OrganizerAuthority.resolve(hasLegacyOwner: false);

      expect(owned.trustState, OrganizerTrustState.claimedUnverified);
      expect(owned.isOwnerVerified, isFalse);
      expect(unowned.trustState, OrganizerTrustState.crawledUnclaimed);
    });
  });

  group('OrganizerSupplyCapabilities', () {
    test('does not derive capabilities from legacy ownership', () {
      final capabilities = OrganizerSupplyCapabilities.fromJson(
        readOrganizerSupplyCapabilities({
              'hostUserId': 'host-1',
            }, 'supplyCapabilities')
            as Map<String, dynamic>,
      );

      expect(capabilities, const OrganizerSupplyCapabilities.denied());
    });

    test('does not derive capabilities from claim authority', () {
      final capabilities = OrganizerSupplyCapabilities.fromJson(
        readOrganizerSupplyCapabilities({
              'claim': {'state': 'unclaimed'},
            }, 'supplyCapabilities')
            as Map<String, dynamic>,
      );

      expect(capabilities, const OrganizerSupplyCapabilities.denied());
    });

    test('accepts only a complete canonical capability projection', () {
      final managed = OrganizerSupplyCapabilities.fromJson(
        const OrganizerSupplyCapabilities.claimedManaged().toJson(),
      );
      final incomplete = OrganizerSupplyCapabilities.fromJson({
        'mode': 'claimed_managed',
      });

      expect(managed, const OrganizerSupplyCapabilities.claimedManaged());
      expect(incomplete, const OrganizerSupplyCapabilities.denied());
    });
  });
}
