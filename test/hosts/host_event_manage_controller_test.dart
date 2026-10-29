import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/clipboard.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

import '../events/events_test_helpers.dart';

void main() {
  late FakeEventRepository eventRepository;
  late FakeEventParticipationRepository participationRepository;
  late FakePublicProfileRepository publicProfileRepository;
  late List<String> copiedText;
  late ShareParams? sharedParams;
  late ProviderContainer container;

  setUp(() {
    eventRepository = FakeEventRepository();
    participationRepository = FakeEventParticipationRepository();
    publicProfileRepository = FakePublicProfileRepository();
    copiedText = <String>[];
    sharedParams = null;
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        eventRepositoryProvider.overrideWith((ref) => eventRepository),
        eventParticipationRepositoryProvider.overrideWithValue(
          participationRepository,
        ),
        publicProfileRepositoryProvider.overrideWithValue(
          publicProfileRepository,
        ),
        clipboardSetterProvider.overrideWithValue((ClipboardData data) async {
          copiedText.add(data.text ?? '');
        }),
        externalShareControllerProvider.overrideWithValue(
          ExternalShareController((params) async {
            sharedParams = params;
          }),
        ),
      ],
    );
  });

  tearDown(() {
    container.dispose();
  });

  test(
    'createInviteLink delegates to repository and copies generated URL',
    () async {
      final event = HostOperationsFixtures.privateEvent;
      final controller = container.read(hostEventManageActionsProvider);

      final label = await controller.createInviteLink(
        event: event,
        inviteCode: 'VIP123',
        draft: const HostInviteLinkDraft(
          label: 'Instagram bio',
          source: 'instagram',
        ),
      );

      expect(label, 'Instagram bio');
      expect(eventRepository.createdInviteLinkEventId, event.id);
      expect(eventRepository.createdInviteLinkLabel, 'Instagram bio');
      expect(eventRepository.createdInviteLinkSource, 'instagram');
      expect(copiedText.single, contains('invite=VIP123'));
      expect(copiedText.single, contains('il=v2_invite-link-1_test-token'));
    },
  );

  test('copyInviteLink resolves and copies the opaque token URL', () async {
    final event = HostOperationsFixtures.privateEvent;
    final link = HostOperationsFixtures.inviteLinks.first;
    final controller = container.read(hostEventManageActionsProvider);

    final label = await controller.copyInviteLink(
      event: event,
      inviteCode: 'VIP123',
      link: link,
    );

    expect(label, link.label);
    expect(copiedText.single, contains('invite=VIP123'));
    expect(copiedText.single, contains('il=v2_${link.id}_test-token'));
    expect(eventRepository.requestedInviteLinkTokenId, link.id);
  });

  test(
    'disableInviteLink delegates to repository and returns its label',
    () async {
      final event = HostOperationsFixtures.privateEvent;
      final link = HostOperationsFixtures.inviteLinks.first;
      final controller = container.read(hostEventManageActionsProvider);

      final label = await controller.disableInviteLink(
        event: event,
        link: link,
      );

      expect(label, link.label);
      expect(eventRepository.disabledInviteLinkEventId, event.id);
      expect(eventRepository.disabledInviteLinkId, link.id);
    },
  );

  test('cancelHostedEvent delegates through the booking controller', () async {
    final event = HostOperationsFixtures.privateEvent;
    final controller = container.read(hostEventManageActionsProvider);

    await controller.cancelHostedEvent(event: event);

    expect(eventRepository.hostCancelledEventId, event.id);
  });

  test('deleteUnusedEvent delegates through the booking controller', () async {
    final event = HostOperationsFixtures.privateEvent;
    final controller = container.read(hostEventManageActionsProvider);

    await controller.deleteUnusedEvent(event: event);

    expect(eventRepository.deletedEventId, event.id);
  });

  test('sharePrivateLink delegates to the external share controller', () async {
    final event = HostOperationsFixtures.privateEvent;
    final club = HostOperationsFixtures.primaryClub;
    final controller = container.read(hostEventManageActionsProvider);

    await controller.sharePrivateLink(
      club: club,
      event: event,
      inviteLink: 'https://catchdates.com/events/e-1?invite=VIP123',
      l10n: AppLocalizationsEn(),
    );

    expect(sharedParams?.subject, contains(event.title));
    expect(
      sharedParams?.text,
      contains('https://catchdates.com/events/e-1?invite=VIP123'),
    );
  });

  test('shareRevenueReport builds and shares a revenue CSV', () async {
    final event = HostOperationsFixtures.fullEvent;
    final participation = HostOperationsFixtures.participation(
      uid: 'runner-1',
      event: event,
      status: EventParticipationStatus.attended,
      gender: Gender.woman,
      createdOffset: const Duration(days: 2),
    );
    participationRepository.eventParticipations[event.id] = [participation];
    final controller = container.read(hostEventManageActionsProvider);

    await controller.shareRevenueReport(
      viewModel: AttendanceSheetViewModel(
        event: event,
        attendeeIds: const ['runner-1'],
        attendedIds: const {'runner-1'},
        waitlistedIds: const [],
        profileIds: const ['runner-1'],
        participationsByUid: {'runner-1': participation},
      ),
      profiles: const {'runner-1': ('Asha', null)},
    );

    expect(participationRepository.lastFetchedEventId, event.id);
    expect(publicProfileRepository.lastRequestedUids, ['runner-1']);
    expect(sharedParams?.subject, 'Revenue report: ${event.title}');
    expect(sharedParams?.title, contains('-revenue.csv'));
    expect(sharedParams?.fileNameOverrides?.single, contains('-revenue.csv'));
  });

  test('shareOpsReport builds and shares an ops CSV', () async {
    final event = HostOperationsFixtures.fullEvent;
    final participation = HostOperationsFixtures.participation(
      uid: 'runner-2',
      event: event,
      status: EventParticipationStatus.signedUp,
      gender: Gender.man,
      createdOffset: const Duration(days: 1),
    );
    participationRepository.eventParticipations[event.id] = [participation];
    final controller = container.read(hostEventManageActionsProvider);

    await controller.shareOpsReport(
      viewModel: AttendanceSheetViewModel(
        event: event,
        attendeeIds: const ['runner-2'],
        attendedIds: const <String>{},
        waitlistedIds: const [],
        profileIds: const ['runner-2'],
        participationsByUid: {'runner-2': participation},
      ),
      profiles: const {'runner-2': ('Kabir', null)},
    );

    expect(participationRepository.lastFetchedEventId, event.id);
    expect(publicProfileRepository.lastRequestedUids, ['runner-2']);
    expect(sharedParams?.subject, 'Ops report: ${event.title}');
    expect(sharedParams?.title, contains('-ops.csv'));
    expect(sharedParams?.fileNameOverrides?.single, contains('-ops.csv'));
  });
}
