import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_publication_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart';

void main() {
  test('legacy organizer without publicPage is visible only in Catch', () {
    final state = HostOrganizerPublicationState.fromOrganizer(buildOrganizer());

    expect(state.kind, HostOrganizerPublicationKind.catchOnly);
    expect(state.catchAppVisible, isTrue);
    expect(state.websiteEnabled, isFalse);
    expect(state.targetPublicListingEnabled, isTrue);
  });

  test('publication state preserves the four independent channel states', () {
    final draftPage = _publicPage(published: false);
    final publishedPage = _publicPage(published: true);

    expect(
      HostOrganizerPublicationState.fromOrganizer(
        buildOrganizer(
          appVisibility: OrganizerAppVisibility.hidden,
        ).copyWith(publicPage: draftPage),
      ).kind,
      HostOrganizerPublicationKind.private,
    );
    expect(
      HostOrganizerPublicationState.fromOrganizer(
        buildOrganizer().copyWith(publicPage: draftPage),
      ).kind,
      HostOrganizerPublicationKind.catchOnly,
    );
    expect(
      HostOrganizerPublicationState.fromOrganizer(
        buildOrganizer(
          appVisibility: OrganizerAppVisibility.hidden,
        ).copyWith(publicPage: publishedPage),
      ).kind,
      HostOrganizerPublicationKind.websiteOnly,
    );
    final everywhere = HostOrganizerPublicationState.fromOrganizer(
      buildOrganizer().copyWith(publicPage: publishedPage),
    );
    expect(everywhere.kind, HostOrganizerPublicationKind.everywhere);
    expect(everywhere.targetPublicListingEnabled, isFalse);
  });

  test('published flag without a canonical route is not website enabled', () {
    final state = HostOrganizerPublicationState.fromOrganizer(
      buildOrganizer().copyWith(
        publicPage: OrganizerPublicPage.fromJson({
          'publishStatus': 'published',
          'indexStatus': 'indexReady',
        }),
      ),
    );

    expect(state.kind, HostOrganizerPublicationKind.catchOnly);
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
