import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/hosts/presentation/host_club_publication_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart';

void main() {
  test('legacy organizer without publicPage is visible only in Catch', () {
    final state = HostClubPublicationState.fromClub(buildClub());

    expect(state.kind, HostClubPublicationKind.catchOnly);
    expect(state.catchAppVisible, isTrue);
    expect(state.websiteEnabled, isFalse);
    expect(state.targetPublicListingEnabled, isTrue);
  });

  test('publication state preserves the four independent channel states', () {
    final draftPage = _publicPage(published: false);
    final publishedPage = _publicPage(published: true);

    expect(
      HostClubPublicationState.fromClub(
        buildClub(
          appVisibility: ClubAppVisibility.hidden,
        ).copyWith(publicPage: draftPage),
      ).kind,
      HostClubPublicationKind.private,
    );
    expect(
      HostClubPublicationState.fromClub(
        buildClub().copyWith(publicPage: draftPage),
      ).kind,
      HostClubPublicationKind.catchOnly,
    );
    expect(
      HostClubPublicationState.fromClub(
        buildClub(
          appVisibility: ClubAppVisibility.hidden,
        ).copyWith(publicPage: publishedPage),
      ).kind,
      HostClubPublicationKind.websiteOnly,
    );
    final everywhere = HostClubPublicationState.fromClub(
      buildClub().copyWith(publicPage: publishedPage),
    );
    expect(everywhere.kind, HostClubPublicationKind.everywhere);
    expect(everywhere.targetPublicListingEnabled, isFalse);
  });

  test('published flag without a canonical route is not website enabled', () {
    final state = HostClubPublicationState.fromClub(
      buildClub().copyWith(
        publicPage: OrganizerPublicPage.fromJson({
          'publishStatus': 'published',
          'indexStatus': 'indexReady',
        }),
      ),
    );

    expect(state.kind, HostClubPublicationKind.catchOnly);
    expect(state.websiteEnabled, isFalse);
  });
}

OrganizerPublicPage _publicPage({required bool published}) =>
    OrganizerPublicPage.fromJson({
      'slug': 'stride-social-a1b2c3d4e5f6',
      'citySlug': 'mumbai',
      'canonicalPath': '/organizers/stride-social-a1b2c3d4e5f6/',
      'publishStatus': published ? 'published' : 'draft',
      'indexStatus': published ? 'indexReady' : 'noindex',
    });
