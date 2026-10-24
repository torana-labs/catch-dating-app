import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/event_success/domain/event_success_defaults.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_draft.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/reviews/domain/review.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';

import '../../clubs/clubs_test_helpers.dart' as club_test;
import '../../events/events_test_helpers.dart' as event_test;
import 'demo_world.dart';

final salesDemoSyntheticFixtures = SalesDemoSyntheticFixtures.load();
final salesDemoHostScenario = SalesDemoHostScenarioFixture.load();

final _ageReferenceDate = DateTime(2026, 5, 31);

// This named capture story reuses the canonical reader and fixture builders.
// It does not change the global host-demo seed world or persona projection.
final hostMarketingIndiaScenario = HostMarketingIndiaScenarioFixture.load();

const hostMarketingIndiaEventId = 'event-host-trivia-store-demo';

/// Which demo world moment each Host capture role shows.
const hostCaptureRoleMoments = <String, String>{
  'hostEventSetup': 'planning',
  'hostToday': 'today',
  'hostLiveConsole': 'live',
  'hostPostEventReport': 'followUp',
};

class HostMarketingIndiaScenarioFixture {
  const HostMarketingIndiaScenarioFixture._(this.scenario, this._narrative);

  factory HostMarketingIndiaScenarioFixture.load({
    String path = 'tool/demo/demo_seed/scenarios/host-marketing-india.json',
  }) {
    final world = DemoWorld.load(path);
    final event = world.event(hostMarketingIndiaEventId);
    final format = _stringMap(event['format'], context: '$path.format');
    final narrative = <String, Object?>{
      'eventName': event['name'],
      'civilDate': event['civilDate'],
      'startTime': event['startTime'],
      'endTime': event['endTime'],
      'timeZone': world.timeZone,
      'currency': world.currency,
      'admissionPreset': format['admissionPreset'],
      'interactionModel': format['interactionModel'],
      'playbookId': format['playbookId'],
      'selectedModuleIds': format['selectedModuleIds'],
      'phaseClocks': world.moments,
      'customActivityLabel': event['customActivityLabel'],
      'hostGoal': format['hostGoal'],
    };
    if (narrative['timeZone'] != 'Asia/Kolkata' ||
        narrative['currency'] != 'INR' ||
        narrative['admissionPreset'] != 'openCapacity' ||
        narrative['interactionModel'] != 'hostLedProgram') {
      throw const FormatException(
        'India marketing captures require the reviewed free/open host-led story.',
      );
    }
    return HostMarketingIndiaScenarioFixture._(
      SalesDemoHostScenarioFixture.fromDemoWorld(
        world,
        eventId: hostMarketingIndiaEventId,
        roleMoments: hostCaptureRoleMoments,
      ),
      Map.unmodifiable(narrative),
    );
  }

  final SalesDemoHostScenarioFixture scenario;
  final Map<String, Object?> _narrative;
  String get eventName => _requiredStringFrom(_narrative, 'eventName');
  String get civilDate => _requiredStringFrom(_narrative, 'civilDate');
  String get timeZone => _requiredStringFrom(_narrative, 'timeZone');

  // Production draft restore consumes local civil fields. Construct those
  // fields in the capture host's local representation rather than converting
  // a UTC epoch into the host timezone. Asia/Kolkata is the story's timezone;
  // these display-only fixtures are never sent to a backend.
  DateTime clock(String phase) => _civilTime(
    _requiredStringFrom(
      _stringMap(_narrative['phaseClocks'], context: 'phaseClocks'),
      phase,
    ),
  );

