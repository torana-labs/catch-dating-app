import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/hosts/create/create_policy_handlers.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';

/// The admission fields' changes, shared by the create and edit
/// controllers: each edits the draft through [edit] and marks
/// [policyTouched]. Nothing here saves.
mixin CreatePolicyFields {
  /// An admission field changed in this session.
  bool policyTouched = false;

  /// Applies [change] to the draft.
  void edit(EventDraft Function(EventDraft draft) change);

  /// Applies an admission field's [change] and marks [policyTouched].
  void editPolicy(EventDraft Function(EventDraft draft) change) {
    policyTouched = true;
    edit(change);
  }

  /// Who can book; see [editDraftWithAdmission].
  void setAdmission(EventAdmissionPreset preset) =>
      editPolicy((draft) => editDraftWithAdmission(draft, preset));

  void setCohortCaps(bool on) =>
      editPolicy((draft) => editDraftWithCohortCaps(draft, on));

  void setDemandPricing(bool on) =>
      editPolicy((draft) => editDraftWithDemandPricing(draft, on));

  void setAgeRange(int minAge, int maxAge) =>
      editPolicy((draft) => editDraftWithAgeRange(draft, minAge, maxAge));

  void setCancellationPolicy(EventCancellationPolicyId id) =>
      editPolicy((draft) => draft.copyWith(cancellationPolicy: id.name));

  /// The callbacks the admission fields take, for the screen to hand on.
  CreatePolicyHandlers get policyHandlers => CreatePolicyHandlers(
    onAdmission: setAdmission,
    onInviteCode: (value) =>
        editPolicy((draft) => draft.copyWith(inviteCode: value)),
    onCohortCaps: setCohortCaps,
    onMaxMen: (value) => editPolicy((draft) => draft.copyWith(maxMen: value)),
    onMaxWomen: (value) =>
        editPolicy((draft) => draft.copyWith(maxWomen: value)),
    onDemandPricing: setDemandPricing,
    onDemandStep: (value) =>
        editPolicy((draft) => draft.copyWith(dynamicPricingStep: value)),
    onDemandMax: (value) =>
        editPolicy((draft) => draft.copyWith(dynamicPricingMax: value)),
    onAgeRange: setAgeRange,
    onCancellationPolicy: setCancellationPolicy,
  );
}
