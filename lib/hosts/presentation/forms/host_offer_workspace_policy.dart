import 'dart:math';

import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';

/// Offer construction, bounded reads and validation at the workspace boundary.
/// Async account/generation fences remain owned by the workspace controller.
class HostOfferWorkspacePolicy {
  static HostOfferBatchDraft draft({
    required String organizerId,
    required List<HostFormResponseDetail> details,
    required HostOfferEventConfiguration configuration,
    required bool personalMode,
    required Map<String, String> personalLinks,
  }) {
    final expiry = configuration.suggestedExpiresAt!;
    if (personalMode) {
      for (final detail in details) {
        final link = Uri.tryParse(personalLinks[detail.contactId!] ?? '');
        if (link == null ||
            link.scheme != 'https' ||
            link.host.isEmpty ||
            link.userInfo.isNotEmpty ||
            link.toString().length > 2048) {
          throw ArgumentError('A recipient payment link needs review.');
        }
      }
    }
    final draft = HostOfferBatchDraft(
      organizerId: organizerId,
      eventId: configuration.eventId,
      rows: [
        for (final detail in details)
          HostOfferRow(
            organizerId: organizerId,
            eventId: configuration.eventId,
            contactId: detail.contactId!,
            sourceKind: detail.applicationId == null
                ? HostOfferSourceKind.formResponse
                : HostOfferSourceKind.application,
            sourceId: detail.applicationId ?? detail.response.responseId,
            expiresAt: expiry,
            organizerPaymentLink: personalMode
                ? Uri.tryParse(personalLinks[detail.contactId!] ?? '')
                : null,
          ),
      ],
    );
    draft.validate(
      now: configuration.serverNow,
      eventStartsAt: configuration.startsAt,
    );
    return draft;
  }

  static ({List<Map<String, Object?>> items, String? cursor}) offerPage({
    required Map<String, Object?> response,
    required String eventId,
    required String? previousCursor,
    required bool append,
    required List<HostFormResponseDetail> details,
    required List<Map<String, Object?>> offers,
  }) {
    final rawItems = response['items'];
    final cursor = response['nextCursor'];
    if (rawItems is! List || cursor != null && cursor is! String) {
      throw const FormatException('Offer list is invalid.');
    }
    final parsed = rawItems.map((item) {
      if (item is! Map) {
        throw const FormatException('Offer row is invalid.');
      }
      return item.cast<String, Object?>();
    }).toList();
    if (parsed.any(
          (item) =>
              item['eventId'] != eventId ||
              item['offerId'] is! String ||
              item['contactId'] is! String,
        ) ||
        parsed.map((item) => item['offerId']).toSet().length != parsed.length ||
        append && cursor == previousCursor) {
      throw const FormatException('Offer list is inconsistent.');
    }
    // This workspace belongs to one selected response set. Keep unrelated
    // event offers out of the chooser without fetching private CRM labels.
    final selectedContacts = details
        .map((detail) => detail.contactId)
        .whereType<String>()
        .toSet();
    final visible = parsed
        .where((item) => selectedContacts.contains(item['contactId']))
        .toList();
    final combined = append ? [...offers, ...visible] : visible;
    if (combined.map((item) => item['offerId']).toSet().length !=
        combined.length) {
      throw const FormatException('Offer list repeats an offer.');
    }
    return (items: List.unmodifiable(combined), cursor: cursor as String?);
  }

  static final Random _entropy = Random.secure();
  static String newRequestId() {
    final time = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final random = List.generate(
      3,
      (_) => _entropy.nextInt(0x100000000).toRadixString(36),
    ).join();
    return 'offer_${time}_$random';
  }

  static String? selectedResponseId(
    HostEventOffer? offer,
    List<HostFormResponseDetail> details,
  ) {
    if (offer == null) return null;
    final matches = details.where(
      (detail) =>
          detail.contactId == offer.contactId &&
          (offer.sourceKind == HostOfferSourceKind.formResponse
              ? detail.response.responseId == offer.sourceId
              : detail.applicationId == offer.sourceId),
    );
    return matches.length == 1 ? matches.single.response.responseId : null;
  }

