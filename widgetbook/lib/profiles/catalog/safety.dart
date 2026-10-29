import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Safety action states',
  type: PublicProfileScreen,
  path: '[P1 product surfaces]/Profiles',
)
Widget publicProfileSafetyActionStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'Public profile safety actions',
    contractId: 'screen.profile.public safety',
    children: [
      WidgetbookProfileStateCard(
        label: 'route overflow actions',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'report sheet',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileWidePreviewExtent,
          child: Align(
            alignment: Alignment.bottomCenter,
            child: PublicProfileReportSheet(
              profileName: widgetbookProfileTargetProfile.name,
              onReasonSelected: (_) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'block confirmation dialog',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileWidePreviewExtent,
          child: _BlockDialogPreview(profile: widgetbookProfileTargetProfile),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'report mutation failure',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            mutationMode:
                WidgetbookProfilePublicProfileMutationMode.reportError,
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'block mutation failure',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            mutationMode: WidgetbookProfilePublicProfileMutationMode.blockError,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Report sheet',
  type: PublicProfileReportSheet,
  path: '[P1 product surfaces]/Profiles',
)
Widget publicProfileReportSheetStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'PublicProfileReportSheet',
    contractId: 'component.profile.public_report_sheet',
    children: [
      WidgetbookProfileStateCard(
        label: 'reason picker',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileWidePreviewExtent,
          child: Align(
            alignment: Alignment.bottomCenter,
            child: PublicProfileReportSheet(
              profileName: widgetbookProfileTargetProfile.name,
              onReasonSelected: (_) {},
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Report reason row',
  type: PublicProfileReportReasonTile,
  path: '[P1 product surfaces]/Profiles',
)
Widget publicProfileReportReasonTileStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'PublicProfileReportReasonTile',
    contractId: 'component.profile.public_report_reason_tile',
    children: [
      WidgetbookProfileStateCard(
        label: 'action row',
        child: PublicProfileReportReasonTile(
          label: 'Fake or misleading profile',
          value: 'fake_or_misleading_profile',
          onSelected: (_) {},
        ),
      ),
    ],
  );
}

class _BlockDialogPreview extends StatelessWidget {
  const _BlockDialogPreview({required this.profile});

  final PublicProfile profile;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: CatchDialog<bool>.confirmation(
        title: 'Block ${profile.name}?',
        message:
            'You will stop seeing each other in chats, matches, Catches, and '
            'future event slots where the other person is already booked.',
        actions: const [
          CatchDialogAction(label: 'Cancel', value: false),
          CatchDialogAction(label: 'Block', value: true, isDestructive: true),
        ],
      ),
    );
  }
}
