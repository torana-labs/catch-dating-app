import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/domain/phone_contact.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_guest_section.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/widgets/phone_import_saved_review_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Shared review view. Without a canonical submission controller this remains
/// an explicitly labelled demo with sharing permanently disabled.
class PhoneImportReviewScreen extends StatelessWidget {
  const PhoneImportReviewScreen({
    super.key,
    required this.controller,
    required this.weddingName,
    this.submission,
    this.onReloadSaved,
  });

  final PhoneImportController controller;
  final String weddingName;
  final PhoneImportSubmissionController? submission;
  final VoidCallback? onReloadSaved;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: Listenable.merge([controller, ?submission]),
    builder: (context, _) {
      final entries = controller.entries;
      final tokens = CatchTokens.of(context);
      final sharedPhones = controller.sharedPhones;
      final live = submission;
      final frozen =
          live?.batch != null &&
          {
            PhoneImportSubmissionPhase.sharing,
            PhoneImportSubmissionPhase.retry,
            PhoneImportSubmissionPhase.completed,
          }.contains(live?.phase);
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.phoneImportTitle,
          navigation: live == null
              ? const CatchTopBarNavigation(
                  mode: CatchTopBarNavigationMode.none,
                )
              : const CatchTopBarNavigation(
                  mode: CatchTopBarNavigationMode.back,
                ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardConstrained(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (live == null)
                CatchBanner(
                  title: context.l10n.phoneImportDemoTitle,
                  message: context.l10n.phoneImportDemoMessage,
                  icon: CatchIcons.info,
                  tone: CatchBannerTone.warning,
                )
              else
                CatchBanner(
                  key: const ValueKey('phone-import-status'),
                  title: switch (live.phase) {
                    PhoneImportSubmissionPhase.completed =>
                      context.l10n.phoneImportCompletedTitle,
                    PhoneImportSubmissionPhase.retry =>
                      context.l10n.phoneImportRetryTitle,
                    PhoneImportSubmissionPhase.ready =>
                      context.l10n.phoneImportReadyTitle,
                    PhoneImportSubmissionPhase.sharing =>
                      context.l10n.phoneImportSharingTitle,
                    PhoneImportSubmissionPhase.recovery =>
                      context.l10n.phoneImportRecoveryTitle,
                    _ => context.l10n.phoneImportPrivacyTitle,
                  },
                  message: switch (live.phase) {
                    PhoneImportSubmissionPhase.completed =>
                      context.l10n.phoneImportCompletedMessage(
                        wedding: weddingName,
                      ),
                    PhoneImportSubmissionPhase.retry =>
                      context.l10n.phoneImportRetryMessage,
                    PhoneImportSubmissionPhase.recovery =>
                      context.l10n.phoneImportRecoveryMessage,
                    PhoneImportSubmissionPhase.sharing =>
                      context.l10n.phoneImportSharingMessage,
                    _ => context.l10n.phoneImportPrivacyMessage,
                  },
                  icon: CatchIcons.info,
                  tone: live.phase == PhoneImportSubmissionPhase.completed
                      ? CatchBannerTone.success
                      : CatchBannerTone.neutral,
                ),
              if (live?.error case final error?) ...[
                gapH12,
                CatchBanner(
                  key: const ValueKey('phone-import-error'),
                  message: appErrorMessage(
                    error,
                    l10n: context.l10n,
                    context: AppErrorContext.event,
                  ),
                  icon: CatchIcons.info,
                  tone: CatchBannerTone.warning,
                ),
              ],
              if (live?.result case final result?)
                for (final issue in result.rowErrors) ...[
                  gapH8,
                  CatchBanner(
                    message: context.l10n.phoneImportGuestIssue(
                      number: issue.index + 1,
                      message: issue.message,
                    ),
                    icon: CatchIcons.info,
                    tone: CatchBannerTone.warning,
                  ),
                ],
              gapH24,
              CatchSection.contained(
                title: weddingName,
                subtitle: context.l10n.phoneImportProgramCollaborators,
                child: CatchText(
                  context.l10n.phoneImportChooseMessage,
                  variant: CatchTextVariant.bodyM,
                  color: CatchTokens.of(context).ink,
                ),
              ),
              gapH24,
              if (!frozen)
                CatchSection.plain(
                  title: context.l10n.phoneImportSelectGuests,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchButton(
                        key: const ValueKey('phone-import-pick'),
                        label: entries.isEmpty
                            ? context.l10n.phoneImportChooseContacts
                            : context.l10n.phoneImportAddContacts,
                        onPressed: controller.interactionLocked
                            ? null
                            : controller.pickContacts,
                        status: controller.picking
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        fullWidth: true,
                      ),
                      gapH12,
                      CatchText(
                        context.l10n.phoneImportPickerHelp,
                        variant: CatchTextVariant.supporting,
                        color: tokens.ink2,
                      ),
                      if (controller.notice case final notice?) ...[
                        gapH12,
                        Semantics(
                          liveRegion: true,
                          child: CatchBanner(
                            key: const ValueKey('phone-import-notice'),
                            message: switch (notice) {
                              PhoneImportNotice.cancelled =>
                                context.l10n.phoneImportCancelled,
                              PhoneImportNotice.denied =>
                                context.l10n.phoneImportDenied,
                              PhoneImportNotice.unavailable =>
                                context.l10n.phoneImportPickerUnavailable,
                              PhoneImportNotice.failed =>
                                context.l10n.phoneImportPickerFailed,
                              PhoneImportNotice.tooMany =>
                                context.l10n.phoneImportPickerLimit,
                              PhoneImportNotice.reviewLimit =>
                                context.l10n.phoneImportReviewLimit,
                              PhoneImportNotice.empty =>
                                context.l10n.phoneImportEmptySelection,
                            },
                            icon: CatchIcons.info,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              gapH24,
              if (frozen)
                PhoneImportSavedReviewSection(batch: live!.batch!)
              else if (entries.isEmpty)
                CatchEmptyState(
                  icon: CatchIcons.peopleOutline,
                  title: context.l10n.phoneImportEmptyTitle,
                  message: context.l10n.phoneImportEmptyMessage,
                )
              else ...[
                Semantics(
                  liveRegion: true,
                  child: CatchText(
                    context.l10n.phoneImportReviewCount(count: entries.length),
                    variant: CatchTextVariant.sectionTitle,
                  ),
                ),
                if (sharedPhones.isNotEmpty) ...[
                  gapH12,
                  CatchBanner(
                    key: const ValueKey('phone-import-shared-phones'),
                    message: context.l10n.phoneImportSharedNumber,
                    icon: CatchIcons.info,
                    tone: CatchBannerTone.warning,
                  ),
                ],
                gapH16,
                for (final (index, entry) in entries.indexed) ...[
                  PhoneImportGuestSection(
                    key: ValueKey(entry.id),
                    entry: entry,
                    guestNumber: index + 1,
                    busy: controller.interactionLocked,
                    sharedPhone:
                        entry.selectedPhone != null &&
                        sharedPhones.contains(
                          phoneSelectionKey(
                            entry.phoneForImport ?? entry.selectedPhone!,
                          ),
                        ),
                    onRename: (value) => controller.rename(entry.id, value),
                    onChoosePhone: (value) =>
                        controller.choosePhone(entry.id, value),
                    onInternationalPhoneChanged: (value) =>
                        controller.reviewInternationalPhone(entry.id, value),
                    onFamilySideChanged: (value) =>
                        controller.assignFamilySide(entry.id, value),
                    onHouseholdChanged: (value) =>
                        controller.assignHousehold(entry.id, value),
                    onRemove: () => controller.remove(entry.id),
                  ),
                  gapH24,
                ],
              ],
              if (!frozen)
                CatchButton(
                  key: const ValueKey('phone-import-add-member'),
                  label: context.l10n.phoneImportAddMember,
                  variant: CatchButtonVariant.secondary,
                  onPressed:
                      controller.interactionLocked || entries.length >= 100
                      ? null
                      : () => controller.addHouseholdMember(name: ''),
                  fullWidth: true,
                ),
              gapH24,
              if (!frozen)
                CatchSection.contained(
                  title: context.l10n.phoneImportReviewSharing,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Material(
                        type: MaterialType.transparency,
                        child: CheckboxListTile.adaptive(
                          key: const ValueKey('phone-import-sharing'),
                          contentPadding: EdgeInsets.zero,
                          controlAffinity: ListTileControlAffinity.leading,
                          value: controller.sharingConfirmed,
                          onChanged:
                              entries.isEmpty || controller.interactionLocked
                              ? null
                              : (value) =>
                                    controller.confirmSharing(value ?? false),
                          title: CatchText(
                            context.l10n.phoneImportConsent(
                              wedding: weddingName,
                            ),
                            variant: CatchTextVariant.bodyM,
                            color: CatchTokens.of(context).ink,
                          ),
                        ),
                      ),
                      gapH12,
                      CatchText(
                        context.l10n.phoneImportNoOwnership,
                        variant: CatchTextVariant.supporting,
                        color: tokens.ink2,
                      ),
                      if (entries.isNotEmpty &&
                          entries.any((entry) => !entry.valid)) ...[
                        gapH12,
                        CatchBanner(
                          key: const ValueKey('phone-import-needs-review'),
                          message: context.l10n.phoneImportNeedsReview,
                          icon: CatchIcons.info,
                          tone: CatchBannerTone.warning,
                        ),
                      ],
                      gapH16,
                      if (live != null) ...[
                        CatchButton(
                          key: const ValueKey('phone-import-preview'),
                          label: context.l10n.phoneImportPreview,
                          variant: CatchButtonVariant.secondary,
                          onPressed: live.canPreview ? live.preview : null,
                          status:
                              live.phase ==
                                  PhoneImportSubmissionPhase.previewing
                              ? CatchButtonStatus.loading
                              : CatchButtonStatus.idle,
                          fullWidth: true,
                        ),
                        gapH12,
                      ],
                      CatchButton(
                        key: const ValueKey('phone-import-share'),
                        label: context.l10n.phoneImportShare,
                        onPressed: live?.canShare == true ? live!.share : null,
                        fullWidth: true,
                      ),
                      if (live == null) ...[
                        gapH8,
                        CatchText(
                          context.l10n.phoneImportUnavailable,
                          variant: CatchTextVariant.supporting,
                          color: tokens.ink2,
                        ),
                      ],
                    ],
                  ),
                ),
              if (!frozen && entries.isNotEmpty) ...[
                gapH16,
                CatchButton(
                  key: const ValueKey('phone-import-discard'),
                  label: context.l10n.phoneImportDiscard,
                  variant: CatchButtonVariant.ghost,
                  onPressed: controller.interactionLocked
                      ? null
                      : controller.discard,
                ),
              ],
              if (live?.phase == PhoneImportSubmissionPhase.recovery) ...[
                gapH16,
                CatchButton(
                  label: context.l10n.phoneImportReload,
                  onPressed: onReloadSaved,
                  fullWidth: true,
                ),
              ],
              if (live?.canRetry == true) ...[
                gapH16,
                CatchButton(
                  key: const ValueKey('phone-import-retry'),
                  label: context.l10n.phoneImportRetry,
                  onPressed: live!.retry,
                  fullWidth: true,
                ),
                gapH8,
                CatchButton(
                  key: const ValueKey('phone-import-dismiss'),
                  label: context.l10n.phoneImportDismiss,
                  variant: CatchButtonVariant.ghost,
                  onPressed: () => _dismissSaved(context, live),
                ),
              ],
            ],
          ),
        ),
      );
    },
  );

  Future<void> _dismissSaved(
    BuildContext context,
    PhoneImportSubmissionController live,
  ) async {
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(context.l10n),
      title: context.l10n.phoneImportDismissTitle,
      message: context.l10n.phoneImportDismissMessage,
      confirmLabel: context.l10n.phoneImportDismiss,
      danger: true,
    );
    if (confirmed == true) await live.dismissPending();
  }
}
