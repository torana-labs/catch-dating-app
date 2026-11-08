import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../events/events_test_helpers.dart';

/// The People boards' night: Tuesday 27 October 2026, early evening.
final peopleNow = DateTime(2026, 10, 27, 18, 30);

final peopleOrganizer = HostOperationsFixtures.primaryOrganizer;

final peopleOrganizerScope = HostPeopleOrganizer(
  scope: HostPeopleScope.ready,
  uid: HostOperationsFixtures.hostUid,
  organizer: peopleOrganizer,
);

HostAudienceContact peopleContact(
  String id,
  String name, {
  int nights = 0,
  DateTime? last,
  Set<HostAudienceSegment> segments = const {},
}) => HostAudienceContact(
  contactId: id,
  displayName: name,
  phoneE164: null,
  email: null,
  identityState: HostAudienceIdentityState.verified,
  identityConfidence: 'verified',
  ambiguousCandidateCount: 0,
  attendedEventCount: nights,
  expectedEventCount: nights,
  lastAttendedAt: last,
  segments: segments,
  whatsappStatus: HostAudiencePermissionStatus.optedIn,
  whatsappAdminSuppressed: false,
  smsStatus: HostAudiencePermissionStatus.unknown,
  sourceCoverage: HostAudienceSourceCoverage.exact,
  revision: 1,
);

final peopleContacts = [
  peopleContact(
    'rk',
    'Rhea Kapoor',
    nights: 6,
    last: DateTime(2026, 10, 20),
    segments: {HostAudienceSegment.regular},
  ),
  peopleContact(
    'dp',
    'Dev Patel',
    segments: {HostAudienceSegment.newToOrganizer},
  ),
  peopleContact(
    'as',
    'Aanya Sharma',
    nights: 11,
    last: DateTime(2026, 10, 27),
    segments: {HostAudienceSegment.regular},
  ),
  peopleContact(
    'kr',
    'Kabir Rao',
    nights: 9,
    last: DateTime(2026, 8, 25),
    segments: {HostAudienceSegment.lapsedRegular},
  ),
  peopleContact(
    'tm',
    'Tara Menon',
    segments: {HostAudienceSegment.newToOrganizer},
  ),
  peopleContact('ss', 'Sameer Shah', nights: 4, last: DateTime(2026, 10, 25)),
  peopleContact('nr', 'Nikhil Rao', nights: 1, last: DateTime(2026, 9, 29)),
];

HostPeopleState peopleState({
  HostPeopleFilter filter = HostPeopleFilter.everyone,
  HostPeopleStatus status = HostPeopleStatus.ready,
  List<HostAudienceContact>? people,
  String search = '',
}) => HostPeopleState(
  status: status,
  filter: filter,
  search: search,
  filters: const [
    HostPeopleFilterCount(filter: HostPeopleFilter.everyone, count: 1284),
    HostPeopleFilterCount(filter: HostPeopleFilter.regulars, count: 84),
    HostPeopleFilterCount(filter: HostPeopleFilter.newFaces, count: 148),
    HostPeopleFilterCount(filter: HostPeopleFilter.drifting, count: 37),
  ],
  groups: const [
    HostPeopleGroup(audienceId: 'came-3', name: 'Came 3+ times', count: 84),
    HostPeopleGroup(audienceId: 'trivia', name: 'Trivia regulars', count: 61),
    HostPeopleGroup(audienceId: 'supper', name: 'Supper club', count: 40),
  ],
  people: status == HostPeopleStatus.ready
      ? people ?? peopleContacts
      : const [],
  matchCount: status == HostPeopleStatus.ready ? 1284 : null,
  canLoadMore: status == HostPeopleStatus.ready,
);

HostAudienceEventFact peopleNight(
  String id,
  String title,
  DateTime start, {
  bool came = true,
  String status = 'attended',
}) => HostAudienceEventFact(
  eventId: id,
  displayName: title,
  eventOrigin: HostCustomerEventOrigin.catchNative,
  source: 'attendance',
  status: status,
  checkedIn: came,
  eventStartAt: start,
);