  static DateTime _civilTime(String value) {
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$').hasMatch(value)) {
      throw FormatException(
        'Capture clocks require explicit civil fields: $value',
      );
    }
    return DateTime.parse(value);
  }

  EventFormatSnapshot get format => EventFormatSnapshot(
    activityKind: scenario.eventByRole('hostEventSetup').activityKind,
    interactionModel: EventInteractionModel.hostLedProgram,
    customActivityLabel: _requiredStringFrom(_narrative, 'customActivityLabel'),
    defaultPlaybookId: _requiredStringFrom(_narrative, 'playbookId'),
  );

  EventSuccessDefaults get guideDefaults =>
      EventSuccessDefaults.recommendedForFormat(
        format,
        enabled: true,
        targetAttendeeCount: scenario
            .eventByRole('hostEventSetup')
            .capacityLimit,
      ).copyWith(
        moduleSelectionConfigured: true,
        selectedModuleIds: _list(
          _narrative['selectedModuleIds'],
        ).whereType<String>().toList(),
        hostGoal: _requiredStringFrom(_narrative, 'hostGoal'),
        compatibilityAffectsRanking: false,
      );

  Club club(SalesDemoSyntheticFixtures fixtures) =>
      fixtures.hostDemoClub(scenario: scenario);

  Event event(SalesDemoSyntheticFixtures fixtures, String role) {
    final clubValue = club(fixtures);
    final source = scenario.eventByRole(role);
    if (source.priceInPaise != 0 || source.waitlistedCount != 0) {
      throw const FormatException(
        'India marketing captures require free registration with no waitlist.',
      );
    }
    return fixtures
        .hostDemoEvent(role: role, club: clubValue, scenario: scenario)
        .copyWith(
          name: eventName,
          synthetic: true,
          currency: _requiredStringFrom(_narrative, 'currency'),
          startTime: _civilTime(
            '$civilDate'
            'T${_requiredStringFrom(_narrative, 'startTime')}:00',
          ),
          endTime: _civilTime(
            '$civilDate'
            'T${_requiredStringFrom(_narrative, 'endTime')}:00',
          ),
          eventFormat: format,
          eventPolicy: EventPolicyBundle.openEvent(
            capacityLimit: source.capacityLimit,
            basePriceInPaise: source.priceInPaise,
          ),
        );
  }

  EventDraft setupDraft(SalesDemoSyntheticFixtures fixtures) {
    final setup = event(fixtures, 'hostEventSetup');
    return fixtures
        .hostSetupDraft(
          id: 'host-marketing-india-setup-draft',
          club: club(fixtures),
          savedAt: clock('planning'),
          eventDate: setup.startTime,
          scenario: scenario,
        )
        .copyWith(
          name: eventName,
          eventLocalDate: civilDate,
          eventLocalStartTime: _requiredStringFrom(_narrative, 'startTime'),
          eventTimezone: timeZone,
          customActivityLabel: _requiredStringFrom(
            _narrative,
            'customActivityLabel',
          ),
          interactionModel: _requiredStringFrom(_narrative, 'interactionModel'),
          minAge: null,
          maxAge: null,
          maxMen: null,
          maxWomen: null,
          inviteCode: null,
          admissionPreset: _requiredStringFrom(_narrative, 'admissionPreset'),
          dynamicPricingEnabled: false,
          dynamicPricingStep: null,
          dynamicPricingMax: null,
          crossPathsPairInventoryEnabled: false,
          crossPathsPairCapacity: null,
          eventSuccessDefaults: guideDefaults,
        );
  }
}

class SalesDemoHostScenarioFixture {
  const SalesDemoHostScenarioFixture._({
    required this.id,
    required this.referenceNow,
    required this.host,
    required this.club,
    required this.eventsByRole,
    required this.rosterPersonaIds,
    required this.defaultCheckedInCount,
    required this.defaultWaitlistedCount,
    required this.viewerPersonaId,
    required this.wingmanTargetPersonaId,
  });

