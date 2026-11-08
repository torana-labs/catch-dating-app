import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:flutter/foundation.dart';

/// Where one answer is: reading it, or showing it.
enum HostResponseStatus { loading, content }

/// The dock's primary action on one answer.
enum HostResponsePrimary {
  /// Lets the person in if they are not in yet, then opens the offer.
  offer,

  /// Adds a person with no contact to People, so they can be offered.
  addToPeople,

  /// Back to the offer this answer was opened from.
  continueOffer,
}

/// One answered question, as the host reads it.
@immutable
class HostResponseAnswer {
  const HostResponseAnswer({
    required this.question,
    required this.answer,
    this.files = const <HostFormAssetDownload>[],
  });

  final String question;

  /// The answer as text; null when it was left blank.
  final String? answer;

  /// Files the person attached to this answer.
  final List<HostFormAssetDownload> files;
}

/// Everything one answer shows, as plain values.
@immutable
class HostResponseState {
  const HostResponseState({
    required this.status,
    this.name,
    this.review,
    this.withdrawn = false,
    this.facts = const <String>[],
    this.answers = const <HostResponseAnswer>[],
    this.payment,
    this.showNote = false,
    this.primary,
    this.canDecline = false,
    this.canMessage = false,
    this.busy = false,
    this.failed = false,
  });

  const HostResponseState.loading() : this(status: HostResponseStatus.loading);

  final HostResponseStatus status;
  final String? name;

  /// The application's review status; null for an answer nobody reviews.
  final HostApplicationReviewStatus? review;
  final bool withdrawn;

  /// The line under the name: where it came from, email, phone.
  final List<String> facts;
  final List<HostResponseAnswer> answers;

  /// The payment taken with the answer, as one line; null with none.
  final String? payment;

  /// The team note shows (an application has one).
  final bool showNote;
  final HostResponsePrimary? primary;

  /// Not now can mark the application declined.
  final bool canDecline;

  /// The person left a phone or email to message.
  final bool canMessage;

  /// A review or conversion is running.
  final bool busy;

  /// The last review or conversion failed.
  final bool failed;
}
