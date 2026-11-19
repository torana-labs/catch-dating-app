import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_photo_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_photo_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_photo_views.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  final hour = now.add(const Duration(hours: 1)).millisecondsSinceEpoch;

  Map<String, Object?> access(String role, Map<String, int> duties) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : hour,
    'duties': duties,
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

  String photoId(int n) => 'photo_${n.toRadixString(16).padLeft(40, '0')}';
  Map<String, Object?> photo(
    int n, {
    String? function,
    String status = 'visible',
    int? at,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'photoId': photoId(n),
    'functionId': function,
    'storagePath': 'programs/p1/photos/x$n',
    'caption': null,
    'status': status,
    'createdAtMillis': at ?? n,
    'revision': 1,
  };

  group('photos', () {
    ProgramFunction function(String id, String name, int day) =>
        ProgramFunction(
          functionId: id,
          name: name,
          startsAt: DateTime.utc(2026, 11, day),
          endsAt: DateTime.utc(2026, 11, day, 5),
          checkInEnabled: true,
          status: ProgramFunctionStatus.scheduled,
          expectedCount: 0,
          checkedInCount: 0,
        );

    test('albums count visible photos, the album lists newest first', () {
      final rows = [
        photo(1, function: 'f1'),
        photo(2, function: 'f1'),
        photo(3, function: 'f1', status: 'hidden'),
        photo(4, function: 'f2'),
        photo(5),
      ];
      final functions = [
        function('f2', 'Wedding', 22),
        function('f1', 'Sangeet', 20),
      ];
      expect(programPhotoIdsToSign(rows, functions, 'f1').toSet(), {
        photoId(2),
        photoId(4),
        photoId(5),
        photoId(1),
        photoId(3),
      });
      final photos = programPhotosFromViews(
        programId: 'p1',
        functionId: 'f1',
        rows: rows,
        functions: functions,
        urls: {photoId(2): 'https://signed/2', photoId(4): 'https://signed/4'},
        coverUrl: 'https://signed/cover',
      );
      expect(photos.albums.map((a) => a.name), ['Sangeet', 'Wedding', null]);
      expect(photos.albums.map((a) => a.photoCount), [2, 1, 1]);
      expect(photos.albums.first.coverUrl, 'https://signed/2');
      expect(photos.photos.map((p) => p.photoId), [
        photoId(3),
        photoId(2),
        photoId(1),
      ]);
      expect(photos.photos.last.url, isNull);
      expect(photos.photos.first.status, ProgramPhotoStatus.hidden);
      expect(photos.coverUrl, 'https://signed/cover');
    });

    test(
      'a cancelled function has no album, and an album shows at most 60',
      () {
        final rows = [for (var i = 1; i <= 80; i++) photo(i)];
        final cancelled = ProgramFunction(
          functionId: 'f9',
          name: 'Gone',
          startsAt: DateTime.utc(2026, 11, 21),
          endsAt: DateTime.utc(2026, 11, 21, 4),
          checkInEnabled: true,
          status: ProgramFunctionStatus.cancelled,
          expectedCount: 0,
          checkedInCount: 0,
        );
        final photos = programPhotosFromViews(
          programId: 'p1',
          functionId: null,
          rows: rows,
          functions: [cancelled],
          urls: const {},
          coverUrl: null,
        );
        expect(photos.photos, hasLength(programPhotosShown));
        expect(photos.photos.first.photoId, photoId(80));
        expect(photos.albums, hasLength(1));
      },
    );

    test(
      'the communications duty lists the records, others are denied',
      () async {
        for (final (view, ok) in [
          (access('staff', {'communications': hour}), true),
          (access('staff', {'hotelDesk': hour}), false),
          (access('manager', {}), true),
        ]) {
          final firestore = FakeFirebaseFirestore();
          await firestore
              .collection('programAccessViews')
              .doc('p1__u1')
              .set(view);
          for (final row in [photo(1), photo(2)]) {
            await firestore
                .collection('programPhotos')
                .doc('p1_${row['photoId']}')
                .set(row);
          }
          final clock = AppClock.custom(() => now);
          final repository = ProgramPhotoViewsRepository(
            firestore,
            ProgramAccessRepository(firestore, clock),
          );
          final rows = repository.watchRows('p1', 'u1');
          if (ok) {
            expect((await rows.first).map((row) => row['photoId']), [
              photoId(2),
              photoId(1),
            ]);
          } else {
            await expectLater(rows, emitsError(isA<PermissionException>()));
          }
        }
      },
    );
  });

  group('organizer programme views', () {
    Map<String, Object?> view() => {
      'programId': 'p1',
      'organizerId': 'o1',
      'createdBy': 'u1',
      'kind': 'wedding',
      'title': 'Aditi and Rahul',
      'timezone': 'Asia/Kolkata',
      'status': 'active',
      'startsAtMillis': 1000,
      'endsAtMillis': 5000,
      'capabilities': ['arrivalsTransport'],
      'transportSettings': null,
      'branding': null,
      'archivedAtMillis': null,
      'anonymizeAtMillis': null,
      'anonymizedAtMillis': null,
      'revision': 4,
      'functionCount': 1,
      'functions': [
        {
          'functionId': 'f1',
          'name': 'Sangeet',
          'startsAtMillis': 1000,
          'endsAtMillis': 2000,
          'venueName': 'Lawn',
          'status': 'scheduled',
          'invitationMode': 'allGuests',
          'checkInEnabled': true,
          'dressCode': null,
          'instructions': null,
          'revision': 1,
        },
      ],
      'pickupPoints': <Object?>[],
      'hotels': <Object?>[],
      'version': 1,
    };

    test('the detail is the view plus the rolled-up counts', () {
      final detail = organizerProgramDetailFromView(view(), {'guests': 120});
      expect(detail.program.title, 'Aditi and Rahul');
      expect(detail.program.revision, 4);
      expect(detail.functions.single.name, 'Sangeet');
      expect(detail.counts, {'guests': 120});
    });

    test('the organiser lists its programmes, soonest start first', () async {
      final firestore = FakeFirebaseFirestore();
      for (final (id, start, organizer) in [
        ('a', 100, 'o1'),
        ('b', 300, 'o1'),
        ('c', 200, 'o9'),
      ]) {
        await firestore.collection('organizerProgramViews').doc(id).set({
          ...view(),
          'programId': id,
          'organizerId': organizer,
          'startsAtMillis': start,
        });
      }
      final rows = await OrganizerProgramViewsRepository(
        firestore,
      ).watchProgrammes('o1').first;
      expect(rows.map((row) => row['programId']), ['b', 'a']);
      final summary = organizerProgramSummaryFromView(rows.first);
      expect(summary.status, ProgramStatus.active);
      expect(summary.archivedAt, isNull);
    });

    test('an unknown programme is not found', () async {
      await expectLater(
        OrganizerProgramViewsRepository(
          FakeFirebaseFirestore(),
        ).watchProgramme('nope'),
        emitsError(isA<DocumentNotFoundException>()),
      );
    });
  });
}
