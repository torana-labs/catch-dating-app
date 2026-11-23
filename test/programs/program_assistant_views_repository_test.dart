import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_assistant_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int>? duties,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : hour,
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'arrivalRoutes': <String, int>{},
    'tripRoutes': <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  final senderView = <String, Object?>{
    'programId': 'p1',
    'organizerId': 'o1',
    'sender': {
      'connectionId': 'conn-bound',
      'displayPhoneNumber': '+91 98765 00000',
      'verifiedName': 'Aditi & Kabir',
      'status': 'active',
      'boundToProgramme': true,
    },
    'organizerActiveConnectionId': 'conn-first',
    'version': 1,
  };

  final settingsView = <String, Object?>{
    'programId': 'p1',
    'organizerId': 'o1',
    'enabled': true,
    'languages': ['hi', 'en'],
    'replyWithin': 'hour',
    'escalationStaffUids': ['s-later'],
    'neverDoes': ['guesses'],
    'tone': 'warm',
    'dailyTokenBudget': 200000,
    'answerTopics': ['schedule'],
    'attachmentReads': <String>[],
    'revision': 4,
    'usesDefaults': false,
    'staff': [
      {
        'uid': 's-soon',
        'displayName': 'Arjun',
        'expiresAtMillis': ms(const Duration(minutes: 10)),
      },
      {'uid': 's-later', 'displayName': 'Meera', 'expiresAtMillis': hour},
      {
        'uid': 's-gone',
        'displayName': 'Ravi',
        'expiresAtMillis': ms(const Duration(minutes: -1)),
      },
    ],
    'version': 1,
  };

  Future<FakeFirebaseFirestore> seeded(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    await firestore.collection('programSenderViews').doc('p1').set(senderView);
    await firestore
        .collection('programAssistantSettingViews')
        .doc('p1')
        .set(settingsView);
    return firestore;
  }

  ProgramAssistantViewsRepository repository(
    FakeFirebaseFirestore firestore, [
    DateTime? at,
  ]) {
    final clock = AppClock.custom(() => at ?? now);
    return ProgramAssistantViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  test('the communications duty reads the sender, nothing secret', () async {
    final firestore = await seeded(access(duties: {'communications': hour}));
    final view = await repository(firestore).watchSenderView('p1', 'u1').first;
    final sender = programWhatsappSenderFromView(view)!;
    expect(sender.connectionId, 'conn-bound');
    expect(sender.displayPhoneNumber, '+91 98765 00000');
    expect(sender.connected, isTrue);
    expect(sender.boundToProgramme, isTrue);
    // New planned messages keep listOrganizerMoments' choice.
    expect(programMessageSenderFromView(view), 'conn-first');
    expect(programWhatsappSenderFromView(null), isNull);
    expect(programMessageSenderFromView(null), isNull);
  });

  test('a duty without communications is denied the sender', () async {
    final firestore = await seeded(access(duties: {'airportGreeter': hour}));
    await expectLater(
      repository(firestore).watchSenderView('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('the coordinator reads the settings with only live staff', () async {
    final firestore = await seeded(
      access(duties: {'programCoordinator': hour, 'communications': hour}),
    );
    final settings = await repository(
      firestore,
    ).watchSettings('p1', 'u1').first;
    expect(settings.programId, 'p1');
    expect(settings.enabled, isTrue);
    expect(settings.revision, 4);
    expect(settings.usesDefaults, isFalse);
    expect(settings.sender?.connectionId, 'conn-bound');
    expect(settings.staff.map((row) => row.uid), ['s-soon', 's-later']);
    // Twenty minutes on, the soonest grant has ended.
    final later = programAssistantSettingsFromViews(
      settingsView,
      senderView,
      now.add(const Duration(minutes: 20)),
    );
    expect(later.staff.map((row) => row.uid), ['s-later']);
    expect(
      nextAssistantStaffExpiry(settingsView, now)?.millisecondsSinceEpoch,
      ms(const Duration(minutes: 10)),
    );
  });

  test('the communications duty alone is denied the settings', () async {
    final firestore = await seeded(access(duties: {'communications': hour}));
    await expectLater(
      repository(firestore).watchSettings('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('the owner reads both', () async {
    final firestore = await seeded(access(role: 'manager'));
    final directory = repository(firestore);
    expect(await directory.watchSenderView('p1', 'u1').first, isNotNull);
    expect((await directory.watchSettings('p1', 'u1').first).revision, 4);
  });
}
