/// Paid host memberships: plans, member records, checkout and badges.
///
/// Cross-feature consumers (event checkout, organizer page, profile, Host
/// rosters) import this barrel instead of presentation internals.
library;

export 'data/host_membership_repository.dart';
export 'domain/host_membership.dart';
export 'domain/host_membership_benefit_use.dart';
export 'domain/host_membership_event_facts.dart';
export 'domain/host_membership_plan.dart';
export 'presentation/host_membership_badge.dart'; // public-api: member badge for profiles, attendee and check-in rows
export 'presentation/host_membership_copy.dart'; // public-api: shared membership price, status and benefit copy
export 'presentation/host_membership_plan_sheet.dart'
    show
        showHostMembershipPlanSheet; // public-api: join flow opened from checkout upsell
export 'presentation/host_membership_plans_section.dart'; // public-api: organizer page membership offer
export 'presentation/host_membership_profile_section.dart'; // public-api: own-profile badges and My memberships entry
export 'presentation/host_membership_upsell_banner.dart'; // public-api: event checkout upsell
export 'presentation/my_memberships_screen.dart'; // public-api: route entry point exposed to app routing
