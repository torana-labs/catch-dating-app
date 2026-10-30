import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Progressive actions for one already-saved canonical event.
///
/// A missing callback leaves an unavailable capability inert. The create
/// receipt alone never implies that registration, payment or publication is
/// enabled.
class PrivateEventSetupScreen extends StatelessWidget {
  const PrivateEventSetupScreen({
    super.key,
    required this.organizer,
    required this.receipt,
    required this.name,
    required this.date,
    required this.start,
    required this.cityLabel,
    this.pendingRosterFileName,
    this.readOnly = false,
    this.publicationState = 'private',
    required this.onClose,
    this.onReturnToResponses,
    this.onLinkForm,
    this.onEditBasics,
    this.onEditDetails,
    this.onImportGuests,
    this.onSetupRegistration,
    this.onEditPayments,
    this.onSetupPublicListing,
    this.onSetupGuide,
  });

  final Organizer organizer;
  final PrivateEventCreateReceipt receipt;
  final String name;
  final DateTime date;
  final TimeOfDay start;
  final String cityLabel;
  final String? pendingRosterFileName;
  final bool readOnly;
  final String publicationState;
  final VoidCallback onClose;
  final VoidCallback? onReturnToResponses;
  final VoidCallback? onLinkForm;
  final VoidCallback? onEditBasics;
  final VoidCallback? onEditDetails;
  final VoidCallback? onImportGuests;
  final VoidCallback? onSetupRegistration;
  final VoidCallback? onEditPayments;
  final VoidCallback? onSetupPublicListing;
  final VoidCallback? onSetupGuide;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final copy = catchFieldCopy(context.l10n);
    return CatchScaffold.stepFlow(
      backgroundColor: t.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchStepHeader(
            title: name,
            subtitle: organizer.name,
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            onBack: onClose,
            leadingType: CatchTopBarNavigationMode.back,
          ),
          Expanded(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: CatchLayout.hostCreateEventFormLaneMaxWidth,
                ),
                child: ListView(
                  padding: CatchInsets.formStepBodyWithBottomActions,
                  children: [
                    CatchSectionList(
                      emptyStateOmitted: true,
                      children: [
                        CatchSection.fieldRows(
                          first: true,
                          title: context.l10n.hostsPrivateEventSavedTitle,
                          children: [
                            CatchField.read(
                              copy: copy,
                              title: name,
                              body:
                                  '${MaterialLocalizations.of(context).formatMediumDate(date)} · ${start.format(context)} · $cityLabel',
                              icon: CatchIcons.eventConfirmed,
                            ),
                            CatchField.read(
                              copy: copy,
                              title: publicationState == 'published'
                                  ? context
                                        .l10n
                                        .hostsEditHostedEventScreenTitlePublishedEvent
                                  : context.l10n.hostsPrivateEventPrivateTitle,
                              body: publicationState == 'published'
                                  ? context.l10n.hostsPublicationPublishedBody
                                  : context.l10n.hostsPrivateEventPrivateBody,
                              icon: CatchIcons.locked,
                            ),
                          ],
                        ),
                        if (readOnly)
                          CatchSection.fieldRows(
                            children: [
                              CatchField.read(
                                copy: copy,
                                title:
                                    context.l10n.hostsPrivateEventHistoryTitle,
                                body: context.l10n.hostsPrivateEventHistoryBody,
                              ),
                            ],
                          ),
                        if (readOnly && publicationState == 'published')
                          CatchSection.fieldRows(
                            children: [
                              CatchField.action(
                                copy: copy,
                                title:
                                    context.l10n.hostsPrivateEventPublicListing,
                                onTap: onSetupPublicListing,
                              ),
                            ],
                          ),
                        if (!readOnly)
                          CatchSection.fieldRows(
                            title: context.l10n.hostsPrivateEventSetupHeading,
                            children: [
                              if (pendingRosterFileName != null)
                                CatchField.read(
                                  copy: copy,
                                  title: context
                                      .l10n
                                      .hostsPrivateEventPendingRoster,
                                  body: context.l10n
                                      .hostsPrivateEventPendingRosterBody(
                                        fileName: pendingRosterFileName!,
                                      ),
                                  icon: CatchIcons.upload,
                                ),
                              if (onReturnToResponses != null)
                                CatchField.action(
                                  copy: copy,
                                  title: context
                                      .l10n
                                      .hostsPrivateEventReturnResponses,
                                  body: context
                                      .l10n
                                      .hostsPrivateEventReturnResponsesBody,
                                  icon: CatchIcons.back,
                                  onTap: onReturnToResponses,
                                ),
                              CatchField.action(
                                copy: copy,
                                title: context.l10n.hostsPrivateEventLinkForm,
                                body: onLinkForm == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventLinkFormUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventLinkFormBody,
                                icon: CatchIcons.document,
                                onTap: onLinkForm,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: context.l10n.hostsPrivateEventEditBasics,
                                body: onEditBasics == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventEditBasicsUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventEditBasicsBody,
                                icon: CatchIcons.note,
                                onTap: onEditBasics,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: context.l10n.hostsPrivateEventDetails,
                                body: onEditDetails == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventDetailsUnavailable
                                    : context.l10n.hostsPrivateEventDetailsBody,
                                icon: CatchIcons.eventConfirmed,
                                onTap: onEditDetails,
                              ),
                              CatchField.action(
                                copy: copy,
                                title:
                                    context.l10n.hostsPrivateEventImportGuests,
                                body: onImportGuests == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventImportGuestsUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventImportGuestsBody,
                                icon: CatchIcons.upload,
                                onTap: onImportGuests,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: context
                                    .l10n
                                    .hostsPrivateEventCatchRegistration,
                                body: onSetupRegistration == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventCatchRegistrationUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventCatchRegistrationBody,
                                icon: CatchIcons.checkIn,
                                onTap: onSetupRegistration,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: context.l10n.hostsPrivateEventPayments,
                                body: onEditPayments == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventPaymentsUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventPaymentsBody,
                                icon: CatchIcons.payment,
                                onTap: onEditPayments,
                              ),
                              CatchField.action(
                                copy: copy,
                                title:
                                    context.l10n.hostsPrivateEventPublicListing,
                                body: onSetupPublicListing == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventPublicListingUnavailable
                                    : context
                                          .l10n
                                          .hostsPrivateEventPublicListingBody,
                                icon: CatchIcons.web,
                                onTap: onSetupPublicListing,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: context.l10n.hostsPrivateEventGuide,
                                body: onSetupGuide == null
                                    ? context
                                          .l10n
                                          .hostsPrivateEventGuideUnavailable
                                    : context.l10n.hostsPrivateEventGuideBody,
                                icon: CatchIcons.map,
                                onTap: onSetupGuide,
                              ),
                            ],
                          ),
                      ],
                    ),
                    if (!readOnly) gapH4,
                    if (!readOnly)
                      CatchText(
                        context.l10n.hostsPrivateEventRosterNote,
                        variant: CatchTextVariant.bodyM,
                        color: t.ink2,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