  factory SalesDemoHostScenarioFixture.load({
    String path = 'tool/demo/demo_seed/scenarios/host-demo.json',
  }) {
    final root = _stringMap(
      jsonDecode(File(path).readAsStringSync()),
      context: path,
    );
    final salesDemo = _stringMap(root['salesDemo'], context: '$path.salesDemo');
    final eventSuccess = _stringMap(
      salesDemo['eventSuccess'],
      context: '$path.salesDemo.eventSuccess',
    );
    final events = <String, SalesDemoHostEventFixture>{};
    for (final item in _list(salesDemo['events'])) {
      final event = SalesDemoHostEventFixture._fromJson(
        _stringMap(item, context: '$path.salesDemo.events'),
      );
      events[event.role] = event;
    }
    return SalesDemoHostScenarioFixture._(
      id: _requiredStringFrom(root, 'id'),
      referenceNow: DateTime.parse(
        _requiredStringFrom(salesDemo, 'referenceNow'),
      ),
      host: SalesDemoHostUserFixture._fromJson(
        _stringMap(salesDemo['host'], context: '$path.salesDemo.host'),
      ),
      club: SalesDemoHostClubFixture._fromJson(
        _stringMap(salesDemo['club'], context: '$path.salesDemo.club'),
      ),
      eventsByRole: Map.unmodifiable(events),
      rosterPersonaIds: List.unmodifiable(
        _list(salesDemo['rosterPersonaIds']).whereType<String>(),
      ),
      defaultCheckedInCount: _requiredIntFrom(
        eventSuccess,
        'defaultCheckedInCount',
      ),
      defaultWaitlistedCount: _requiredIntFrom(
        eventSuccess,
        'defaultWaitlistedCount',
      ),
      viewerPersonaId: _requiredStringFrom(eventSuccess, 'viewerPersonaId'),
      wingmanTargetPersonaId: _requiredStringFrom(
        eventSuccess,
        'wingmanTargetPersonaId',
      ),
    );
  }

  /// Builds the per-role events from one demo world event: each role shows
  /// the world's state at its moment, so counts come from guest records.
  factory SalesDemoHostScenarioFixture.fromDemoWorld(
    DemoWorld world, {
    required String eventId,
    required Map<String, String> roleMoments,
  }) {
    final event = world.event(eventId);
    final venue = world.venueFor(eventId);
    final civilDate = _requiredStringFrom(event, 'civilDate');
    final perspective = _stringMap(
      event['guestPerspective'],
      context: '${world.id}.guestPerspective',
    );
    final organizer = world.organizer;
    return SalesDemoHostScenarioFixture._(
      id: world.id,
      referenceNow: DateTime.parse(world.moments[roleMoments.values.first]!),
      host: SalesDemoHostUserFixture._fromJson(world.host),
      club: SalesDemoHostClubFixture._fromJson({
        ...organizer,
        'location': organizer['city'],
      }),
      eventsByRole: Map.unmodifiable({
        for (final MapEntry(key: role, value: moment) in roleMoments.entries)
          role: SalesDemoHostEventFixture._(
            role: role,
            id: eventId,
            activityKind: _activityKindFromName(
              _requiredStringFrom(event, 'activityKind'),
            ),
            startTime: world.civil(
              civilDate,
              _requiredStringFrom(event, 'startTime'),
            ),
            endTime: world.civil(
              civilDate,
              _requiredStringFrom(event, 'endTime'),
            ),
            meetingPoint: _requiredStringFrom(venue, 'name'),
            locationDetails: _requiredStringFrom(venue, 'directions'),
            startingPointLat: _requiredDoubleFrom(venue, 'lat'),
            startingPointLng: _requiredDoubleFrom(venue, 'lng'),
            capacityLimit: _requiredIntFrom(event, 'capacity'),
            bookedCount: world.stateAt(eventId, moment).booked,
            checkedInCount: world.stateAt(eventId, moment).checkedIn,
            waitlistedCount: 0,
            priceInPaise: _requiredIntFrom(event, 'priceInPaise'),
            description: _requiredStringFrom(event, 'description'),
            scorecard: null,
          ),
      }),
      rosterPersonaIds: List.unmodifiable(world.personaIds),
      defaultCheckedInCount: world.stateAt(eventId, 'live').checkedIn,
      defaultWaitlistedCount: 0,
      viewerPersonaId: world.personaIdFor(
        _requiredStringFrom(perspective, 'viewer'),
      ),
      wingmanTargetPersonaId: world.personaIdFor(
        _requiredStringFrom(perspective, 'wingmanTarget'),
      ),
    );
  }

  final String id;
  final DateTime referenceNow;
  final SalesDemoHostUserFixture host;
  final SalesDemoHostClubFixture club;
  final Map<String, SalesDemoHostEventFixture> eventsByRole;
  final List<String> rosterPersonaIds;
  final int defaultCheckedInCount;
  final int defaultWaitlistedCount;
  final String viewerPersonaId;
  final String wingmanTargetPersonaId;

