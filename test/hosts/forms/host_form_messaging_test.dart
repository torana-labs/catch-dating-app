import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'legacy forms offer neither permission and edits preserve other data',
    () {
      final original = HostFormDefinition.fromMap(const {
        'identityPolicy': 'phoneVerified',
        'title': 'Application',
        'consent': {'consentCopy': 'Share answers with the organizer'},
      });
      expect(original.offersOrganizerWhatsapp, isFalse);
      expect(original.offersCatchWhatsapp, isFalse);
      final organizer = original.withMessagingConsent(organizerWhatsapp: true);
      expect(organizer.offersOrganizerWhatsapp, isTrue);
      expect(organizer.offersCatchWhatsapp, isFalse);
      final both = organizer.withMessagingConsent(catchWhatsapp: true);
      final catchOnly = both.withMessagingConsent(organizerWhatsapp: false);
      final restored = HostFormDefinition.fromMap(catchOnly.toJson());
      expect(restored.offersOrganizerWhatsapp, isFalse);
      expect(restored.offersCatchWhatsapp, isTrue);
      expect(restored.toJson()['consent'], original.toJson()['consent']);
      expect(restored.title, 'Application');
      expect(original.toJson().containsKey('messagingConsent'), isFalse);
    },
  );
}
