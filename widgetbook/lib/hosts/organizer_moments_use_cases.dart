import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_entry_field.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../clubs/catalog/fixtures.dart';
import '../support/page_preview.dart';
import '../utility/preview.dart';

const _scope = OrganizerMomentScope.event('preview_event');

OrganizerMoment _moment(Map<Object?, Object?> overrides) =>
    OrganizerMoment.fromCallableData({
      'momentId': 'moment_1',
      'scope': {'kind': 'event', 'eventId': 'preview_event'},
      'name': 'Welcome note',
      'initiation': {'kind': 'manual'},
      'sense': 'audience',
      'audience': {
        'kind': 'eventParticipants',
        'statuses': ['signedUp'],
      },
      'action': {
        'kind': 'push',
        'notificationType': 'moment',
        'preferenceKey': 'moments',
      },
      'status': 'draft',
      'origin': 'organizer',
      'revision': 1,
      ...overrides,
    });

final _moments = <OrganizerMoment>[
  _moment({
    'name': 'Airport pickup nudge',
    'status': 'armed',
    'initiation': {'kind': 'scheduled', 'atMillis': 1800000000000},
    'approval': {
      'approvedByUid': 'preview_host',
      'approvedAtMillis': 1799000000000,
    },
    'revision': 2,
  }),
  _moment({
    'momentId': 'moment_2',
    'name': 'Welcome note',
    'status': 'draft',
    'initiation': {'kind': 'manual'},
  }),
  _moment({
    'momentId': 'moment_3',
    'name': 'Ceremony heads-up',
    'status': 'paused',
    'initiation': {
      'kind': 'anchored',
      'anchorKind': 'scopeStart',
      'offsetMinutes': -60,
    },
  }),
];

class _PreviewMoments extends OrganizerMomentsController {
  _PreviewMoments(this._state);

  final OrganizerMomentsState _state;

  @override
  Future<OrganizerMomentsState> build(OrganizerMomentScope scope) async =>
      _state;
}

List<Override> _momentsOverrides(OrganizerMomentsState state) => [
  organizerMomentsControllerProvider(
    _scope,
  ).overrideWith(() => _PreviewMoments(state)),
];

@widgetbook.UseCase(
  name: 'Entry field',
  type: OrganizerMomentsEntryField,
  path: '[P1 product surfaces]/Host events/Moments',
)
Widget organizerMomentsEntryField(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrganizerMomentsEntryField',
    contractId: 'screen.host.event.moments',
    children: [
      WidgetbookPageStateCard(
        label: 'manage entry',
        child: WidgetbookUtilityDeviceFrame(
          child: OrganizerMomentsEntryField(
            clubId: widgetbookClubClub.id,
            event: widgetbookClubEvent(
              id: 'preview_event',
              startTime: DateTime(2026, 10, 3, 18),
              meetingPoint: 'Marine Drive',
              distanceKm: 5,
              bookedCount: 24,
              capacityLimit: 40,
              description: 'Preview celebration',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: OrganizerMomentsScreen,
  path: '[P1 product surfaces]/Host events/Moments',
)
Widget organizerMomentsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrganizerMomentsScreen',
    contractId: 'screen.host.event.moments',
    children: [
      WidgetbookPageStateCard(
        label: 'populated list',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _momentsOverrides(
              OrganizerMomentsState(moments: _moments),
            ),
            child: const OrganizerMomentsScreen(
              scope: _scope,
              scopeTitle: 'Preview celebration',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _momentsOverrides(
              const OrganizerMomentsState(moments: []),
            ),
            child: const OrganizerMomentsScreen(scope: _scope),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: OrganizerMomentEditScreen,
  path: '[P1 product surfaces]/Host events/Moments',
)
Widget organizerMomentEditScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrganizerMomentEditScreen',
    contractId: 'screen.host.event.moments',
    children: [
      WidgetbookPageStateCard(
        label: 'new moment',
        child: WidgetbookUtilityDeviceFrame(
          child: OrganizerMomentEditScreen(
            scope: _scope,
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'revise armed moment',
        child: WidgetbookUtilityDeviceFrame(
          child: OrganizerMomentEditScreen(
            scope: _scope,
            initialMoment: _moments.first,
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
    ],
  );
}
