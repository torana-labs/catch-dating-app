import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_offer_workspace_policy.dart';
import 'package:catch_dating_app/hosts/forms/offer_screen.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/persistence/command_journal_provider.dart';
import 'package:catch_platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

import 'event_offer_controller_test_support.dart';

part 'host_event_offer_workspace_fixtures.dart';
part 'host_offer_preparation_cases.dart';

@Dependencies([HostEventOfferWorkspaceController])
void main() {
  _preparationRegressionTests();
  _newOfferScreenTests();

  for (final approved in [false, true]) {
    test(
      'single response uses the shared flow and checks application review: $approved',
      () async {
        final offers = TestHostEventOfferController(_Offers());
        final targets = _Targets();
        var reviewed = approved;
        var reads = 0;
        final workspace = TestHostEventOfferWorkspaceController(
          organizerId: 'org',
          accountId: 'manager',
          responseId: 'response-one',
          offerController: offers,
          targets: targets,
          listOffers:
              ({required organizerId, required eventId, afterOfferId}) async =>
                  const {'items': <Object>[], 'nextCursor': null},
          getOffer:
              ({
                required organizerId,
                required eventId,
                required contactId,
              }) async => _existingOffer(),
          prepareHandoff: ({required offer}) async => const HostOfferHandoff(
            kind: 'blocked',
            offerId: 'offer-one',
            blockers: [],
          ),
          copyMessage: (_) async {},
          openHandoff: (_) async => false,
          getResponseDetail: (_) async {
            reads++;
            return _detail('contact-one', applicationId: 'application-one');
          },
          isResponseReviewed: (_) async => reviewed,
          openResponseForConversion: (_) async => reviewed = true,
          openEventSettings: (_) async {},
          now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
        );
        addTearDown(workspace.dispose);
        addTearDown(offers.dispose);
        await workspace.start();
        await workspace.choose(workspace.events.single);
        expect(workspace.missingContacts.isEmpty, approved);
        if (!approved) {
          expect(workspace.draft, isNull);
          await workspace.returnForConversion('response-one');
          expect(reads, 2);
        }
        expect(workspace.draft!.rows.single.sourceId, 'application-one');
        final chosen = workspace.event!;
        workspace.changeEvent();
        expect(workspace.event, isNull);
        expect(workspace.draft, isNull);
        await workspace.choose(chosen);
        expect(workspace.draft!.rows.single.contactId, 'contact-one');
      },
    );
  }

  test(
    'single response rejects an identity changed by an asynchronous detail read',
    () async {
      final offers = TestHostEventOfferController(_Offers());
      final workspace = TestHostEventOfferWorkspaceController(
        organizerId: 'org',
        accountId: 'manager',
        responseId: 'different-response',
        offerController: offers,
        targets: _Targets(),
        listOffers:
            ({required organizerId, required eventId, afterOfferId}) async =>
                const {'items': <Object>[], 'nextCursor': null},
        getOffer:
            ({
              required organizerId,
              required eventId,
              required contactId,
            }) async => _existingOffer(),
        prepareHandoff: ({required offer}) async => const HostOfferHandoff(
          kind: 'blocked',
          offerId: 'offer-one',
          blockers: [],
        ),
        copyMessage: (_) async {},
        openHandoff: (_) async => false,
        getResponseDetail: (_) async => _detail('contact-one'),
        openResponseForConversion: (_) async {},
        openEventSettings: (_) async {},
        now: DateTime.now,
      );
      addTearDown(workspace.dispose);
      addTearDown(offers.dispose);
      await workspace.start();
      await workspace.choose(workspace.events.single);
      expect(workspace.hasError, isTrue);
      expect(workspace.draft, isNull);
    },
  );

  for (final applicationId in [null, 'application-one']) {
    test('saved target revalidates response and admission source '
        'for ${applicationId ?? 'registration'}', () async {
      final source = _Query();
      final query = HostResponseQueryController(source);
      final offers = TestHostEventOfferController(_Offers());
      final targets = _Targets();
      addTearDown(query.dispose);
      addTearDown(offers.dispose);
      await query.apply(
        const HostResponseQueryRequest(
          organizerId: 'org',
          formId: 'form',
          versionId: 'form_v1',
        ),
      );
      query.toggleSelection('response-one');
      final workspace = TestHostEventOfferWorkspaceController(
        organizerId: 'org',
        accountId: 'manager',
        queryController: query,
        offerController: offers,
        listOffers:
            ({required organizerId, required eventId, afterOfferId}) async =>
                const {'items': <Object>[], 'nextCursor': null},
        getOffer:
            ({
              required organizerId,
              required eventId,
              required contactId,
            }) async => _existingOffer(applicationId: applicationId),
        prepareHandoff: ({required offer}) async => const HostOfferHandoff(
          kind: 'blocked',
          offerId: 'offer-one',
          blockers: ['fixture'],
        ),
        copyMessage: (_) async {},
        openHandoff: (_) async => false,
        targets: targets,
        getResponseDetail: (_) async =>
            _detail('contact-one', applicationId: applicationId),
        openResponseForConversion: (_) async {},
        openEventSettings: (_) async => targets.revision = 2,
        now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
        initialEventTarget: HostOfferEventTarget(
          eventId: 'event-one',
          name: 'Freshly saved',
          startTime: _start,
          timezone: 'Asia/Kolkata',
          publicationState: 'private',
          setupRevision: 1,
        ),
      );
      addTearDown(workspace.dispose);
      await workspace.start();
      expect(targets.listCalls, 0);
      expect(targets.configurationCalls, 1);
      expect(workspace.event?.name, 'Freshly saved');
      await workspace.openSettings();
      expect(workspace.event?.setupRevision, 2);
      expect(targets.configurationCalls, 2);
      if (applicationId != null) {
        expect(
          workspace.draft!.rows.single.sourceKind,
          HostOfferSourceKind.application,
        );
        expect(workspace.draft!.rows.single.sourceId, 'application-one');
        await workspace.selectExisting({
          'offerId': 'offer-one',
          'eventId': 'event-one',
          'contactId': 'contact-one',
        });
        expect(workspace.selectedResponseId, 'response-one');
        final offer = workspace.selectedOffer!;
        expect(
          () => HostFormAdmissionScope.fromOffer(offer),
          throwsFormatException,
        );
        final scope = HostFormAdmissionScope.fromOffer(
          offer,
          responseId: workspace.selectedResponseId,
        );
        expect(scope.responseId, 'response-one');
        expect(scope.offerId, 'offer-one');
        workspace.manualUpdated(
          _existingOffer(applicationId: 'another-application'),
        );
        expect(workspace.selectedResponseId, isNull);
      }
      source.hash = 'changed';
      await workspace.choose(workspace.event!);
      expect(workspace.selectionStale, isTrue);
      expect(targets.configurationCalls, 2);
    });
  }

  test('workspace controller invalidates selected offer context when the '
      'underlying query selection changes', () async {
    final query = HostResponseQueryController(_Query());
    final offers = TestHostEventOfferController(_Offers());
    addTearDown(query.dispose);
    addTearDown(offers.dispose);
    await query.apply(
      const HostResponseQueryRequest(
        organizerId: 'org',
        formId: 'form',
        versionId: 'form_v1',
      ),
    );
    query.toggleSelection('response-one');
    final workspace = TestHostEventOfferWorkspaceController(
      organizerId: 'org',
      accountId: 'manager',
      queryController: query,
      offerController: offers,
      listOffers:
          ({required organizerId, required eventId, afterOfferId}) async =>
              const {'items': <Object>[], 'nextCursor': null},
      getOffer:
          ({
            required organizerId,
            required eventId,
            required contactId,
          }) async => _existingOffer(),
      prepareHandoff: ({required offer}) async => const HostOfferHandoff(
        kind: 'blocked',
        offerId: 'offer-one',
        blockers: ['fixture'],
      ),
      copyMessage: (_) async {},
      openHandoff: (_) async => false,
      targets: _Targets(),
      getResponseDetail: (_) async => _detail('contact-one'),
      openResponseForConversion: (_) async {},
      openEventSettings: (_) async {},
      now: () => DateTime.fromMillisecondsSinceEpoch(1799990000000),
    );
    addTearDown(workspace.dispose);

    await workspace.start();
    expect(workspace.ids, ['response-one']);
    expect(workspace.events.single.eventId, 'event-one');
    query.clearSelection();
    expect(workspace.ids, isEmpty);
    expect(workspace.events, isEmpty);
    expect(workspace.draft, isNull);
  });
}