  SalesDemoHostEventFixture eventByRole(String role) {
    final event = eventsByRole[role];
    if (event == null) {
      throw ArgumentError.value(role, 'role', 'Unknown host demo event role.');
    }
    return event;
  }
}

class SalesDemoHostUserFixture {
  const SalesDemoHostUserFixture._({
    required this.uid,
    required this.displayName,
    required this.firstName,
    required this.phoneNumber,
    required this.email,
    required this.personaId,
  });

  factory SalesDemoHostUserFixture._fromJson(Map<String, Object?> json) {
    return SalesDemoHostUserFixture._(
      uid: _requiredStringFrom(json, 'uid'),
      displayName: _requiredStringFrom(json, 'displayName'),
      firstName: _requiredStringFrom(json, 'firstName'),
      phoneNumber: _requiredStringFrom(json, 'phoneNumber'),
      email: _requiredStringFrom(json, 'email'),
      personaId: _requiredStringFrom(json, 'personaId'),
    );
  }

  final String uid;
  final String displayName;
  final String firstName;
  final String phoneNumber;
  final String email;
  final String personaId;
}

class SalesDemoHostClubFixture {
  const SalesDemoHostClubFixture._({
    required this.id,
    required this.name,
    required this.description,
    required this.location,
    required this.area,
    required this.tags,
    required this.memberCount,
    required this.rating,
    required this.reviewCount,
  });

  factory SalesDemoHostClubFixture._fromJson(Map<String, Object?> json) {
    return SalesDemoHostClubFixture._(
      id: _requiredStringFrom(json, 'id'),
      name: _requiredStringFrom(json, 'name'),
      description: _requiredStringFrom(json, 'description'),
      location: _requiredStringFrom(json, 'location'),
      area: _requiredStringFrom(json, 'area'),
      tags: List.unmodifiable(_list(json['tags']).whereType<String>()),
      memberCount: _requiredIntFrom(json, 'memberCount'),
      rating: _requiredDoubleFrom(json, 'rating'),
      reviewCount: _requiredIntFrom(json, 'reviewCount'),
    );
  }

  final String id;
  final String name;
  final String description;
  final String location;
  final String area;
  final List<String> tags;
  final int memberCount;
  final double rating;
  final int reviewCount;
}

class SalesDemoHostEventFixture {
  const SalesDemoHostEventFixture._({
    required this.role,
    required this.id,
    required this.activityKind,
    required this.startTime,
    required this.endTime,
    required this.meetingPoint,
    required this.locationDetails,
    required this.startingPointLat,
    required this.startingPointLng,
    required this.capacityLimit,
    required this.bookedCount,
    required this.checkedInCount,
    required this.waitlistedCount,
    required this.priceInPaise,
    required this.description,
    required this.scorecard,
  });

  factory SalesDemoHostEventFixture._fromJson(Map<String, Object?> json) {
    return SalesDemoHostEventFixture._(
      role: _requiredStringFrom(json, 'role'),
      id: _requiredStringFrom(json, 'id'),
      activityKind: _activityKindFromName(
        _requiredStringFrom(json, 'activityKind'),
      ),
      startTime: DateTime.parse(_requiredStringFrom(json, 'startTime')),
      endTime: DateTime.parse(_requiredStringFrom(json, 'endTime')),
      meetingPoint: _requiredStringFrom(json, 'meetingPoint'),
      locationDetails: _requiredStringFrom(json, 'locationDetails'),
      startingPointLat: _requiredDoubleFrom(json, 'startingPointLat'),
      startingPointLng: _requiredDoubleFrom(json, 'startingPointLng'),
      capacityLimit: _requiredIntFrom(json, 'capacityLimit'),
      bookedCount: _requiredIntFrom(json, 'bookedCount'),
      checkedInCount: _requiredIntFrom(json, 'checkedInCount'),
      waitlistedCount: _requiredIntFrom(json, 'waitlistedCount'),
      priceInPaise: _requiredIntFrom(json, 'priceInPaise'),
      description: _requiredStringFrom(json, 'description'),
      scorecard: json['scorecard'] == null
          ? null
          : SalesDemoHostScorecardFixture._fromJson(
              _stringMap(json['scorecard'], context: 'scorecard'),
            ),
    );
  }

