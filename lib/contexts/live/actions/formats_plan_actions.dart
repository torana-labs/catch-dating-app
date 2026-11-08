import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_plan_actions.g.dart';

/// The two plan writes the formats screens make that the live guide's
/// controller has no method for: the court setup and the first-hello
/// switch. Both are the guide's own plan save, fenced on the plan's last
/// update; neither is a new backend command.
///
/// Every other formats action runs through the existing controllers:
/// rotations, pods, the reveal and the grouping rules through
/// `EventSuccessController`, runner moves through
/// `EventAssistanceMembershipController` and the crawl message through
/// `HostComposeCommands`.
@riverpod
class HostFormatsCommands extends _$HostFormatsCommands {
  static final saveCourtsMutation = Mutation<void>();
  static final openersMutation = Mutation<void>();

  @override
  void build() {}

  /// Saves the courts, the minutes a game and the aim as the plan's
  /// structure.
  Future<void> saveCourts(
    EventSuccessPlan plan,
    EventSuccessStructureConfig structure,
  ) async {
    requireSignedInUid(ref, action: 'save the court rotations');
    await ref
        .read(eventSuccessRepositoryProvider)
        .savePlan(
          plan.copyWith(structureConfig: structure),
          expectedUpdatedAt: plan.updatedAt,
        );
  }

  /// Turns the first hello on every phone on or off.
  Future<void> setOpeners(EventSuccessPlan plan, {required bool on}) async {
    requireSignedInUid(ref, action: 'change the first hello');
    await ref
        .read(eventSuccessRepositoryProvider)
        .savePlan(
          plan.copyWith(contextualOpenersEnabled: on),
          expectedUpdatedAt: plan.updatedAt,
        );
  }
}