HostAudienceContactDetail peopleDetail({
  List<HostManualTag> tags = const [
    HostManualTag(tagId: 'trivia', label: 'Trivia regular'),
    HostManualTag(tagId: 'friends', label: 'Brings friends'),
    HostManualTag(tagId: 'veg', label: 'Vegetarian'),
  ],
  List<HostAudienceEventFact>? events,
  int nights = 6,
  int missed = 0,
}) => HostAudienceContactDetail(
  organizerId: peopleOrganizer.id,
  contactId: 'rk',
  displayName: 'Rhea Kapoor',
  sourceDisplayName: 'Rhea Kapoor',
  displayNameOverride: null,
  phoneE164: null,
  email: null,
  linkedAccount: true,
  identityState: HostAudienceIdentityState.verified,
  identityConfidence: 'verified',
  ambiguousCandidateCount: 0,
  whatsappAdminSuppressed: false,
  whatsappPermission: const HostCustomerWhatsappPermission(
    status: HostAudiencePermissionStatus.optedIn,
    evidenceStatus: HostCustomerPermissionEvidenceStatus.complete,
    receiptId: null,
    source: null,
    sourceFormId: null,
    sourceFormTitle: null,
    decisionAt: null,
    identityStrength: null,
  ),
  origins: const [],
  originsTruncated: false,
  traits: HostCustomerTraits(
    expectedEventCount: nights + missed,
    attendedEventCount: nights,
    cancelledEventCount: 0,
    noShowCount: missed,
    importedEventCount: 0,
    attendanceRate: 1,
    segments: const {HostAudienceSegment.regular},
    whatsappStatus: HostAudiencePermissionStatus.optedIn,
    sourceCoverage: HostAudienceSourceCoverage.exact,
  ),
  revenue: const HostCustomerRevenue(
    coverage: HostCustomerRevenueCoverage.exact,
    amounts: [HostCustomerRevenueAmount(currency: 'INR', amountMinor: 349400)],
  ),
  events:
      events ??
      [
        peopleNight(
          'e1',
          'Tuesday Trivia',
          DateTime(2026, 10, 27, 19, 30),
          came: false,
          status: 'booked',
        ),
        peopleNight('e2', 'Tuesday Trivia', DateTime(2026, 10, 20, 19, 30)),
        peopleNight('e3', 'Social Run', DateTime(2026, 10, 11, 7)),
        peopleNight('e4', 'Long Table Supper', DateTime(2026, 10, 7, 20)),
        peopleNight('e5', 'Tuesday Trivia', DateTime(2026, 3, 3, 19, 30)),
      ],
  eventsTruncated: false,
  manualTags: tags,
  notes: [
    HostCustomerNote(
      noteId: 'n1',
      body:
          'Loves the food round. Asked whether she could write one of the '
          'rounds in December.',
      authorUid: HostOperationsFixtures.hostUid,
      createdAt: DateTime(2026, 10, 20),
      updatedAt: DateTime(2026, 10, 20),
      revision: 1,
    ),
  ],
  timeline: const [],
  timelineTruncated: false,
  timelineCoverage: const HostCustomerTimelineCoverage(
    forms: HostCustomerTimelineCoverageValue.exact,
    events: HostCustomerTimelineCoverageValue.exact,
    sends: HostCustomerTimelineCoverageValue.exact,
    replies: HostCustomerTimelineCoverageValue.exact,
    outreach: HostCustomerTimelineCoverageValue.exact,
  ),
  revision: 3,
);

HostPersonState personState({HostAudienceContactDetail? detail}) =>
    HostPersonState(
      status: HostPersonStatus.ready,
      detail: detail ?? peopleDetail(),
    );

final messagesThreads = [
  HostMessageThread(
    personId: 'uid:zm',
    name: 'Zoya Merchant',
    preview: 'Can I bring my sister? She’s visiting till Sunday',
    at: DateTime(2026, 10, 27, 19, 12),
    unread: true,
    tonight: true,
    eventId: 'trivia',
  ),
  HostMessageThread(
    personId: 'contact:ib',
    name: 'Ishaan Bose',
    preview: 'Applied to the Sunday run: pace about 6:30',
    at: DateTime(2026, 10, 27, 18, 40),
    unread: true,
  ),
  HostMessageThread(
    personId: 'uid:rk',
    name: 'Rhea Kapoor',
    preview: 'Running 20 late, save me a seat!',
    at: DateTime(2026, 10, 27, 18, 2),
    unread: true,
    tonight: true,
    eventId: 'trivia',
  ),
  HostMessageThread(
    personId: 'uid:as',
    name: 'Aanya Sharma',
    preview: 'Yes, there’s a vegetarian main',
    at: DateTime(2026, 10, 26, 12),
  ),
  HostMessageThread(
    personId: 'uid:tm',
    name: 'Tara Menon',
    preview: 'Is the trivia okay for first timers?',
    at: DateTime(2026, 10, 25, 12),
  ),
];

