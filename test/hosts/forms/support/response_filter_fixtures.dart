import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';

final responseFilterForms = [
  for (final (id, title) in [
    ('rsvp', 'Sunday run RSVP'),
    ('dinner', 'Community dinner'),
  ])
    HostFormSummary(
      organizerId: 'review',
      formId: id,
      title: title,
      description: null,
      purpose: HostFormPurpose.registration,
      status: HostFormLifecycleStatus.published,
      templateId: null,
      publicFormId: 'public-$id',
      defaultTargetKind: HostFormTargetKind.organizer,
      defaultTargetId: 'review',
      activeVersionId: 'version-$id',
      draftRevision: 1,
      publishedVersion: 1,
      submittedResponseCount: 12,
      consequences: const HostFormConsequences.unavailable(),
      updatedAt: DateTime(2026, 9, 23),
      publishedAt: DateTime(2026, 9, 20),
      lastResponseAt: null,
    ),
];
const responseFilterQuestions = [
  HostFormResponseFilterOption(
    questionId: 'city',
    label: 'Event city',
    options: {'Mumbai': 'Mumbai', 'Delhi': 'Delhi', 'Bengaluru': 'Bengaluru'},
  ),
  HostFormResponseFilterOption(
    questionId: 'diet',
    label: 'Dietary preference',
    options: {
      'vegetarian': 'Vegetarian',
      'vegan': 'Vegan',
      'noPreference': 'No preference',
    },
  ),
];