  final String role;
  final String id;
  final ActivityKind activityKind;
  final DateTime startTime;
  final DateTime endTime;
  final String meetingPoint;
  final String locationDetails;
  final double startingPointLat;
  final double startingPointLng;
  final int capacityLimit;
  final int bookedCount;
  final int checkedInCount;
  final int waitlistedCount;
  final int priceInPaise;
  final String description;
  final SalesDemoHostScorecardFixture? scorecard;
}

class SalesDemoHostScorecardFixture {
  const SalesDemoHostScorecardFixture._(this._json);

  factory SalesDemoHostScorecardFixture._fromJson(Map<String, Object?> json) =>
      SalesDemoHostScorecardFixture._(Map.unmodifiable(json));

  final Map<String, Object?> _json;

  int intValue(String key) => _requiredIntFrom(_json, key);

  double doubleValue(String key) => _requiredDoubleFrom(_json, key);

  Map<String, Object?>? mapValue(String key) {
    final value = _json[key];
    if (value == null) return null;
    return _stringMap(value, context: key);
  }
}

class SalesDemoSyntheticFixtures {
  const SalesDemoSyntheticFixtures._(this._personas);

  factory SalesDemoSyntheticFixtures.load({
    String path =
        'tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json',
  }) {
    final decoded = jsonDecode(File(path).readAsStringSync());
    final root = _stringMap(decoded, context: path);
    if (_optionalStringFrom(root, 'kind') !=
        'sales-demo-persona-profile-projection') {
      throw StateError(
        'Expected sales demo persona profile projection in $path.',
      );
    }
    final remotePhotosAvailable = _list(
      root['assetStatuses'],
    ).whereType<String>().contains('uploaded');
    final personas = <String, _SalesDemoPersona>{};
    for (final persona in _list(root['personas'])) {
      final mapped = _SalesDemoPersona(
        _stringMap(persona, context: path),
        remotePhotosAvailable: remotePhotosAvailable,
      );
      personas[mapped.id] = mapped;
    }
    return SalesDemoSyntheticFixtures._(personas);
  }

  final Map<String, _SalesDemoPersona> _personas;

  List<String> get personaIds => List.unmodifiable(_personas.keys);

  PublicProfile publicProfile(String personaId) {
    final persona = _personas[personaId];
    if (persona == null) {
      throw ArgumentError.value(
        personaId,
        'personaId',
        'Unknown sales demo persona id.',
      );
    }
    return persona.toPublicProfile();
  }

  List<PublicProfile> publicProfiles(Iterable<String> personaIds) => [
    for (final personaId in personaIds) publicProfile(personaId),
  ];

  List<PublicProfile> rosterProfiles({
    int? count,
    Iterable<String> skipPersonaIds = const <String>[],
    SalesDemoHostScenarioFixture? scenario,
  }) {
    final resolvedScenario = scenario ?? salesDemoHostScenario;
    final limit = count ?? resolvedScenario.rosterPersonaIds.length;
    final skip = skipPersonaIds.toSet();
    return [
      for (final personaId in resolvedScenario.rosterPersonaIds)
        if (!skip.contains(personaId)) publicProfile(personaId),
    ].take(limit).toList(growable: false);
  }

  Club hostDemoClub({SalesDemoHostScenarioFixture? scenario}) {
    final resolvedScenario = scenario ?? salesDemoHostScenario;
    return captureClub(
      id: resolvedScenario.club.id,
      name: resolvedScenario.club.name,
      description: resolvedScenario.club.description,
      area: resolvedScenario.club.area,
      location: resolvedScenario.club.location,
      hostUserId: resolvedScenario.host.uid,
      hostName: resolvedScenario.host.displayName,
      tags: resolvedScenario.club.tags,
      memberCount: resolvedScenario.club.memberCount,
      rating: resolvedScenario.club.rating,
      reviewCount: resolvedScenario.club.reviewCount,
    );
  }

