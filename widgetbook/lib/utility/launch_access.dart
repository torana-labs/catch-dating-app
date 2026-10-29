import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

final _launchPendingApplication = LaunchAccessApplication(
  uid: widgetbookUtilityViewerUid,
  status: LaunchAccessApplicationStatus.pending,
  city: 'in-mh-mumbai',
  role: LaunchAccessRole.both,
  eventTypes: const [
    LaunchAccessEventType.runClub,
    LaunchAccessEventType.coffee,
  ],
  availabilityWindows: const [
    LaunchAccessAvailabilityWindow.weekdayEvenings,
    LaunchAccessAvailabilityWindow.saturdayMornings,
  ],
  wantsToHost: true,
  inviteCode: 'BETA-MUMBAI',
  instagramHandle: 'neharuns',
  referralSource: 'Sea Face Social',
  whyCatch: 'I want more low-pressure ways to meet people around events.',
  submissionCount: 2,
  createdAt: widgetbookUtilityCalendarNow.subtract(const Duration(days: 6)),
  submittedAt: widgetbookUtilityCalendarNow.subtract(const Duration(days: 1)),
  updatedAt: widgetbookUtilityCalendarNow.subtract(const Duration(days: 1)),
);

final _launchApprovedApplication = _launchPendingApplication.copyWith(
  status: LaunchAccessApplicationStatus.approvedForProfile,
  reviewedAt: widgetbookUtilityCalendarNow,
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: LaunchAccessApplicationScreen,
  path: '[P3 utility surfaces]/Launch access',
)
Widget launchAccessApplicationScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'LaunchAccessApplicationScreen',
    contractId: 'screen.launch_access.application',
    children: [
      WidgetbookPageStateCard(
        label: 'uid loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _LaunchAccessScope(
            uidStream: UtilitySurfaceFixtures.loadingStream<String?>(),
            child: const LaunchAccessApplicationScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out',
        child: WidgetbookUtilityDeviceFrame(
          child: _LaunchAccessScope(
            uidStream: Stream<String?>.value(null),
            child: const LaunchAccessApplicationScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'new application',
        child: WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: _LaunchAccessScope(
              applicationStream: Stream.value(null),
              child: const LaunchAccessApplicationScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'approved status',
        child: WidgetbookUtilityDeviceFrame(
          child: _LaunchAccessScope(
            applicationStream: Stream.value(_launchApprovedApplication),
            child: const LaunchAccessApplicationScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Form states',
  type: LaunchAccessApplicationForm,
  path: '[P3 utility surfaces]/Launch access',
)
Widget launchAccessApplicationFormStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'LaunchAccessApplicationForm',
    contractId: 'screen.launch_access.application.form',
    children: [
      WidgetbookPageStateCard(
        label: 'blank application',
        child: const WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: _LaunchAccessScope(child: LaunchAccessApplicationForm()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'seeded edit',
        child: WidgetbookUtilityDeviceFrame(
          child: IgnorePointer(
            child: _LaunchAccessScope(
              child: LaunchAccessApplicationForm(
                application: _launchPendingApplication,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _LaunchAccessScope extends StatelessWidget {
  const _LaunchAccessScope({
    required this.child,
    this.uidStream,
    this.applicationStream,
  });

  final Widget child;
  final Stream<String?>? uidStream;
  final Stream<LaunchAccessApplication?>? applicationStream;

  @override
  Widget build(BuildContext context) {
    final applicationStream = this.applicationStream;
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) =>
              uidStream ?? Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        if (applicationStream != null)
          watchLaunchAccessApplicationProvider(
            widgetbookUtilityViewerUid,
          ).overrideWith((ref) => applicationStream),
      ],
      child: child,
    );
  }
}
