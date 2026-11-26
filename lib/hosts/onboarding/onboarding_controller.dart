import 'package:catch_dating_app/contexts/organizers/data/organizer_claims_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_signup_source.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'onboarding_controller.g.dart';

/// Organiser setup's step state over the create-organizer draft.
///
/// It holds what the host has typed and where they are. The commands stay
/// with their owners: the screens run `CreateOrganizerController` to create
/// the page, `CreateOrganizerDraftController` to keep the draft, and the
/// Razorpay connection controller for payouts, then report back here.
@riverpod
class HostSetupController extends _$HostSetupController {
  @override
  HostSetupState build() => HostSetupState(draft: _emptyDraft());

  OrganizerDraft _emptyDraft() =>
      OrganizerDraft(savedAt: ref.read(appClockProvider).now());

  /// Fills an empty setup from a saved draft; typing already done wins.
  void restore(OrganizerDraft draft) {
    if (state.step != HostSetupStep.start || !state.draft.isEmpty) return;
    state = state.copyWith(draft: draft);
  }

  void setName(String value) => _edit(state.draft.copyWith(name: value));

  void setArea(String value) => _edit(state.draft.copyWith(area: value));

  void setCity(String marketId) =>
      _edit(state.draft.copyWith(location: marketId));

  void setDescription(String value) =>
      _edit(state.draft.copyWith(description: value));

  void toggleFormat(HostSetupFormat format) {
    final formats = {...state.formats};
    if (!formats.remove(format)) formats.add(format);
    _edit(
      state.draft.copyWith(
        hostDefaults: hostSetupDefaultsFor(state.draft.hostDefaults, formats),
      ),
    );
  }

  /// How they heard about Catch, in one tap; null is Skip, and nothing is
  /// saved for it.
  void setSignupSource(OrganizerSignupSource? source) =>
      _edit(state.draft.copyWith(signupSource: source));

  void logoPicked() => state = state.copyWith(hasLogo: true);

  /// "This is me" on a found page: the claim form, or straight to review
  /// when a claim for it is already waiting.
  void chooseClaim(ClaimableOrganizer organizer) {
    if (state.organizerId != null) return;
    state = state.copyWith(
      claim: HostSetupClaim(
        organizer: organizer,
        claimantName: state.claim.claimantName,
        role: state.claim.role,
      ),
    );
  }

  void setClaimantName(String value) => _editClaim(
    (claim) => HostSetupClaim(
      organizer: claim.organizer,
      claimantName: value,
      role: claim.role,
    ),
  );

  void setClaimRole(OrganizerClaimRole role) => _editClaim(
    (claim) => HostSetupClaim(
      organizer: claim.organizer,
      claimantName: claim.claimantName,
      role: role,
    ),
  );

  /// Back from the claim form to the found pages.
  void cancelClaim() => _editClaim(
    (claim) =>
        HostSetupClaim(claimantName: claim.claimantName, role: claim.role),
  );

  /// The claim is sent and waits for review.
  void claimSent(String requestId) => _editClaim(
    (claim) => HostSetupClaim(
      organizer: claim.organizer,
      claimantName: claim.claimantName,
      role: claim.role,
      requestId: requestId,
    ),
  );

  /// "Not me": setup starts a new page, as when nothing was found.
  void dismissClaim() =>
      state = state.copyWith(claim: const HostSetupClaim(dismissed: true));

  void _editClaim(HostSetupClaim Function(HostSetupClaim) edit) {
    if (state.organizerId != null || state.claim.requestId != null) return;
    state = state.copyWith(claim: edit(state.claim));
  }

  /// Start to Details once name and where are filled in.
  void next() {
    if (state.step == HostSetupStep.start && state.startComplete) {
      state = state.copyWith(step: HostSetupStep.details);
    }
  }

  /// Details back to Start; once the page exists there is no going back.
  void back() {
    if (state.step == HostSetupStep.details) {
      state = state.copyWith(step: HostSetupStep.start);
    }
  }

  /// The page exists: payouts come next.
  void created(String organizerId) => state = state.copyWith(
    organizerId: organizerId,
    step: HostSetupStep.payments,
  );

  /// Finish or Skip for now on payouts.
  void finish() {
    if (state.organizerId != null) {
      state = state.copyWith(step: HostSetupStep.done);
    }
  }

  void _edit(OrganizerDraft draft) {
    if (state.organizerId != null) return;
    state = state.copyWith(
      draft: draft.copyWith(savedAt: ref.read(appClockProvider).now()),
    );
  }
}

/// The pages Catch found for the signed-in person's number. A failed read
/// counts as nothing found: setup starts a new page, as it did before.
@riverpod
Future<ClaimableOrganizers> hostClaimableOrganizers(Ref ref) async {
  try {
    return await ref
        .watch(organizerClaimsRepositoryProvider)
        .findClaimableOrganizers();
  } on Object {
    return ClaimableOrganizers.none;
  }
}

/// **Pattern A: Action controller + static Mutations**
///
/// Sends the claim for a found page. [requestMutation] tracks it; the claim
/// form watches it for the pending state and the error.
@riverpod
class HostOrganizerClaimController extends _$HostOrganizerClaimController {
  static final requestMutation = Mutation<String>();

  @override
  void build() {}

  Future<String> request({
    required String organizerId,
    required String claimantName,
    required OrganizerClaimRole role,
  }) => ref
      .read(organizerClaimsRepositoryProvider)
      .requestClaim(
        organizerId: organizerId,
        requesterName: claimantName,
        role: role,
      );
}