  Event hostDemoEvent({
    required String role,
    required Club club,
    SalesDemoHostScenarioFixture? scenario,
  }) {
    final event = (scenario ?? salesDemoHostScenario).eventByRole(role);
    return captureEvent(
      id: event.id,
      club: club,
      startTime: event.startTime,
      endTime: event.endTime,
      meetingPoint: event.meetingPoint,
      locationDetails: event.locationDetails,
      startingPointLat: event.startingPointLat,
      startingPointLng: event.startingPointLng,
      activityKind: event.activityKind,
      distanceKm: event.activityKind.isDistanceBased ? 5 : 0,
      bookedCount: event.bookedCount,
      checkedInCount: event.checkedInCount,
      waitlistedCount: event.waitlistedCount,
      capacityLimit: event.capacityLimit,
      priceInPaise: event.priceInPaise,
      description: event.description,
    );
  }

  Club captureClub({
    required String id,
    required String name,
    required String description,
    required String area,
    String location = 'mumbai',
    String hostUserId = 'sales-demo-host',
    String hostName = 'Host',
    List<String> tags = const <String>['social'],
    int memberCount = 72,
    double rating = 4.8,
    int reviewCount = 24,
    DateTime? nextEventAt,
    String? nextEventLabel,
  }) {
    return club_test.buildClub(
      id: id,
      name: name,
      description: description,
      location: location,
      area: area,
      hostUserId: hostUserId,
      hostName: hostName,
      tags: tags,
      memberCount: memberCount,
      rating: rating,
      reviewCount: reviewCount,
      nextEventAt: nextEventAt,
      nextEventLabel: nextEventLabel,
    );
  }

  Event captureEvent({
    required String id,
    required Club club,
    required DateTime startTime,
    DateTime? endTime,
    required String meetingPoint,
    String? locationDetails,
    double startingPointLat = 19.0676,
    double startingPointLng = 72.8227,
    ActivityKind activityKind = ActivityKind.socialRun,
    double distanceKm = 5,
    int bookedCount = 14,
    int checkedInCount = 0,
    int waitlistedCount = 0,
    int capacityLimit = 20,
    int priceInPaise = 0,
    String description = 'A hosted event with a clear social rhythm.',
  }) {
    return event_test.buildEvent(
      id: id,
      clubId: club.id,
      startTime: startTime,
      endTime: endTime,
      meetingPoint: meetingPoint,
      locationDetails: locationDetails,
      startingPointLat: startingPointLat,
      startingPointLng: startingPointLng,
      eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
      distanceKm: distanceKm,
      bookedCount: bookedCount,
      checkedInCount: checkedInCount,
      waitlistedCount: waitlistedCount,
      capacityLimit: capacityLimit,
      priceInPaise: priceInPaise,
      description: description,
      eventPolicy: EventPolicyBundle.balancedSinglesEvent(
        capacityLimit: capacityLimit,
        basePriceInPaise: priceInPaise,
        maxSkew: 2,
      ),
    );
  }

  EventDraft hostSetupDraft({
    required String id,
    required Club club,
    required DateTime savedAt,
    DateTime? eventDate,
    SalesDemoHostScenarioFixture? scenario,
  }) {
    final resolvedScenario = scenario ?? salesDemoHostScenario;
    final setupEvent = resolvedScenario.eventByRole('hostEventSetup');
    final scheduledDate = eventDate ?? setupEvent.startTime;
    return EventDraft(
      id: id,
      clubId: club.id,
      savedAt: savedAt,
      name: '${resolvedScenario.club.name} ${setupEvent.activityKind.label}',
      activityKind: setupEvent.activityKind.name,
      capacity: setupEvent.capacityLimit.toString(),
      price: (setupEvent.priceInPaise ~/ 100).toString(),
      description: setupEvent.description,
      meetingPoint: setupEvent.meetingPoint,
      locationDetails: setupEvent.locationDetails,
      meetingLocationAddress:
          '${resolvedScenario.club.area}, ${resolvedScenario.club.location}',
      meetingLocationPlaceId: 'capture-${setupEvent.id}',
      startingPointLat: setupEvent.startingPointLat,
      startingPointLng: setupEvent.startingPointLng,
      selectedDateMillis: scheduledDate.millisecondsSinceEpoch,
      selectedStartHour: scheduledDate.hour,
      selectedStartMinute: scheduledDate.minute,
      durationMinutes: setupEvent.endTime
          .difference(setupEvent.startTime)
          .inMinutes,
      minAge: '24',
      maxAge: '34',
      admissionPreset: 'balancedSingles',
      dynamicPricingEnabled: true,
      dynamicPricingStep: '200',
      dynamicPricingMax: '1800',
    );
  }

