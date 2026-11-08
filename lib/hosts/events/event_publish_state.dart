import 'package:flutter/foundation.dart';

/// Where the publication screen is: reading, showing the choice, the
/// server has not written the event's setup view yet, or unable to read.
enum HostEventPublishStatus { loading, ready, missing, error }

/// Everything the publication screen shows, as plain values.
@immutable
class HostEventPublishState {
  const HostEventPublishState({
    required this.status,
    this.eventTitle,
    this.published = false,
    this.canPublish = false,
    this.setupRevision,
    this.error,
  });

  const HostEventPublishState.loading()
    : this(status: HostEventPublishStatus.loading);

  final HostEventPublishStatus status;
  final String? eventTitle;

  /// Everyone can find and book the event; otherwise only the team sees it.
  final bool published;

  /// The server says the event has what publishing needs.
  final bool canPublish;

  /// The fence for the next publication command.
  final int? setupRevision;
  final Object? error;
}
