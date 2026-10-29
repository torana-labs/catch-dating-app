import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_service.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import '../events/events_test_helpers.dart';

part 'host_create_event_photo_recovery_tests.dart';

class FakeRunImageUploadRepository extends Fake
    implements ImageUploadRepository {
  String uploadResult = 'https://img.example/events/generated-7.jpg';
  String? uploadedEventId;
  int? uploadedPosition;
  XFile? uploadedImage;
  final uploadedPositions = <int>[];
  final uploadedImages = <XFile>[];
  final deletedPaths = <String>[];
  final mediaIds = <String>[];
  List<XFile> pickedImages = [];
  Future<void> Function()? beforeUpload;
  bool failCleanup = false;

  /// When set, the upload at this position throws to simulate a mid-upload
  /// failure so the controller's compensation can be exercised.
  int? failOnPosition;

  @override
  Future<UploadedImage> uploadEventPhotoForRecovery({
    required String eventId,
    required int position,
    required XFile image,
    required String mediaId,
  }) async {
    await beforeUpload?.call();
    if (failOnPosition == position) {
      throw Exception('upload failed at $position');
    }
    mediaIds.add(mediaId);
    uploadedEventId = eventId;
    uploadedPosition = position;
    uploadedImage = image;
    uploadedPositions.add(position);
    uploadedImages.add(image);
    final resolvedMediaId = mediaId;
    return UploadedImage(
      url: uploadResult,
      storagePath: _storagePathFor(eventId, resolvedMediaId),
    );
  }

  @override
  Future<void> deleteByPathChecked(String storagePath) async {
    deletedPaths.add(storagePath);
    if (failCleanup) throw StateError('cleanup unavailable');
  }

  @override
  Future<List<XFile>> pickImages({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
    int? limit,
  }) async => pickedImages;

  String _storagePathFor(String eventId, String mediaId) =>
      'events/$eventId/media/$mediaId/original.jpg';

  String get uploadedStoragePath => _storagePathFor(
    uploadedEventId ?? 'generated-7',
    mediaIds.isEmpty ? 'not-uploaded' : mediaIds.last,
  );
}