  List<EventParticipation> participationsForProfiles({
    required Event event,
    required Iterable<PublicProfile> profiles,
    int attendedCount = 0,
    int waitlistedCount = 0,
    DateTime? createdAt,
  }) {
    final profileList = profiles.toList(growable: false);
    final firstCreatedAt = createdAt ?? DateTime(2026, 5, 28, 10);
    return [
      for (final indexed in profileList.indexed)
        event_test.buildEventParticipation(
          event: event,
          uid: indexed.$2.uid,
          status: _participationStatusForIndex(
            indexed.$1,
            totalCount: profileList.length,
            attendedCount: attendedCount,
            waitlistedCount: waitlistedCount,
          ),
          createdAt: firstCreatedAt.add(Duration(minutes: indexed.$1 * 7)),
          genderAtSignup: indexed.$2.gender,
        ),
    ];
  }

  List<Review> reviewsForProfiles({
    required Club club,
    required Event event,
    required Iterable<PublicProfile> reviewers,
    DateTime? firstCreatedAt,
  }) {
    final comments = const <String>[
      'Clear route, thoughtful host, and an easy coffee plan after.',
      'The prompts made it simple to meet people without forcing it.',
      'Well-paced, warm, and everyone knew where to be.',
    ];
    final createdAt = firstCreatedAt ?? DateTime(2026, 5, 25);
    return [
      for (final indexed in reviewers.indexed)
        Review(
          id: 'review-${event.id}-${indexed.$1 + 1}',
          organizerId: club.id,
          eventId: event.id,
          reviewerUserId: indexed.$2.uid,
          reviewerName: _firstName(indexed.$2.name),
          rating: 5,
          comment: comments[indexed.$1 % comments.length],
          createdAt: createdAt.subtract(Duration(days: indexed.$1 * 3)),
        ),
    ];
  }

  List<Review> reviewsByViewer({
    required Iterable<Event> events,
    required String reviewerUserId,
    required String reviewerName,
    DateTime? firstCreatedAt,
  }) {
    final comments = const <String>[
      'Clear route, thoughtful host, and an easy coffee plan after.',
      'The table prompts made the room feel warm without being forced.',
      'Good pacing, useful updates, and I met people I would actually see again.',
    ];
    final eventList = events.toList(growable: false);
    final createdAt = firstCreatedAt ?? DateTime(2026, 5, 25);
    return [
      for (final indexed in eventList.indexed)
        Review(
          id: 'review-${indexed.$2.id}',
          organizerId: indexed.$2.clubId,
          eventId: indexed.$2.id,
          reviewerUserId: reviewerUserId,
          reviewerName: reviewerName,
          rating: 5,
          comment: comments[indexed.$1 % comments.length],
          createdAt: createdAt.subtract(Duration(days: indexed.$1 * 5)),
        ),
    ];
  }
}

EventParticipationStatus _participationStatusForIndex(
  int index, {
  required int totalCount,
  required int attendedCount,
  required int waitlistedCount,
}) {
  if (index >= totalCount - waitlistedCount) {
    return EventParticipationStatus.waitlisted;
  }
  if (index < attendedCount) return EventParticipationStatus.attended;
  return EventParticipationStatus.signedUp;
}

String _firstName(String name) => name.trim().split(RegExp(r'\s+')).first;

class _SalesDemoPersona {
  const _SalesDemoPersona(this._json, {required this.remotePhotosAvailable});

  final Map<String, Object?> _json;
  final bool remotePhotosAvailable;

  String get id => _requiredString('id');

