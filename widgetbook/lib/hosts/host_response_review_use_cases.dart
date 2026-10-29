import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:catch_ui/catch_ui.dart';
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
  name: 'Unified response review',
  type: HostFormResponseDetailScreen,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewScreenPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostResponseReviewDetailProvider((
      organizerId: 'org_1',
      responseId: 'response_1',
      applicationId: null,
    )).overrideWith((_) async => responseReviewPreview),
  ],
  child: const HostFormResponseDetailScreen(
    organizerId: 'org_1',
    responseId: 'response_1',
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

@widgetbook.UseCase(
  name: 'Answers and review sections',
  type: HostResponseDetailSection,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewSectionsPreview(BuildContext context) => ProviderScope(
  child: ResponseReviewPreviewFrame(value: responseReviewPreview),
);

class ResponseReviewPreviewFrame extends StatefulWidget {
  const ResponseReviewPreviewFrame({super.key, required this.value});
  final HostResponseReviewDetail value;
  @override
  State<ResponseReviewPreviewFrame> createState() =>
      _ResponseReviewPreviewFrameState();
}

class _ResponseReviewPreviewFrameState
    extends State<ResponseReviewPreviewFrame> {
  final note = TextEditingController();
  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SingleChildScrollView(
      padding: CatchInsets.pageBody,
      child: HostResponseDetailSection(
        value: widget.value,
        organizerId: 'org_1',
        note: note,
        busy: false,
        saving: false,
        onReview: (_, _) async {},
        onOpenPerson: (_) {},
        onConvert: (_, _) async {},
        onOpenAsset: (_) async {},
        onContact: (_) async {},
        onOpenPayment: (_) {},
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Contact targets',
  type: HostResponseContactSection,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewContactsPreview(BuildContext context) => Padding(
  padding: CatchInsets.pageBody,
  child: HostResponseContactSection(
    value: responseReviewPreview,
    onContact: (_) async {},
  ),
);

@widgetbook.UseCase(
  name: 'Borderless acceptance',
  type: HostResponsePrimaryAction,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewPrimaryPreview(BuildContext context) => Scaffold(
  bottomNavigationBar: HostResponsePrimaryAction(
    value: responseReviewPreview,
    busy: false,
    saving: false,
    converting: false,
    onReview: (_, _) async {},
    onOpenPerson: (_) {},
    onConvert: (_, _) async {},
  ),
);

@widgetbook.UseCase(
  name: 'Start review inline',
  type: HostResponseStartReviewAction,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewStartPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostFormResponseCanApplyProvider(
      organizerId: 'org_1',
      responseId: 'response_1',
    ).overrideWith((_) async => true),
  ],
  child: HostResponseStartReviewAction(
    organizerId: 'org_1',
    response: hostFormResponsePreviewDetail,
    busy: false,
    onConvert: (_, _) async {},
  ),
);

@widgetbook.UseCase(
  name: 'Answer with provenance',
  type: HostResponseAnswerRow,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewAnswerPreview(BuildContext context) => const Padding(
  padding: CatchInsets.pageBody,
  child: HostResponseAnswerRow(
    label: 'Which city would you like to attend in?',
    answer: 'Indore',
    origin: 'Shared by respondent',
  ),
);

@widgetbook.UseCase(
  name: 'Submission metadata',
  type: HostResponseMetadataSection,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewMetadataPreview(BuildContext context) =>
    SingleChildScrollView(
      padding: CatchInsets.pageBody,
      child: CatchFieldLanes.single(
        child: HostResponseMetadataSection(
          detail: hostFormResponsePreviewDetail,
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Private review note disclosure',
  type: HostResponseReviewNoteField,
  path: '[P1 product surfaces]/Host operations/Response review',
)
Widget responseReviewNotePreview(BuildContext context) => ProviderScope(
  child: ResponseReviewPreviewFrame(value: responseReviewPreview),
);
