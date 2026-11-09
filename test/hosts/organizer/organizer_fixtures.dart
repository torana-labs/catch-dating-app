import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/media/uploaded_photo.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../organizers/organizers_test_helpers.dart';

/// A Tuesday afternoon in November.
final organizerNow = DateTime(2026, 11, 8, 15);

const organizerOwnerUid = 'meher';
const organizerHostUid = 'dev';

/// Lantern Lane Social: an owner, a host, trivia and suppers.
Organizer lanternLane({
  String? instagramHandle = 'lanternlane.social',
  List<UploadedPhoto> photos = const [],
  int followers = 1284,
}) => buildOrganizer(
  id: 'lantern-lane',
  name: 'Lantern Lane Social',
  description: 'We started with one quiz in a Bandra bar.',
  area: 'Bandra West',
  hostUserId: organizerOwnerUid,
  ownerUserId: organizerOwnerUid,
  hostUserIds: const [organizerOwnerUid, organizerHostUid],
  hostProfiles: const [
    OrganizerHostProfile(
      uid: organizerOwnerUid,
      displayName: 'Meher',
      role: OrganizerHostRole.owner,
    ),
    OrganizerHostProfile(uid: organizerHostUid, displayName: 'Dev Patel'),
  ],
  createdAt: DateTime(2023, 3),
  instagramHandle: instagramHandle,
  organizerPhotos: photos,
  memberCount: followers,
  hostDefaults: const OrganizerHostDefaults(
    primaryActivityKind: ActivityKind.pubQuiz,
    supportedActivityKinds: [ActivityKind.dinner],
  ),
);

HostOrganizerBill organizerBill({
  String id = 'bill-oct',
  DateTime? month,
  HostOrganizerBillStatus status = HostOrganizerBillStatus.sent,
  int salesMinor = 14800000,
  int commissionMinor = 740000,
  int? capMinor = 1000000,
  bool capped = false,
  int events = 9,
  DateTime? dueAt,
  String? paymentUrl = 'https://rzp.io/i/bill',
  int refundCreditAppliedMinor = 0,
  int refundCreditCarriedMinor = 0,
}) => HostOrganizerBill(
  billId: id,
  month: month ?? DateTime(2026, 10),
  status: status,
  paymentCount: 120,
  eventCount: events,
  grossMinor: salesMinor,
  refundedMinor: 0,
  providerFeeMinor: 0,
  commissionMinor: commissionMinor,
  capMinor: capMinor,
  capped: capped,
  trialWaivedMinor: 0,
  gstRegistered: false,
  gstMinor: 0,
  totalMinor: commissionMinor,
  invoiceNumber: null,
  dueAt: dueAt ?? DateTime(2026, 11, 15),
  paymentUrl: paymentUrl,
  paidAt: null,
  paidMinor: null,
  refundCreditAppliedMinor: refundCreditAppliedMinor,
  refundCreditCarriedMinor: refundCreditCarriedMinor,
);

HostFormPaymentSetup razorpaySetup({
  bool ready = true,
  bool connected = true,
  String? lastErrorCode,
}) => HostFormPaymentSetup(
  available: true,
  connections: [
    if (connected)
      HostFormPaymentConnection(
        connectionId: 'conn-1',
        status: ready
            ? HostFormPaymentConnectionStatus.ready
            : HostFormPaymentConnectionStatus.needsAttention,
        mode: HostFormPaymentMode.live,
        accountId: 'acc_LanternLane',
        webhookVerified: true,
        lastErrorCode: lastErrorCode,
      ),
  ],
);

/// Pumps [body] in a phone-sized system screen with an optional dock.
Future<void> pumpOrganizerBody(
  WidgetTester tester,
  Widget body, {
  CatchDock? dock,
  Size size = const Size(390, 2400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(body: body, dock: dock),
      ),
    ),
  );
  await tester.pump();
}