  PublicProfile toPublicProfile() {
    return PublicProfile(
      uid: id,
      name: _requiredString('displayName'),
      age: _ageFromBirthDate(_requiredString('dateOfBirth')),
      gender: _genderFromCatalog(_requiredString('gender')),
      profilePrompts: _profilePrompts(),
      profilePhotos: _profilePhotos(),
      city: _optionalString('cityLabel'),
      height: _optionalInt('heightCm'),
      occupation: _optionalString('occupation'),
      company: _optionalString('company'),
    );
  }

  List<ProfilePromptAnswer> _profilePrompts() {
    return normalizeProfilePromptAnswers(
      _list(_json['profilePrompts']).map((item) {
        final prompt = _stringMap(item, context: id);
        final definition = profilePromptDefinition(
          _requiredStringFrom(prompt, 'promptId'),
        );
        return profilePromptAnswerFor(
          definition: definition,
          answer: _requiredStringFrom(prompt, 'answer'),
        );
      }),
    );
  }

  List<ProfilePhoto> _profilePhotos() {
    if (!remotePhotosAvailable) return const <ProfilePhoto>[];
    final photos = <ProfilePhoto>[];
    for (final item in _list(_json['profilePhotos'])) {
      final photo = _stringMap(item, context: id);
      final position = _optionalIntFrom(photo, 'position') ?? photos.length;
      photos.add(
        ProfilePhoto(
          id: _requiredStringFrom(photo, 'id'),
          url: _requiredStringFrom(photo, 'url'),
          thumbnailUrl: _requiredStringFrom(photo, 'thumbnailUrl'),
          storagePath: _requiredStringFrom(photo, 'storagePath'),
          thumbnailStoragePath: _requiredStringFrom(
            photo,
            'thumbnailStoragePath',
          ),
          position: position,
          createdAt: _ageReferenceDate,
          updatedAt: _ageReferenceDate,
          prompt: _photoPrompt(photo, position),
          moderation: const ProfilePhotoModeration(status: 'approved'),
        ),
      );
    }
    return normalizeProfilePhotos(photos);
  }

  PhotoPromptAnswer? _photoPrompt(Map<String, Object?> photo, int position) {
    final promptId = _optionalStringFrom(photo, 'promptId');
    if (promptId == null) return null;
    return photoPromptAnswerFor(
      photoIndex: position,
      definition: photoPromptDefinition(promptId),
    );
  }

  String _requiredString(String key) => _requiredStringFrom(_json, key);

  String? _optionalString(String key) => _optionalStringFrom(_json, key);

  int? _optionalInt(String key) => _optionalIntFrom(_json, key);
}

int _ageFromBirthDate(String value) {
  final birthDate = DateTime.parse(value);
  var age = _ageReferenceDate.year - birthDate.year;
  final birthdayThisYear = DateTime(
    _ageReferenceDate.year,
    birthDate.month,
    birthDate.day,
  );
  if (_ageReferenceDate.isBefore(birthdayThisYear)) age -= 1;
  return age;
}

Gender _genderFromCatalog(String value) {
  return Gender.values.firstWhere(
    (gender) => gender.name == value,
    orElse: () => Gender.other,
  );
}

String _requiredStringFrom(Map<String, Object?> json, String key) {
  final value = _optionalStringFrom(json, key);
  if (value == null) {
    throw StateError('Missing required string "$key".');
  }
  return value;
}

String? _optionalStringFrom(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

int? _optionalIntFrom(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is num) return value.round();
  return null;
}

int _requiredIntFrom(Map<String, Object?> json, String key) {
  final value = _optionalIntFrom(json, key);
  if (value == null) {
    throw StateError('Missing required int "$key".');
  }
  return value;
}

double _requiredDoubleFrom(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  throw StateError('Missing required number "$key".');
}

ActivityKind _activityKindFromName(String value) {
  return ActivityKind.values.firstWhere(
    (kind) => kind.name == value,
    orElse: () => throw StateError('Unknown activity kind "$value".'),
  );
}

Map<String, Object?> _stringMap(Object? value, {required String context}) {
  if (value is Map) {
    return value.map((key, child) => MapEntry(key.toString(), child));
  }
  throw StateError('Expected object in $context.');
}

List<Object?> _list(Object? value) {
  if (value is List) return value;
  return const <Object?>[];
}
