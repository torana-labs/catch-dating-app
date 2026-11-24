import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// The organiser's programme rows the account's own access [views] list at
/// [now] ([ProgramAccessView.listsSetup]): the programmes it created and,
/// while it manages the organiser, every one. Offline a row stops showing
/// when the cached view stops listing it; a row with no view never shows.
List<Map<Object?, Object?>> organizerProgramRowsListed(
  List<Map<Object?, Object?>> rows,
  List<ProgramAccessView> views,
  DateTime now,
) {
  final listed = {
    for (final view in views)
      if (view.listsSetup(now)) view.programId,
  };
  return [
    for (final row in rows)
      if (listed.contains(row['programId'])) row,
  ];
}

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

/// One row of the organiser's programme list from its
/// `organizerProgramViews` document, as `listOrganizerPrograms` returned it:
/// the counts the server keeps on the view, the replied share derived from
/// them (to three decimals, absent with no guests), and archive authority
/// for the programme's creator, [uid], by its status. A view not counted yet
/// has no counts, which the row shows as unknown rather than zero.
OrganizerProgramListRow organizerProgramListRowFromView(
  Map<Object?, Object?> view,
  String uid,
) {
  final guests = view['guestCount'];
  final replied = view['repliedGuestCount'];
  final ownsIt = view['createdBy'] == uid;
  final archived = view['status'] == 'archived';
  return OrganizerProgramListRow.fromMap({
    ...view,
    'canArchive': ownsIt && !archived,
    'canUnarchive': ownsIt && archived,
    'repliedShare': guests is num && guests > 0 && replied is num
        ? (replied / guests * 1000).round() / 1000
        : null,
  });
}
