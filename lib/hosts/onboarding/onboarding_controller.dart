import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_platform/cache/app_clock.dart';
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

  void logoPicked() => state = state.copyWith(hasLogo: true);

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
