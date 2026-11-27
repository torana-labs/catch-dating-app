import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/organizer/edit/host_organizer_defaults_saver.dart'
    show OrganizerHostDefaultsUpdate;
import 'package:catch_dating_app/hosts/organizer/edit/organizer_host_defaults_step.dart'
    show OrganizerPolicyDefaultsCard;
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The policy every new event of the organizer starts with: where it is
/// and its timezone, then the main activity, admission, ages and the
/// cancellation policy. The owner changes the policy through the shared
/// policy card; a manager reads it. A failed save says why under it.
class OrganizerEventPolicyBody extends StatelessWidget {
  const OrganizerEventPolicyBody({
    super.key,
    required this.city,
    required this.defaults,
    required this.editable,
    required this.onChanged,
    this.errorMessage,
  });

  /// The organizer city, as its market id.
  final String city;
  final OrganizerHostDefaults defaults;

  /// Whether this account owns the organizer and may change the policy.
  final bool editable;
  final ValueChanged<OrganizerHostDefaultsUpdate> onChanged;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final policy = defaults.eventPolicy;
    return CatchPageBody.screen(
      children: [
        CatchSection(
          title: l10n.hostsEventDefaultsBasics,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField.read(
              copy: copy,
              title: l10n.hostsPrivateEventCity,
              body: l10n.hostsEventDefaultsCitySource,
              valueText: cityLabel(city),
              icon: CatchIcons.location,
            ),
            CatchField.read(
              copy: copy,
              title: l10n.hostsPrivateEventTimezone,
              body: l10n.hostsEventDefaultsTimezoneSource,
              valueText:
                  defaults.timezone ?? l10n.hostsEventDefaultsChooseEachEvent,
              icon: CatchIcons.web,
            ),
          ],
        ),
        if (editable)
          OrganizerPolicyDefaultsCard(
            key: const ValueKey<String>('event-policy-card'),
            defaults: policy,
            currencyCode: currencyCodeForCityName(city),
            activityKind: defaults.primaryActivityKind,
            onActivityChanged: (kind) => onChanged(
              (current) => organizerDefaultsWithActivity(current, kind),
            ),
            onChanged: (update) => onChanged(
              (current) =>
                  current.copyWith(eventPolicy: update(current.eventPolicy)),
            ),
          )
        else
          CatchSection(
            key: const ValueKey<String>('event-policy-read'),
            title: l10n.hostsHostOrganizerEditTabLabelEventDefaults,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.read(
                copy: copy,
                title: l10n.hostsHostOrganizerProfileTitleDefaultActivity,
                valueText: defaults.primaryActivityKind.label,
                icon: CatchIcons.event,
              ),
              CatchField.read(
                copy: copy,
                title: l10n.hostsHostOrganizerProfileTitleAdmission,
                body: _admissionBody(policy.admissionPreset, l10n),
                valueText: _admissionLabel(policy.admissionPreset, l10n),
                icon: CatchIcons.seat,
              ),
              CatchField.read(
                copy: copy,
                title: l10n.hostsHostOrganizerProfileTitleAgeRange,
                valueText: l10n
                    .hostsHostOrganizerProfileVisiblecopyMinageMaxage(
                      minAge: policy.minAge,
                      maxAge: policy.maxAge,
                    ),
                icon: CatchIcons.birthday,
              ),
              CatchField.read(
                copy: copy,
                title: l10n.hostsHostOrganizerProfileTitleCancellationPolicy,
                body: policy.cancellationPolicy.attendeeSummary,
                valueText: policy.cancellationPolicy.title,
                icon: CatchIcons.eventUnavailable,
              ),
            ],
          ),
        if (errorMessage case final message?)
          CatchNotice.inline(
            key: const ValueKey<String>('event-policy-error'),
            tone: CatchNoticeTone.danger,
            body: message,
          ),
      ],
    );
  }

  static String _admissionLabel(
    EventAdmissionDefaultPreset preset,
    AppLocalizations l10n,
  ) => switch (preset) {
    EventAdmissionDefaultPreset.openCapacity =>
      l10n.hostsCreateEventPolicyStateTitleOpenCapacity,
    EventAdmissionDefaultPreset.inviteOnly =>
      l10n.hostsCreateEventPolicyStateTitleInviteOnly,
    EventAdmissionDefaultPreset.balancedSingles =>
      l10n.hostsCreateEventPolicyStateTitleBalancedSingles,
    EventAdmissionDefaultPreset.fixedCohortCaps =>
      l10n.hostsAdmissionFixedCohortCapsLabel,
  };

  static String _admissionBody(
    EventAdmissionDefaultPreset preset,
    AppLocalizations l10n,
  ) => switch (preset) {
    EventAdmissionDefaultPreset.openCapacity =>
      l10n.hostsAdmissionOpenCapacityDescription,
    EventAdmissionDefaultPreset.inviteOnly =>
      l10n.hostsAdmissionInviteOnlyDescription,
    EventAdmissionDefaultPreset.balancedSingles =>
      l10n.hostsAdmissionBalancedSinglesDescription,
    EventAdmissionDefaultPreset.fixedCohortCaps =>
      l10n.hostsAdmissionFixedCohortCapsDescription,
  };
}

/// [defaults] with [activity] as the main activity, added to the activities
/// the organizer runs when it was not one already.
OrganizerHostDefaults organizerDefaultsWithActivity(
  OrganizerHostDefaults defaults,
  ActivityKind activity,
) => defaults.copyWith(
  primaryActivityKind: activity,
  supportedActivityKinds:
      defaults.effectiveSupportedActivityKinds.contains(activity)
      ? defaults.supportedActivityKinds
      : [...defaults.supportedActivityKinds, activity],
);
