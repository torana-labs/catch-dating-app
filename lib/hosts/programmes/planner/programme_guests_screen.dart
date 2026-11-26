import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guest_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_desktop_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_planner_commands_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_answers_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The guest list (RbHostProgramGuests on a phone, RbHostProgramDesktop on
/// an expanded window): every household with its answer for each function.
///
/// It watches [hostProgrammeControllerProvider], keeps the filter, opens a
/// household and Import a list, and Share with the family mints the
/// family's view-only link (`/family/<token>`) and hands it to the share
/// sheet. For a live wedding it also reads the planner's work access
/// (`getProgramWorkAccess`) and, when a fresh read says this manager may
/// import phone contacts, offers Choose phone contacts, which opens the
/// guarded phone import route. Add a guest, the guest groups (New group,
/// change or delete one, with its hotel) and the answers of a guest with no
/// household write through the shared guest commands; an archived
/// programme reads only.
class HostProgrammeGuestsScreen extends ConsumerStatefulWidget {
  const HostProgrammeGuestsScreen({
    super.key,
    required this.programId,
    this.initialFilter = HostProgrammeGuestFilter.all,
  });

  final String programId;
  final HostProgrammeGuestFilter initialFilter;

  @override
  ConsumerState<HostProgrammeGuestsScreen> createState() =>
      _HostProgrammeGuestsScreenState();
}

class _HostProgrammeGuestsScreenState
    extends ConsumerState<HostProgrammeGuestsScreen> {
  late HostProgrammeGuestFilter _filter = widget.initialFilter;

  Future<void> _shareWithFamily(String? title) async {
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    try {
      final link = await ref
          .read(hostProgrammePlannerCommandsProvider.notifier)
          .issueWebLink(
            programId: widget.programId,
            kind: ProgramWebLinkKind.family,
            subjectId: widget.programId,
          );
      final url = AppConfig.publicSiteUrl.resolve(
        '/family/${Uri.encodeComponent(link.token)}',
      );
      // A share sheet for a screen that is gone helps nobody; the link stays
      // issued and the next send shares it again.
      if (!mounted) return;
      await ref
          .read(externalShareControllerProvider)
          .shareText(
            text: url.toString(),
            subject: l10n.hostProgrammeFamilyLinkSubject(
              programme: title ?? '',
            ),
            origin: origin,
          );
    } on Object {
      if (mounted) {
        showCatchNotice(
          context,
          l10n.hostProgrammeFamilySendFailed,
          tone: CatchNoticeTone.danger,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final programId = widget.programId;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: Builder(
        builder: (context) {
          final l10n = context.l10n;
          final expanded =
              CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
          final state = ref.watch(hostProgrammeControllerProvider(programId));
          final program = state.program;
          void openHousehold(HostProgrammeHousehold household) =>
              openHostProgrammePage(
                context,
                programId,
                HostProgrammePage.household,
                id: household.id,
              );
          void import() => context.pushNamed(
            Routes.hostProgramImportScreen.name,
            pathParameters: {'programId': programId},
          );
          final wedding =
              program != null &&
              program.kind == ProgramKind.wedding &&
              program.status != ProgramStatus.archived;
          final access = wedding
              ? ref.watch(programWorkEntryProvider(programId, null))
              : null;
          final phoneImport =
              access != null &&
              hostProgrammeCanImportPhoneContacts(
                access,
                program!,
                ref.watch(appClockProvider).now(),
              );
          final phoneImportError = switch (access) {
            AsyncValue(isLoading: false, :final error?)
                when error is! PermissionException &&
                    error is! SignInRequiredException &&
                    error is! DocumentNotFoundException =>
              appErrorMessage(
                error,
                l10n: l10n,
                context: AppErrorContext.event,
              ),
            _ => null,
          };
          void retryAccess() =>
              ref.invalidate(programWorkEntryProvider(programId, null));
          void importContacts() => context.pushNamed(
            Routes.hostWorkPhoneImportScreen.name,
            pathParameters: {'programId': programId},
          );
          final page = state.guests;
          final groups =
              ref.watch(programGuestGroupListProvider(programId)).value ??
              page?.groups ??
              const <ProgramGuestGroupRow>[];
          final households =
              ref.watch(programHouseholdListProvider(programId)).value ??
              page?.households ??
              const <ProgramHouseholdRow>[];
          final archived = program?.status == ProgramStatus.archived;
          void addGuest() => unawaited(
            addHostProgrammeGuest(
              context,
              ref,
              programId: programId,
              households: households,
              groups: groups,
            ),
          );
          void editGroup(ProgramGuestGroupRow? group) => unawaited(
            editHostProgrammeGroup(
              context,
              ref,
              programId: programId,
              hotels: state.detail?.hotels ?? const <ProgramHotel>[],
              group: group,
            ),
          );
          void editGuest(ProgramGuestRow guest) => unawaited(
            editHostProgrammeAnswers(
              context,
              ref,
              programId: programId,
              guest: guest,
              answers: [
                for (final function in state.functions)
                  HostProgrammeAnswer(
                    functionId: function.functionId,
                    name: function.name,
                    reply: state.reply(guest, function),
                  ),
              ],
            ),
          );
          void retry() {
            refreshHostProgramme(ref, programId);
            if (wedding) retryAccess();
          }

          void view(view) => openHostProgrammeView(context, programId, view);
          if (expanded) {
            final days = state.daysToGo(ref.watch(appClockProvider).now());
            return CatchScreen(
              key: const ValueKey<String>('host-programme-guests-screen'),
              bodyScrolls: false,
              topBar: CatchTopBar(
                variant: CatchTopBarVariant.tabHome,
                kicker: program == null
                    ? null
                    : [
                        hostProgrammeDates(l10n, program),
                        if (days != null && days >= 0)
                          l10n.hostProgrammeDaysToGo(count: days),
                      ].join(' · '),
                title: program?.title,
                actions: [
                  if (!archived)
                    CatchButton(
                      key: const ValueKey<String>('host-programme-guests-add'),
                      label: l10n.programsGuestsAddGuest,
                      variant: CatchButtonVariant.secondary,
                      onPressed: addGuest,
                    ),
                  if (phoneImport)
                    CatchButton(
                      key: const ValueKey<String>(
                        'program-guests-phone-import',
                      ),
                      label: l10n.phoneImportChooseContacts,
                      variant: CatchButtonVariant.secondary,
                      onPressed: importContacts,
                    ),
                  CatchButton(
                    label: l10n.hostProgrammeShareFamily,
                    variant: CatchButtonVariant.secondary,
                    onPressed: () => _shareWithFamily(program?.title),
                  ),
                  CatchButton(
                    label: l10n.hostProgrammeAddGuests,
                    leading: CatchIcon(CatchIcons.add),
                    onPressed: import,
                  ),
                ],
              ),
              body: HostProgrammeGuestsDesktopBody(
                state: state,
                filter: _filter,
                onView: view,
                onFilter: (filter) => setState(() => _filter = filter),
                onOpenHousehold: openHousehold,
                onRetry: retry,
                groups: groups,
                onEditGuest: archived ? null : editGuest,
                onEditGroup: archived ? null : editGroup,
              ),
            );
          }
          return CatchScreen(
            key: const ValueKey<String>('host-programme-guests-screen'),
            topBar: CatchTopBar(
              variant: CatchTopBarVariant.tool,
              back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
              title: program?.title,
            ),
            body: HostProgrammeGuestsBody(
              state: state,
              filter: _filter,
              onView: view,
              onFilter: (filter) => setState(() => _filter = filter),
              onImport: import,
              onOpenHousehold: openHousehold,
              onRetry: retry,
              onPhoneImport: phoneImport ? importContacts : null,
              phoneImportFailure: phoneImportError,
              onRetryPhoneImport: retryAccess,
              groups: groups,
              onAddGuest: archived ? null : addGuest,
              onEditGuest: archived ? null : editGuest,
              onEditGroup: archived ? null : editGroup,
            ),
          );
        },
      ),
    );
  }
}

/// Whether a fresh, uncached work-access read lets this manager import
/// phone contacts into [program]: the read must be settled (not loading or
/// refreshing), name the same programme and organizer, and pass
/// [canImportWeddingPhoneContacts]. Staff use their own Work route.
bool hostProgrammeCanImportPhoneContacts(
  AsyncValue<ProgramReadView<ProgramWorkAccess>> read,
  OrganizerProgramSettings program,
  DateTime now,
) {
  if (read.isLoading || read.hasError || !read.hasValue) return false;
  final view = read.requireValue;
  final access = view.value;
  return view.snapshotAt == null &&
      access.programId == program.programId &&
      access.organizerId == program.organizerId &&
      access.isManager &&
      canImportWeddingPhoneContacts(access, now);
}