void main() {
  group('CreateEventController.submit', () {
    test(
      'creates an event with a generated id and normalized fields',
      () async {
        final fakeEventRepository = FakeEventRepository()
          ..mediaActorUid = 'host-1'
          ..generatedId = 'generated-7';
        final fakeImageUploadRepository = FakeRunImageUploadRepository();
        final photo = XFile('selected-event-photo.jpg');
        final container = ProviderContainer(
          overrides: [
            commandJournalStorageProvider.overrideWith((ref) {
              final storage = MemoryCommandJournalStorage();
              return () async => storage;
            }),
            uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
            eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
            imageUploadRepositoryProvider.overrideWith(
              (ref) => fakeImageUploadRepository,
            ),
          ],
        );
        addTearDown(container.dispose);
        final uidSubscription = container.listen(
          uidProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(uidSubscription.close);
        await container.pump();

        final submittedEvent = await container
            .read(createEventControllerProvider.notifier)
            .submit(
              name: 'Test event',
              clubId: '  club-7  ',
              startTime: DateTime(2025, 3, 1, 6),
              endTime: DateTime(2025, 3, 1, 7, 15),
              meetingLocation: _meetingLocation(name: '  Marine Drive  '),
              sourceVenueId: 'venue-7',
              eventFormat: const EventFormatSnapshot.socialRun(),
              distanceKm: 7.5,
              pace: PaceLevel.moderate,
              description: '  Steady social event  ',
              currency: defaultCurrencyCode,
              constraints: const EventConstraints(
                minAge: 21,
                maxAge: 35,
                maxMen: 9,
                maxWomen: 9,
              ),
              eventPolicy: EventPolicyBundle.fixedCohortCapsEvent(
                capacityLimit: 18,
                basePriceInPaise: 25000,
                maxMenInterestedInWomen: 9,
                maxWomenInterestedInMen: 9,
              ),
              photoImage: photo,
            );

        final createdEvent = fakeEventRepository.createdEvent;
        expect(createdEvent, isNotNull);
        expect(createdEvent!.id, 'generated-7');
        expect(createdEvent.name, 'Test event');
        expect(fakeImageUploadRepository.uploadedEventId, 'generated-7');
        expect(fakeImageUploadRepository.uploadedPosition, 0);
        expect(fakeImageUploadRepository.uploadedImage, photo);
        expect(createdEvent.clubId, 'club-7');
        expect(createdEvent.startTime, DateTime(2025, 3, 1, 6));
        expect(createdEvent.endTime, DateTime(2025, 3, 1, 7, 15));
        expect(createdEvent.meetingPoint, 'Marine Drive');
        expect(createdEvent.meetingLocation?.name, 'Marine Drive');
        expect(createdEvent.sourceVenueId, 'venue-7');
        expect(createdEvent.startingPointLat, 19.076);
        expect(createdEvent.startingPointLng, 72.8777);
        expect(createdEvent.locationDetails, isNull);
        expect(createdEvent.photoUrl, isNull);
        expect(createdEvent.distanceKm, 7.5);
        expect(createdEvent.pace, PaceLevel.moderate);
        expect(createdEvent.capacityLimit, 18);
        expect(createdEvent.description, 'Steady social event');
        expect(createdEvent.priceInPaise, 25000);
        expect(createdEvent.eventPolicy, isNotNull);
        expect(
          createdEvent.constraints,
          const EventConstraints(
            minAge: 21,
            maxAge: 35,
            maxMen: 9,
            maxWomen: 9,
          ),
        );
        expect(createdEvent.eventFormat, const EventFormatSnapshot.socialRun());
        final updatedEvent = fakeEventRepository.updatedEvent;
        expect(updatedEvent, isNotNull);
        expect(updatedEvent!.photoUrl, fakeImageUploadRepository.uploadResult);
        expect(updatedEvent.eventPhotos, hasLength(1));
        expect(
          updatedEvent.eventPhotos.single.storagePath,
          fakeImageUploadRepository.uploadedStoragePath,
        );
        expect(submittedEvent.photoUrl, fakeImageUploadRepository.uploadResult);
      },
    );

    test('uploads multiple event photos in the submitted order', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1'
        ..generatedId = 'generated-9';
      final fakeImageUploadRepository = FakeRunImageUploadRepository();
      final photos = [XFile('event-a.jpg'), XFile('event-b.jpg')];
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      final submittedEvent = await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-7',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Morning run',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
            photoImages: photos,
          );

      expect(fakeImageUploadRepository.uploadedPositions, [0, 1]);
      expect(fakeImageUploadRepository.uploadedImages, photos);
      expect(submittedEvent.eventPhotos, hasLength(2));
      expect(submittedEvent.eventPhotos.map((photo) => photo.position), [0, 1]);
      expect(submittedEvent.eventPhotos.map((photo) => photo.storagePath), [
        for (final id in fakeImageUploadRepository.mediaIds)
          'events/generated-9/media/$id/original.jpg',
      ]);
      expect(submittedEvent.photoUrl, submittedEvent.eventPhotos.first.url);
    });

    test('retains the committed event when a later upload fails', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1'
        ..generatedId = 'generated-9';
      final fakeImageUploadRepository = FakeRunImageUploadRepository()
        ..failOnPosition = 1;
      final photos = [XFile('event-a.jpg'), XFile('event-b.jpg')];
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      final saved = await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-7',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Morning run',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
            photoImages: photos,
          );

      // The first photo uploaded before the failure must be cleaned up so it
      // doesn't orphan in Storage; the event doc was never attached photos.
      expect(saved.id, 'generated-9');
      final recovery = container.read(
        createEventPhotoRecoveryControllerProvider('club-7'),
      );
      expect(recovery.event!.id, saved.id);
      expect(recovery.receipt!.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(fakeImageUploadRepository.deletedPaths, [
        for (final id in recovery.receipt!.mediaIds)
          'events/generated-9/media/$id/original.jpg',
      ]);
      expect(fakeEventRepository.updatedEvent, isNull);
    });

    test('sends enabled event-success defaults through createEvent', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1';
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 18),
            endTime: DateTime(2025, 3, 1, 20),
            meetingLocation: _meetingLocation(name: 'Dinner table'),
            eventFormat: EventFormatSnapshot.fromActivityKind(
              ActivityKind.dinner,
            ),
            distanceKm: 0,
            pace: PaceLevel.easy,
            description: 'Dinner',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
            eventSuccessDefaults: EventSuccessDefaults.recommendedForActivity(
              ActivityKind.dinner,
              enabled: true,
              targetAttendeeCount: 12,
            ),
          );

      final defaults = fakeEventRepository.createdEventSuccessDefaults
          ?.toJson();
      expect(defaults, isNotNull);
      expect(defaults!['enabled'], true);
      expect(defaults['playbookId'], 'dinner_table_mixer');
      expect(defaults['selectedModuleIds'], contains('qr_check_in'));
    });

    test('creates an external companion with runtime provenance', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1';
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2026, 8, 20, 18),
            endTime: DateTime(2026, 8, 20, 20),
            meetingLocation: _meetingLocation(name: 'Outside venue'),
            eventFormat: EventFormatSnapshot.fromActivityKind(
              ActivityKind.dinner,
            ),
            distanceKm: 0,
            pace: PaceLevel.easy,
            description: 'Externally booked dinner',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
            eventSuccessDefaults: EventSuccessDefaults.recommendedForActivity(
              ActivityKind.dinner,
              enabled: true,
              targetAttendeeCount: 12,
            ),
            externalOrigin: const ExternalEventOriginInput(
              provider: ExternalBookingProvider.luma,
              externalEventId: 'luma-123',
              externalEventUrl: 'https://lu.ma/luma-123',
              adapterVersion: 'luma-v1',
            ),
            runtimeWalkInPolicy: EventRuntimeWalkInPolicy.hostApproval,
          );

      expect(fakeEventRepository.createdEvent?.isExternalCompanion, isTrue);
      expect(
        fakeEventRepository.createdExternalOrigin?.provider,
        ExternalBookingProvider.luma,
      );
      expect(
        fakeEventRepository.createdRuntimeWalkInPolicy,
        EventRuntimeWalkInPolicy.hostApproval,
      );
    });

    test(
      'uses event capacity when normalizing pub quiz team defaults',
      () async {
        final fakeEventRepository = FakeEventRepository()
          ..mediaActorUid = 'host-1';
        final container = ProviderContainer(
          overrides: [
            commandJournalStorageProvider.overrideWith((ref) {
              final storage = MemoryCommandJournalStorage();
              return () async => storage;
            }),
            uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
            eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          ],
        );
        addTearDown(container.dispose);

        await container
            .read(createEventControllerProvider.notifier)
            .submit(
              name: 'Test event',
              clubId: 'club-1',
              startTime: DateTime(2025, 3, 1, 18),
              endTime: DateTime(2025, 3, 1, 20),
              meetingLocation: _meetingLocation(name: 'Quiz venue'),
              eventFormat: EventFormatSnapshot.fromActivityKind(
                ActivityKind.pubQuiz,
              ),
              distanceKm: 0,
              pace: PaceLevel.easy,
              description: 'Trivia night',
              currency: defaultCurrencyCode,
              constraints: const EventConstraints(),
              eventPolicy: _eventPolicy(capacityLimit: 50),
              eventSuccessDefaults: EventSuccessDefaults.recommendedForActivity(
                ActivityKind.pubQuiz,
                enabled: true,
                targetAttendeeCount: 50,
              ),
            );

        final defaults = fakeEventRepository.createdEventSuccessDefaults
            ?.toJson();
        final structure = defaults?['structureConfig'] as Map<String, Object?>?;
        expect(defaults, isNotNull);
        expect(defaults!['playbookId'], 'pub_quiz_team_mixer');
        expect(structure?['unitKind'], 'teams');
        expect(structure?['unitSize'], 5);
        expect(structure?['unitCount'], isNull);
      },
    );

    test('allows zero distance for non-distance event formats', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1';
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 18),
            endTime: DateTime(2025, 3, 1, 20),
            meetingLocation: _meetingLocation(name: 'Dinner table'),
            eventFormat: EventFormatSnapshot.fromActivityKind(
              ActivityKind.dinner,
            ),
            distanceKm: 0,
            pace: PaceLevel.easy,
            description: 'Dinner',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          );

      expect(fakeEventRepository.createdEvent!.distanceKm, 0);
      expect(
        fakeEventRepository.createdEvent!.eventFormat.activityKind,
        ActivityKind.dinner,
      );
    });

    test('passes invite codes for invite-only events', () async {
      final fakeEventRepository = FakeEventRepository()
        ..mediaActorUid = 'host-1';
      final container = ProviderContainer(
        overrides: [
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(createEventControllerProvider.notifier)
          .submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 18),
            endTime: DateTime(2025, 3, 1, 20),
            meetingLocation: _meetingLocation(name: 'Private route'),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Invite-only evening event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: EventPolicyBundle.inviteOnlyEvent(
              capacityLimit: 12,
              basePriceInPaise: 0,
              inviteCodeHint: 'CA...HI',
            ),
            inviteCode: ' CATCH-DELHI ',
          );

      expect(fakeEventRepository.createdEvent, isNotNull);
      expect(
        fakeEventRepository.createdEvent!.eventPolicy!.usesInviteOnly,
        isTrue,
      );
      expect(fakeEventRepository.createdEventInviteCode, 'CATCH-DELHI');
    });

    test(
      'rejects invalid create-event inputs before touching the repository',
      () async {
        final fakeEventRepository = FakeEventRepository()
          ..mediaActorUid = 'host-1';
        final container = ProviderContainer(
          overrides: [
            commandJournalStorageProvider.overrideWith((ref) {
              final storage = MemoryCommandJournalStorage();
              return () async => storage;
            }),
            uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
            eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          ],
        );
        addTearDown(container.dispose);

        final controller = container.read(
          createEventControllerProvider.notifier,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: '',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsA(isA<ValidationException>()),
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(latitude: 91),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 6),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(name: '   '),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsA(isA<ValidationException>()),
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 0,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(capacityLimit: 0),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(basePriceInPaise: -1),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(longitude: 181),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: _eventPolicy(),
          ),
          throwsArgumentError,
        );

        await expectLater(
          () => controller.submit(
            name: 'Test event',
            clubId: 'club-1',
            startTime: DateTime(2025, 3, 1, 6),
            endTime: DateTime(2025, 3, 1, 7),
            meetingLocation: _meetingLocation(),
            eventFormat: const EventFormatSnapshot.socialRun(),
            distanceKm: 5,
            pace: PaceLevel.easy,
            description: 'Event',
            currency: defaultCurrencyCode,
            constraints: const EventConstraints(),
            eventPolicy: EventPolicyBundle.inviteOnlyEvent(
              capacityLimit: 10,
              basePriceInPaise: 0,
            ),
            inviteCode: 'abc',
          ),
          throwsArgumentError,
        );

        expect(fakeEventRepository.createdEvent, isNull);
      },
    );
  });
  runCreateEventPhotoRecoveryIntegrationTests();
}

EventPolicyBundle _eventPolicy({
  int capacityLimit = 10,
  int basePriceInPaise = 0,
}) {
  return EventPolicyBundle.openEvent(
    capacityLimit: capacityLimit,
    basePriceInPaise: basePriceInPaise,
  );
}

EventMeetingLocation _meetingLocation({
  String name = 'Marine Drive',
  double latitude = 19.076,
  double longitude = 72.8777,
  String? notes,
}) {
  return EventMeetingLocation(
    name: name,
    latitude: latitude,
    longitude: longitude,
    notes: notes,
  );
}
