import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

const _secondPhotoUploadingState = PhotoUploadState(
  jobs: {1: ImageUploadJobState(stage: ImageUploadJobStage.uploading)},
);

@widgetbook.UseCase(
  name: 'Photo section states',
  type: ProfilePhotosSection,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profilePhotosSectionStates(BuildContext context) {
  final completeState = SelfProfilePhotoGridState.fromProfile(
    user: widgetbookProfileViewer,
    uploadState: widgetbookProfileIdlePhotoUploadState,
  );
  final loadingState = SelfProfilePhotoGridState.fromProfile(
    user: widgetbookProfileIncompleteViewer,
    uploadState: _secondPhotoUploadingState,
  );

  return WidgetbookProfileProfileCatalog(
    title: 'ProfilePhotosSection',
    contractId: 'screen.profile.edit_tab.photos_section',
    children: [
      WidgetbookProfileStateCard(
        label: 'complete grid',
        child: WidgetbookContentFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: ProfilePhotosSection(
              first: true,
              state: completeState,
              onSlotTapped: (_) {},
              onDeletePhoto: (_) {},
              onReorderPhoto: (_, _) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'upload pending',
        child: WidgetbookContentFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: ProfilePhotosSection(
              first: false,
              state: loadingState,
              onSlotTapped: (_) {},
              onDeletePhoto: (_) {},
              onReorderPhoto: (_, _) {},
            ),
          ),
        ),
      ),
    ],
  );
}