  static Future<List<HostFormResponseDetail>> resolveDetails({
    required List<String> ids,
    required Future<HostFormResponseDetail> Function(String) getResponseDetail,
    required bool queryConfigured,
    required HostResponseQueryRequest? Function() currentRequest,
    bool Function()? isCurrent,
  }) async {
    final details = <HostFormResponseDetail>[];
    // Four bounded callable reads at a time, no partial batch acceptance.
    for (var offset = 0; offset < ids.length; offset += 4) {
      if (isCurrent?.call() == false) {
        throw StateError('Offer preparation cancelled.');
      }
      final end = min(offset + 4, ids.length);
      details.addAll(
        await Future.wait(ids.sublist(offset, end).map(getResponseDetail)),
      );
    }
    final request = currentRequest();
    if (queryConfigured && request == null ||
        details.length != ids.length ||
        details.asMap().entries.any(
          (entry) =>
              entry.value.response.responseId != ids[entry.key] ||
              request != null &&
                  (entry.value.response.formId != request.formId ||
                      entry.value.response.versionId != request.versionId) ||
              entry.value.response.identity.origin ==
                  HostFormDataOrigin.revoked ||
              entry.value.response.status != HostFormResponseStatus.submitted,
        )) {
      throw StateError('Selected responses changed.');
    }
    return details;
  }

  static Future<List<HostFormResponseDetail>> missingContacts({
    required List<HostFormResponseDetail> details,
    required Future<bool> Function(HostFormResponseDetail)? isResponseReviewed,
    required bool Function() isCurrent,
  }) async {
    final missing = <HostFormResponseDetail>[];
    // Application approval reads have the same bound as response reads.
    for (var offset = 0; offset < details.length; offset += 4) {
      if (!isCurrent()) throw StateError('Offer preparation cancelled.');
      final batch = details.sublist(offset, min(offset + 4, details.length));
      final reviewed = await Future.wait(
        batch.map(
          (detail) async =>
              detail.contactId?.isNotEmpty == true &&
              (isResponseReviewed == null || await isResponseReviewed(detail)),
        ),
      );
      for (var index = 0; index < batch.length; index++) {
        if (!reviewed[index]) missing.add(batch[index]);
      }
    }
    return List.unmodifiable(missing);
  }

  static Future<({HostEventOffer offer, HostOfferHandoff handoff})?>
  verifiedHandoff({
    required HostEventOffer selected,
    required Future<HostEventOffer> Function({
      required String organizerId,
      required String eventId,
      required String contactId,
    })
    getOffer,
    required Future<HostOfferHandoff> Function({required HostEventOffer offer})
    prepareHandoff,
    required bool Function() isCurrent,
  }) async {
    final current = await getOffer(
      organizerId: selected.organizerId,
      eventId: selected.eventId,
      contactId: selected.contactId,
    );
    if (!isCurrent()) {
      return null;
    }
    if (current.offerId != selected.offerId ||
        current.organizerId != selected.organizerId ||
        current.eventId != selected.eventId ||
        current.contactId != selected.contactId) {
      throw const FormatException('Offer detail changed.');
    }
    final handoff = await prepareHandoff(offer: current);
    if (!isCurrent()) {
      return null;
    }
    if (handoff.offerId != current.offerId ||
        handoff.kind == 'prepared' && handoff.contactId != current.contactId) {
      throw const FormatException('Offer handoff does not match selection.');
    }
    return (offer: current, handoff: handoff);
  }

  static bool configurationMatches(
    HostOfferEventConfiguration configuration,
    HostOfferEventTarget event,
    String organizerId,
  ) =>
      !(configuration.organizerId != organizerId ||
          configuration.eventId != event.eventId ||
          !configuration.startsAt.isAtSameMomentAs(event.startTime) ||
          event.setupRevision != null &&
              configuration.eventSourceRevision != event.setupRevision);

  static bool personalReviewChanged(
    HostOfferEventConfiguration current,
    HostOfferEventConfiguration previous,
    List<HostFormResponseDetail> details,
    List<HostFormResponseDetail> previousDetails,
  ) =>
      current.eventSourceRevision != previous.eventSourceRevision ||
      current.suggestedExpiresAt != previous.suggestedExpiresAt ||
      current.paymentTerms?['preferredCollection'] !=
          previous.paymentTerms?['preferredCollection'] ||
      details.any((detail) => detail.contactId == null) ||
      details.asMap().entries.any(
        (entry) =>
            entry.value.contactId != previousDetails[entry.key].contactId,
      );

  static bool sameOfferRevision(
    HostEventOffer? current,
    HostEventOffer offer,
  ) =>
      current?.offerId == offer.offerId &&
      current?.revision == offer.revision &&
      current?.generation == offer.generation;
}
