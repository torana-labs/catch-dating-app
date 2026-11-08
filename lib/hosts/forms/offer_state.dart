import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:flutter/foundation.dart';

/// Where offering a place is.
enum HostOfferStage {
  /// Reading the events or the chosen event's terms.
  loading,

  /// Choosing which event to offer.
  events,

  /// A person must be added to People before they can be offered.
  needsContact,

  /// The event has no offer terms yet; its settings set them.
  needsSettings,

  /// Each person needs their own payment link.
  personalLinks,

  /// The offer is ready to send.
  review,

  /// Offers already made for this event, to open one.
  existing,

  /// One offer is open: its message, payment and admission.
  selected,
}

/// Where the admission of an offered person stands.
enum HostOfferAdmissionPhase { check, ready, keep, saved, again, done }

/// An event a place can be offered at.
@immutable
class HostOfferEvent {
  const HostOfferEvent({
    required this.id,
    required this.name,
    required this.startsAt,
  });

  final String id;
  final String? name;
  final DateTime startsAt;
}

/// A person in the offer, by the id the action needs.
@immutable
class HostOfferPerson {
  const HostOfferPerson({required this.id, required this.name});

  final String id;
  final String? name;
}

/// An offer made earlier for this event.
@immutable
class HostOfferExisting {
  const HostOfferExisting({
    required this.item,
    required this.name,
    required this.status,
  });

  /// The offer as the list returned it, for opening it again.
  final Map<String, Object?> item;
  final String? name;
  final HostOfferStatus? status;
}

/// The manual payment check of an open offer.
@immutable
class HostOfferManual {
  const HostOfferManual({
    required this.status,
    this.reference,
    this.failed = false,
    this.busy = false,
  });

  final HostManualPaymentStatus status;

  /// The reference the guest gave for their transfer.
  final String? reference;
  final bool failed;
  final bool busy;
}

/// Letting an offered person in.
@immutable
class HostOfferAdmission {
  const HostOfferAdmission({
    required this.phase,
    this.blocker,
    this.failed = false,
    this.busy = false,
  });

  final HostOfferAdmissionPhase phase;

  /// Why the person cannot be let in, from the server.
  final String? blocker;
  final bool failed;
  final bool busy;
}

/// The open offer.
@immutable
class HostOfferSelected {
  const HostOfferSelected({
    required this.name,
    required this.status,
    required this.expiresAt,
    this.message,
    this.blocked = false,
    this.copied = false,
    this.openFailed = false,
    this.canOpenWhatsapp = false,
    this.manual,
    this.admission,
  });

  final String? name;
  final HostOfferStatus status;
  final DateTime expiresAt;

  /// The WhatsApp message, once it is prepared.
  final String? message;

  /// The message cannot be prepared for this person.
  final bool blocked;
  final bool copied;
  final bool openFailed;
  final bool canOpenWhatsapp;
  final HostOfferManual? manual;
  final HostOfferAdmission? admission;
}

/// Everything offering a place shows, as plain values.
@immutable
class HostOfferState {
  const HostOfferState({
    required this.stage,
    this.recipient,
    this.events = const <HostOfferEvent>[],
    this.canLoadMoreEvents = false,
    this.event,
    this.missing = const <HostOfferPerson>[],
    this.personal = const <HostOfferPerson>[],
    this.recipients = const <String>[],
    this.amount,
    this.expiresAt,
    this.sent = false,
    this.sendFailed = false,
    this.existing = const <HostOfferExisting>[],
    this.selected,
    this.busy = false,
    this.canCancel = false,
    this.failed = false,
    this.stale = false,
    this.canRetry = false,
  });

  final HostOfferStage stage;

  /// Who the offer is for.
  final String? recipient;
  final List<HostOfferEvent> events;
  final bool canLoadMoreEvents;

  /// The chosen event.
  final HostOfferEvent? event;
  final List<HostOfferPerson> missing;
  final List<HostOfferPerson> personal;

  /// The people the ready offer goes to.
  final List<String> recipients;

  /// What the place costs, as the guest sees it; null when not known.
  final String? amount;

  /// Until when the place is held.
  final DateTime? expiresAt;

  /// The ready offer was sent.
  final bool sent;
  final bool sendFailed;
  final List<HostOfferExisting> existing;
  final HostOfferSelected? selected;
  final bool busy;

  /// Preparing can still be stopped.
  final bool canCancel;
  final bool failed;

  /// The answers changed under the offer; it starts again.
  final bool stale;
  final bool canRetry;
}
