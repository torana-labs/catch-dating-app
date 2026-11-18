import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// What `getOrganizerProgram` returned, from the programme's
/// `organizerProgramViews` document and the server's rollup [counts]: the
/// view holds the settings, creator and setup lists, never the guest,
/// household, journey and staff counts.
OrganizerProgramDetail organizerProgramDetailFromView(
  Map<Object?, Object?> view,
  Map<String, int> counts,
) => OrganizerProgramDetail.fromCallableData({
  'program': {
    for (final key in const [
      'programId',
      'organizerId',
      'kind',
      'title',
      'timezone',
      'status',
      'startsAtMillis',
      'endsAtMillis',
      'capabilities',
      'transportSettings',
      'revision',
      'branding',
    ])
      key: view[key],
  },
  'functions': view['functions'],
  'pickupPoints': view['pickupPoints'],
  'hotels': view['hotels'],
  'counts': counts,
});

/// The lifecycle summary of one programme row of the organiser's list.
OrganizerProgramSummary organizerProgramSummaryFromView(
  Map<Object?, Object?> view,
) => OrganizerProgramSummary(
  programId: requiredString(view, 'programId'),
  title: requiredString(view, 'title'),
  kind: ProgramKind.values.byName(requiredString(view, 'kind')),
  status: ProgramStatus.values.byName(requiredString(view, 'status')),
  revision: requiredInt(view, 'revision'),
  archivedAt: nullableDateTime(view['archivedAtMillis']),
  anonymizeAt: nullableDateTime(view['anonymizeAtMillis']),
  anonymizedAt: nullableDateTime(view['anonymizedAtMillis']),
);
