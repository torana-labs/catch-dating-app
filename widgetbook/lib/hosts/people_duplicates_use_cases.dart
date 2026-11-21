import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_body.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_controller.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_screen.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_dating_app/hosts/people/duplicates/widgets/duplicate_pair_card.dart';
import 'package:catch_dating_app/hosts/people/duplicates/widgets/merge_confirm_sheet.dart';
import 'package:catch_dating_app/hosts/people/parts/people_duplicates_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/People/Possible duplicates';
const _organizerId = 'preview-organizer';

HostContactMergeCandidate _pair(
  String id, {
  bool marked = false,
  bool canReopen = true,
  String first = 'Rhea Kapoor',
  String second = 'Rhea K',
  String? secondPhone = '+919800000001',
  String? secondEmail,
  List<String> matchKinds = const ['sameVerifiedPhone'],
}) => HostContactMergeCandidate.fromMap({
  'candidateId': id,
  'contacts': [
    {
      'contactId': '$id-a',
      'displayName': first,
      'phoneE164': '+919800000001',
      'email': 'rhea@example.com',
      'linkedAccount': true,
      'primarySource': 'catchBooking',
      'revision': 3,
    },
    {
      'contactId': '$id-b',
      'displayName': second,
      'phoneE164': secondPhone,
      'email': secondEmail,
      'linkedAccount': false,
      'primarySource': 'hostImport',
      'revision': 1,
    },
  ],
  'matchKinds': matchKinds,
  'confidence': 'verified',
  'sourceKinds': ['catchBooking', 'hostImport'],
  'sharedEventIds': ['e1', 'e2'],
  'sharedEventCount': 2,
  'updatedAtMillis': 1790000000000,
  'decisionState': marked ? 'differentPeople' : 'none',
  'decisionRevision': marked ? 2 : null,
  'canReopen': marked && canReopen,
});

final _open = [
  _pair('pair-1'),
  _pair(
    'pair-2',
    first: 'Ishaan Mehta',
    second: 'Ishaan M',
    secondPhone: null,
    secondEmail: 'rhea@example.com',
    matchKinds: const ['sameEmail'],
  ),
];

final _marked = [
  _pair('pair-3', marked: true, first: 'Kabir Rao', second: 'Kabir R'),
  _pair(
    'pair-4',
    marked: true,
    canReopen: false,
    first: 'Meera Iyer',
    second: 'Meera I',
  ),
];

HostDuplicatesState _state(HostDuplicatesView view) => HostDuplicatesState(
  status: HostDuplicatesStatus.ready,
  view: view,
  pairs: view == HostDuplicatesView.open ? _open : _marked,
  openCount: _open.length,
  markedCount: _marked.length,
  canLoadMore: view == HostDuplicatesView.open,
);

Widget _phone(Widget child) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: child,
);

Widget _body(HostDuplicatesState state) => _phone(
  CatchRoot(
    child: CatchScreen(
      body: HostPeopleDuplicatesBody(
        state: state,
        onView: (_) {},
        onMerge: (_) {},
        onDifferent: (_) {},
        onReopen: (_) {},
        onLoadMore: () {},
        onRetry: () {},
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Pairs to review',
  type: HostPeopleDuplicatesBody,
  path: _path,
)
Widget duplicatesToReview(BuildContext context) =>
    _body(_state(HostDuplicatesView.open));

@widgetbook.UseCase(
  name: 'Marked different',
  type: HostPeopleDuplicatesBody,
  path: _path,
)
Widget duplicatesMarkedDifferent(BuildContext context) =>
    _body(_state(HostDuplicatesView.markedDifferent));

@widgetbook.UseCase(
  name: 'No possible duplicates',
  type: HostPeopleDuplicatesBody,
  path: _path,
)
Widget duplicatesEmpty(BuildContext context) =>
    _body(const HostDuplicatesState(status: HostDuplicatesStatus.ready));

@widgetbook.UseCase(
  name: 'Review page',
  type: HostPeopleDuplicatesScreen,
  path: _path,
)
Widget duplicatesScreen(BuildContext context) => ProviderScope(
  overrides: [
    for (final view in HostDuplicatesView.values)
      hostDuplicatesControllerProvider(
        _organizerId,
        view,
      ).overrideWithValue(_state(view)),
  ],
  child: _phone(const HostPeopleDuplicatesScreen(organizerId: _organizerId)),
);

@widgetbook.UseCase(
  name: 'Pair to review',
  type: HostDuplicatePairCard,
  path: _path,
)
Widget duplicatePairToReview(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.wideContractWidth,
  child: HostDuplicatePairCard(
    pair: _open.first,
    onMerge: () {},
    onDifferent: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Marked different, someone else decided',
  type: HostDuplicatePairCard,
  path: _path,
)
Widget duplicatePairMarked(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.wideContractWidth,
  child: HostDuplicatePairCard(pair: _marked.last, onReopen: () {}),
);

@widgetbook.UseCase(
  name: 'Keep a record, with differences',
  type: HostMergeConfirmSheet,
  path: _path,
)
Widget mergeConfirmSheet(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.wideContractWidth,
  child: HostMergeConfirmSheet(
    pair: _pair(
      'pair-5',
      first: 'Ishaan Mehta',
      second: 'Ishaan M',
      secondPhone: '+919800000009',
      secondEmail: 'ishaan@example.com',
      matchKinds: const ['sameImportedPhone'],
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Pairs to review',
  type: PeopleDuplicatesRow,
  path: _path,
)
Widget peopleDuplicatesRow(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.standardContractWidth,
  child: PeopleDuplicatesRow(
    summary: const HostPeopleDuplicateSummary(
      openCount: 3,
      markedCount: 1,
      atLeast: false,
    ),
    onTap: () {},
  ),
);
