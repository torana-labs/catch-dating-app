import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/response_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One answer in board order: the person and where they stand, their
/// answers, the payment taken with it, and the team note.
class HostResponseBody extends StatelessWidget {
  const HostResponseBody({
    super.key,
    required this.state,
    required this.note,
    required this.onOpenFile,
  });

  final HostResponseState state;

  /// The team note; the screen owns it and sends it with a review.
  final TextEditingController note;
  final ValueChanged<HostFormAssetDownload> onOpenFile;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status == HostResponseStatus.loading) {
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        gap: CatchPageBodyGap.tight,
        children: [
          CatchSkeleton.content(
            child: CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g16,
              align: CatchStackAlign.center,
              children: [
                CatchAvatar.system(size: CatchAvatarSize.xl),
                CatchText(l10n.hostFormsAnonymous),
              ],
            ),
          ),
        ],
      );
    }
    final name = state.name ?? l10n.hostFormsAnonymous;
    final review = state.review;
    final badge = review != null
        ? CatchBadge(
            label: hostFormReviewText(l10n, review),
            tone: hostFormReviewTone(review),
          )
        : state.withdrawn
        ? CatchBadge(
            label: hostFormReviewText(
              l10n,
              HostApplicationReviewStatus.withdrawn,
            ),
          )
        : null;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g16,
          align: CatchStackAlign.center,
          children: [
            CatchAvatar.system(
              size: CatchAvatarSize.xl,
              name: state.name ?? '',
            ),
            Expanded(
              child: CatchStack(
                gap: CatchStackGap.g6,
                children: [
                  if (badge != null)
                    CatchStack(
                      direction: CatchStackDirection.row,
                      children: [badge],
                    ),
                  CatchText(name, variant: CatchTextVariant.titleBar),
                  if (state.facts.isNotEmpty)
                    CatchText(
                      state.facts.join(' · '),
                      variant: CatchTextVariant.bodySmall,
                      tone: CatchTextTone.secondary,
                    ),
                ],
              ),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostFormsResponseAnswers,
          empty: l10n.hostFormsResponseNoAnswers,
          children: [
            for (final answer in state.answers)
              CatchIndexRow(
                title: answer.question,
                titleMaxLines: 3,
                body: answer.answer ?? l10n.hostFormsResponseBlank,
                onTap: null,
                density: CatchIndexRowSize.compact,
                action: answer.files.isEmpty
                    ? null
                    : CatchIndexRowAction(
                        label: l10n.hostFormsResponseOpenFile,
                        onPressed: () => onOpenFile(answer.files.first),
                      ),
              ),
          ],
        ),
        if (state.payment case final payment?)
          CatchSection(
            title: l10n.hostFormsResponsePayment,
            children: [
              CatchIndexRow(
                title: payment,
                onTap: null,
                density: CatchIndexRowSize.compact,
              ),
            ],
          ),
        if (state.showNote)
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: const ValueKey<String>('host-response-note'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostFormsResponseNote,
                placeholder: l10n.hostFormsResponseNotePlaceholder,
                controller: note,
                minLines: 2,
                maxLines: 4,
                contractExemption:
                    'The team note travels with the application review command, '
                    'which validates it.',
              ),
            ],
          ),
      ],
    );
  }
}
