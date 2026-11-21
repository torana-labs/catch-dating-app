import 'package:catch_dating_app/contexts/organizers/data/organizer_claims_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Setup step one when Catch found pages for the number: "Is this you?".
/// Each page shows its name, city, logo and why it was found; "This is me"
/// claims it and "None of these" starts a new page instead.
class HostSetupFoundBody extends StatelessWidget {
  const HostSetupFoundBody({
    super.key,
    required this.candidates,
    required this.onClaim,
    required this.onNotMe,
  });

  final List<ClaimableOrganizer> candidates;
  final ValueChanged<ClaimableOrganizer> onClaim;
  final VoidCallback onNotMe;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(l10n.hostOnboardingFoundLead, tone: CatchTextTone.secondary),
        CatchSection(
          children: [
            for (final candidate in candidates)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-setup-found-${candidate.organizerId}',
                ),
                leading: CatchAvatar(
                  size: CatchAvatarSize.lg.extent,
                  name: candidate.prefill.name ?? '',
                  imageUrl: candidate.prefill.photoUrl,
                  variant: CatchAvatarVariant.square,
                ),
                title: candidate.prefill.name ?? candidate.organizerId,
                subtitle: [
                  ?candidate.prefill.cityName,
                  ?candidate.prefill.categoryLabel,
                ].join(' · '),
                body: [
                  if (candidate.claimPending) l10n.hostOnboardingFoundPending,
                  for (final source in candidate.sources)
                    hostSetupClaimSourceLabel(l10n, source),
                ].join(' · '),
                action: CatchIndexRowAction(
                  label: l10n.hostOnboardingFoundClaim,
                  onPressed: () => onClaim(candidate),
                ),
                onTap: () => onClaim(candidate),
              ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-setup-found-not-me'),
          label: l10n.hostOnboardingFoundNotMe,
          variant: CatchButtonVariant.secondary,
          onPressed: onNotMe,
          fullWidth: true,
        ),
      ],
    );
  }
}

/// The claim form for the page "This is me" picked: the claimant's name and
/// role. Catch's team reviews the claim before handing the page over.
class HostSetupClaimFormBody extends StatelessWidget {
  const HostSetupClaimFormBody({
    super.key,
    required this.organizer,
    required this.claimantName,
    required this.role,
    required this.onNameChanged,
    required this.onRoleChanged,
    this.sendError,
  });

  final ClaimableOrganizer organizer;
  final String claimantName;
  final OrganizerClaimRole? role;
  final ValueChanged<String> onNameChanged;
  final ValueChanged<OrganizerClaimRole> onRoleChanged;

  /// Why the last send failed.
  final String? sendError;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final sendError = this.sendError;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        if (organizer.prefill.name case final name?)
          CatchText(name, variant: CatchTextVariant.pageTitle),
        CatchText(l10n.hostOnboardingClaimLead, tone: CatchTextTone.secondary),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('host-setup-claim-name'),
            copy: copy,
            title: l10n.hostOnboardingClaimName,
            initialValue: claimantName,
            placeholder: l10n.hostOnboardingClaimNamePlaceholder,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.done,
            onChanged: onNameChanged,
          ),
        ),
        CatchStack(
          children: [
            CatchText(
              l10n.hostOnboardingClaimRole,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final option in OrganizerClaimRole.values)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-setup-claim-role-${option.name}',
                    ),
                    label: hostSetupClaimRoleLabel(l10n, option),
                    selected: role == option,
                    mode: CatchChipMode.single,
                    onPressed: () => onRoleChanged(option),
                  ),
              ],
            ),
          ],
        ),
        if (sendError != null) CatchText(sendError, tone: CatchTextTone.danger),
      ],
    );
  }
}

/// The claim is sent: what the page already has, what the host adds once it
/// is theirs, and the website's instant Instagram or Luma check.
class HostSetupClaimSentBody extends StatelessWidget {
  const HostSetupClaimSentBody({
    super.key,
    required this.organizer,
    required this.onVerify,
  });

  final ClaimableOrganizer organizer;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = organizer.prefill.name;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostOnboardingClaimSentTitle,
          variant: CatchTextVariant.pageTitle,
        ),
        if (name != null)
          CatchText(
            l10n.hostOnboardingClaimSentLead(name: name),
            tone: CatchTextTone.secondary,
          ),
        if (organizer.filled.isNotEmpty)
          CatchSection(
            title: l10n.hostOnboardingClaimHas,
            children: [
              CatchText(
                [
                  for (final field in organizer.filled)
                    hostSetupClaimFieldLabel(l10n, field),
                ].join(' · '),
                key: const ValueKey<String>('host-setup-claim-has'),
              ),
            ],
          ),
        if (organizer.missing.isNotEmpty)
          CatchSection(
            title: l10n.hostOnboardingClaimNeeds,
            children: [
              CatchText(
                [
                  for (final field in organizer.missing)
                    hostSetupClaimFieldLabel(l10n, field),
                ].join(' · '),
                key: const ValueKey<String>('host-setup-claim-needs'),
              ),
            ],
          ),
        CatchStack(
          children: [
            CatchButton(
              key: const ValueKey<String>('host-setup-claim-verify'),
              label: l10n.hostOnboardingClaimVerify,
              variant: CatchButtonVariant.secondary,
              onPressed: onVerify,
              fullWidth: true,
            ),
            CatchText(
              l10n.hostOnboardingClaimVerifyNote,
              variant: CatchTextVariant.bodyMeta,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ],
    );
  }
}

/// Why a page was found, in plain words.
String hostSetupClaimSourceLabel(
  AppLocalizations l10n,
  ClaimableOrganizerSource source,
) => switch (source) {
  ClaimableOrganizerSource.selfVerifiedSubmitter =>
    l10n.hostOnboardingFoundSourceSelfVerified,
  ClaimableOrganizerSource.salesCrmVerified =>
    l10n.hostOnboardingFoundSourceCrm,
  ClaimableOrganizerSource.publicPage =>
    l10n.hostOnboardingFoundSourcePublicPage,
  ClaimableOrganizerSource.staffEntered => l10n.hostOnboardingFoundSourceStaff,
};

String hostSetupClaimRoleLabel(
  AppLocalizations l10n,
  OrganizerClaimRole role,
) => switch (role) {
  OrganizerClaimRole.owner => l10n.hostOnboardingClaimRoleOwner,
  OrganizerClaimRole.founder => l10n.hostOnboardingClaimRoleFounder,
  OrganizerClaimRole.manager => l10n.hostOnboardingClaimRoleManager,
  OrganizerClaimRole.marketer => l10n.hostOnboardingClaimRoleMarketer,
  OrganizerClaimRole.venueManager => l10n.hostOnboardingClaimRoleVenueManager,
  OrganizerClaimRole.other => l10n.hostOnboardingClaimRoleOther,
};

String hostSetupClaimFieldLabel(
  AppLocalizations l10n,
  ClaimableOrganizerField field,
) => switch (field) {
  ClaimableOrganizerField.name => l10n.hostOnboardingClaimFieldName,
  ClaimableOrganizerField.description =>
    l10n.hostOnboardingClaimFieldDescription,
  ClaimableOrganizerField.city => l10n.hostOnboardingClaimFieldCity,
  ClaimableOrganizerField.organizerType =>
    l10n.hostOnboardingClaimFieldOrganizerType,
  ClaimableOrganizerField.photo => l10n.hostOnboardingClaimFieldPhoto,
  ClaimableOrganizerField.instagramHandle =>
    l10n.hostOnboardingClaimFieldInstagram,
};
