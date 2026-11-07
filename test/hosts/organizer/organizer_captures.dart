import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_screen.dart';
import 'package:catch_dating_app/hosts/organizer/payments_screen.dart';
import 'package:catch_dating_app/hosts/organizer/settings_screen.dart';
import 'package:catch_dating_app/hosts/organizer/team_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/media/uploaded_photo.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import 'organizer_fixtures.dart';

/// The Organiser tab capture fixtures: Sea Face Social, live on the web,
/// with October's bill, two photos and a Razorpay account connected.

/// The organizer the captures show, owned by the fixture host.
final Organizer organizerCaptureOrganizer = HostOperationsFixtures
    .primaryOrganizer
    .copyWith(
      appVisibility: OrganizerAppVisibility.discoverable,
      publicPage: OrganizerPublicPage.fromJson({
        'publishStatus': 'published',
        'indexStatus': 'indexReady',
        'canonicalPath': '/seafacesocial',
      }),
      organizerPhotos: [
        for (final position in [0, 1])
          UploadedPhoto.fromUpload(
            url: '',
            storagePath: 'organizers/sea-face/$position.jpg',
            position: position,
          ),
      ],
      hostDefaults: const OrganizerHostDefaults(
        supportedActivityKinds: [ActivityKind.dinner],
      ),
    );

final List<HostOrganizerBill> _bills = [
  organizerBill(),
  organizerBill(
    id: 'bill-sep',
    month: DateTime(2026, 9),
    status: HostOrganizerBillStatus.paid,
    commissionMinor: 1000000,
    capped: true,
  ),
  organizerBill(
    id: 'bill-aug',
    month: DateTime(2026, 8),
    status: HostOrganizerBillStatus.free,
    commissionMinor: 0,
  ),
];

final OrganizerState _tab = OrganizerState(
  organizer: organizerCaptureOrganizer,
  isOwner: true,
  pageLink: 'catchdates.com/seafacesocial',
  pageLive: true,
  stats: const [
    OrganizerStat(
      kind: OrganizerStatKind.bookings,
      value: 312,
      previousValue: 264,
    ),
    OrganizerStat(
      kind: OrganizerStatKind.ticketSales,
      value: 14800000,
      previousValue: 13300000,
      currencyCode: 'INR',
    ),
    OrganizerStat(kind: OrganizerStatKind.followers, value: 428),
    OrganizerStat(
      kind: OrganizerStatKind.pageVisits,
      value: 1240,
      previousValue: 1010,
    ),
  ],
  billMinor: 740000,
  billCurrencyCode: 'INR',
  accountName: 'Mira',
  helpAvailable: true,
);

class _CapturePaymentSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      HostFormPaymentSetupState(setup: razorpaySetup());
}

/// The organizer screens' reads answered with the fixture organizer.
List<Override> organizerCaptureOverrides() => [
  organizerTabControllerProvider(
    OrganizerTabRequest(
      organizer: organizerCaptureOrganizer,
      uid: HostOperationsFixtures.hostUid,
    ),
  ).overrideWithValue(_tab),
  hostFormPaymentControllerProvider.overrideWith2(
    (_) => _CapturePaymentSetup(),
  ),
  hostOrganizerBillsProvider.overrideWith((ref, organizerId) async => _bills),
  appPackageInfoProvider.overrideWith(
    (ref) => (version: '4.0.1', buildNumber: '401'),
  ),
];

Widget organizerTabCapture() =>
    OrganizerScreen(initialOrganizerId: organizerCaptureOrganizer.id);

Widget organizerPageEditCapture() =>
    OrganizerPageEditScreen(initialOrganizerId: organizerCaptureOrganizer.id);

Widget organizerPaymentsCapture() => OrganizerPaymentsScreen(
  organizerId: organizerCaptureOrganizer.id,
  now: organizerNow,
);

Widget organizerTeamCapture() =>
    OrganizerTeamScreen(organizerId: organizerCaptureOrganizer.id);

Widget organizerSettingsCapture() =>
    OrganizerSettingsScreen(initialOrganizerId: organizerCaptureOrganizer.id);
