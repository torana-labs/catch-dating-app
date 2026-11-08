import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'host_form_workspace_use_cases.dart';

final responseReviewPreview = HostResponseReviewDetail(
  response: hostFormResponsePreviewDetail,
  application: HostApplicationDetail(
    organizerId: 'org_1',
    applicationId: 'application_1',
    formId: 'form_1',
    formVersionId: 'version_1',
    targetKind: 'organizer',
    targetId: 'org_1',
    applicantDisplayName: 'Maya Kapoor',
    reviewStatus: HostApplicationReviewStatus.submitted,
    answers: const [],
    outreach: const HostApplicationOutreach(
      phoneE164: '+919876543210',
      email: 'maya@example.com',
      instagramUrl: 'https://instagram.com/maya.example',
      linkedinUrl: 'https://linkedin.com/in/maya-example',
    ),
    reviewNote: null,
    assignedReviewerUid: null,
    submittedAt: DateTime(2026, 9, 23),
    reviewedAt: null,
    revision: 1,
    sourceResponseId: 'response_1',
  ),
);

@widgetbook.UseCase(
  name: 'Existing application link',
  type: HostApplicationDetailScreen,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewApplicationPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostResponseReviewDetailProvider((
      organizerId: 'org_1',
      responseId: null,
      applicationId: 'application_1',
    )).overrideWith((_) async => responseReviewPreview),
  ],
  child: const HostApplicationDetailScreen(
    organizerId: 'org_1',
    applicationId: 'application_1',
  ),
);