HostMessagesState messagesState({
  HostMessagesFilter filter = HostMessagesFilter.all,
}) => HostMessagesState(
  status: HostMessagesStatus.ready,
  filter: filter,
  threads: switch (filter) {
    HostMessagesFilter.all => messagesThreads,
    HostMessagesFilter.unread =>
      messagesThreads.where((t) => t.unread).toList(),
    HostMessagesFilter.tonight =>
      messagesThreads.where((t) => t.tonight).toList(),
  },
  unreadCount: 3,
  automationsOn: 6,
  automationsSent: 1204,
);

final composeEvent = buildEvent(
  id: 'trivia',
  organizerId: peopleOrganizer.id,
  name: 'Tuesday Trivia Night',
  startTime: DateTime(2026, 11, 10, 19, 30),
  endTime: DateTime(2026, 11, 10, 22, 30),
  meetingPoint: 'Harbour Room',
  capacityLimit: 30,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
);

final composeState = HostComposeState(
  status: HostComposeStatus.ready,
  events: [composeEvent],
  event: composeEvent,
  booked: 79,
  waitlisted: 5,
);

HostFormAutomationRule peopleRule(
  String id,
  String name,
  HostFormAutomationTrigger trigger, {
  bool enabled = true,
}) => HostFormAutomationRule(
  ruleId: id,
  organizerId: peopleOrganizer.id,
  formId: null,
  name: name,
  enabled: enabled,
  revision: 2,
  trigger: trigger,
  condition: null,
  actions: const [],
  updatedAt: DateTime(2026, 10),
);

final automationsState = HostAutomationsState(
  status: HostAutomationsStatus.ready,
  whatsappOn: true,
  aroundEvents: [
    peopleRule(
      'thanks',
      'Thanks, photos and a rating',
      HostFormAutomationTrigger.eventAttended,
    ),
    peopleRule(
      'welcome-in',
      'You’re in: here’s the plan',
      HostFormAutomationTrigger.applicationAccepted,
    ),
  ],
  keepingPeople: [
    peopleRule(
      'answer',
      'Welcome, here’s what’s on',
      HostFormAutomationTrigger.responseSubmitted,
      enabled: false,
    ),
  ],
  sentThisMonth: 1204,
);

final savedGroupAudience = HostSavedAudience(
  organizerId: peopleOrganizer.id,
  audienceId: 'trivia',
  name: 'Trivia regulars',
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [
      HostSavedAudienceAttendanceCount(
        operator: HostSavedAudienceAttendanceOperator.atLeast,
        eventCount: 3,
      ),
      HostSavedAudienceLastSeenWithinDays(90),
    ],
  ),
  definitionHash: 'hash',
  definitionVersion: 1,
  revision: 4,
  lastPreviewMatchCount: 61,
  lastPreviewAt: DateTime(2026, 10, 20),
  createdAt: DateTime(2026, 9),
  updatedAt: DateTime(2026, 10, 20),
);

final savedGroupState = HostSavedGroupState(
  status: HostSavedGroupStatus.ready,
  audience: savedGroupAudience,
  preview: HostSavedAudiencePreview(
    audience: savedGroupAudience,
    matchCount: 61,
    reachSummary: const HostAudienceReachSummary(
      inCatch: 40,
      automatic: 15,
      byHand: 4,
      unavailable: 2,
    ),
    sample: const [
      HostSavedAudiencePreviewContact(
        contactId: 'as',
        displayName: 'Aanya Sharma',
      ),
      HostSavedAudiencePreviewContact(
        contactId: 'rk',
        displayName: 'Rhea Kapoor',
      ),
      HostSavedAudiencePreviewContact(
        contactId: 'ss',
        displayName: 'Sameer Shah',
      ),
      HostSavedAudiencePreviewContact(
        contactId: 'ir',
        displayName: 'Ishita Rao',
      ),
    ],
    evaluatedAt: DateTime(2026, 10, 27),
  ),
);
