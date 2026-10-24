part of 'host_form_response_detail_screen.dart';

class HostResponseAnswerRow extends StatelessWidget {
  const HostResponseAnswerRow({
    super.key,
    required this.label,
    required this.answer,
    this.origin,
  });

  final String label;
  final String answer;
  final String? origin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVerticalCompact,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            label,
            variant: CatchTextVariant.sectionTitle,
            color: CatchTokens.of(context).ink,
          ),
          gapH8,
          CatchText(
            answer,
            variant: CatchTextVariant.bodyL,
            color: CatchTokens.of(context).ink,
          ),
          if (origin != null) ...[
            gapH8,
            CatchText(
              origin!,
              variant: CatchTextVariant.bodyS,
              color: CatchTokens.of(context).ink2,
            ),
          ],
        ],
      ),
    );
  }
}

class HostResponseMetadataSection extends StatelessWidget {
  const HostResponseMetadataSection({super.key, required this.detail});

  final HostFormResponseDetail detail;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    children: [
      CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormResponseIdentitySection,
        valueText: _identityKindLabel(context, detail.response.identityKind),
      ),
      CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormResponseSource,
        valueText:
            detail.response.sourceLabel ??
            context.l10n.hostFormResponseDirectSource,
      ),
      CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormResponseConsent,
        valueText: detail.consentVersion,
      ),
      CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormResponseCompletionTime,
        valueText: _duration(detail.completionMillis),
      ),
    ],
  );
}

String _originLabel(BuildContext context, HostFormDataOrigin origin) =>
    switch (origin) {
      HostFormDataOrigin.anonymous =>
        context.l10n.hostFormResponseOriginAnonymous,
      HostFormDataOrigin.respondentGranted =>
        context.l10n.hostFormResponseOriginGranted,
      HostFormDataOrigin.organizerAcquired =>
        context.l10n.hostFormResponseOriginAcquired,
      HostFormDataOrigin.revoked => context.l10n.hostFormResponseOriginRevoked,
    };

String _identityKindLabel(
  BuildContext context,
  HostFormResponseIdentityKind kind,
) => switch (kind) {
  HostFormResponseIdentityKind.anonymous =>
    context.l10n.hostFormResponseOriginAnonymous,
  HostFormResponseIdentityKind.emailVerified =>
    context.l10n.hostFormResponseEmail,
  HostFormResponseIdentityKind.phoneVerified =>
    context.l10n.hostFormResponsePhone,
  HostFormResponseIdentityKind.catchAccount =>
    context.l10n.hostFormIdentityCatchAccount,
};

String _answerText(BuildContext context, Object? answer) {
  if (answer == null || answer == '') {
    return context.l10n.hostFormResponseNoAnswer;
  }
  if (answer is bool) {
    return answer
        ? context.l10n.hostFormRuleTrue
        : context.l10n.hostFormRuleFalse;
  }
  if (answer is List<Object?>) {
    if (answer.isEmpty) return context.l10n.hostFormResponseNoAnswer;
    return answer.map((item) => item?.toString() ?? '').join(', ');
  }
  return answer.toString();
}

String _duration(int milliseconds) {
  final seconds = (milliseconds / 1000).round();
  if (seconds < 60) return '${seconds}s';
  final minutes = seconds ~/ 60;
  final remainder = seconds % 60;
  return remainder == 0 ? '${minutes}m' : '${minutes}m ${remainder}s';
}
