import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';

enum OrganizerEventVenueStatus { active, archived }

final class OrganizerEventVenue {
  const OrganizerEventVenue({
    required this.organizerId,
    required this.venueId,
    required this.label,
    required this.meetingLocation,
    required this.status,
    this.defaultEventCapacity,
  });

  factory OrganizerEventVenue.fromJson(Map<String, dynamic> json) =>
      OrganizerEventVenue(
        organizerId: json['organizerId'] as String,
        venueId: json['venueId'] as String,
        label: json['label'] as String,
        meetingLocation: EventMeetingLocation.fromJson(
          Map<String, dynamic>.from(json['meetingLocation'] as Map),
        ),
        defaultEventCapacity: json['defaultEventCapacity'] as int?,
        status: OrganizerEventVenueStatus.values.byName(
          json['status'] as String? ?? OrganizerEventVenueStatus.active.name,
        ),
      );

  final String organizerId;
  final String venueId;
  final String label;
  final EventMeetingLocation meetingLocation;
  final int? defaultEventCapacity;
  final OrganizerEventVenueStatus status;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'venueId': venueId,
    'label': label,
    'meetingLocation': meetingLocation.toJson(),
    'defaultEventCapacity': defaultEventCapacity,
    'status': status.name,
  };
}
