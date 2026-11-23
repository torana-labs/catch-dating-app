/// Paid host memberships: plans, member records, checkout and badges.
///
/// Cross-feature consumers (event checkout, organizer page, profile, Host
/// rosters) import this barrel instead of presentation internals.
library;

export 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
export 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
export 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
export 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';
export 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
export 'presentation/host_membership_badge.dart'; // public-api: member badge for profiles, attendee and check-in rows
export 'presentation/host_membership_profile_section.dart'; // public-api: own-profile badges and My memberships entry
export 'presentation/my_memberships_screen.dart'; // public-api: route entry point exposed to app routing
