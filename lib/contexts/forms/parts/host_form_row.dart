import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A form in Your forms: its title, the kind badge, how many answered and
/// where it shows, and whether it is taking answers.
class HostFormRow extends StatelessWidget {
  const HostFormRow({
    super.key,
    required this.form,
    required this.onTap,
    this.newCount = 0,
  });

  final HostFormSummary form;
  final VoidCallback onTap;

  /// Answers waiting for a first look, shown as "N new" in place of the
  /// chevron.
  final int newCount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: form.title,
      onTap: onTap,
      density: CatchIndexRowSize.regular,
      badge: CatchIndexRowBadge(
        label: hostFormKindLabel(l10n, form.purpose),
        tone: hostFormKindTone(form.purpose),
      ),
      subtitle: l10n.hostFormsRowSubtitle(
        count: form.submittedResponseCount,
        placement: hostFormPlacementText(l10n, form.defaultTargetKind),
      ),
      meta: hostFormStatusText(l10n, form.status),
      metaTone: form.status == HostFormLifecycleStatus.published
          ? CatchIndexRowTone.success
          : CatchIndexRowTone.neutral,
      trailing: newCount > 0
          ? CatchBadge(
              label: l10n.hostFormsRowNew(count: newCount),
              emphasis: CatchBadgeEmphasis.solid,
            )
          : null,
      chevron: newCount <= 0,
    );
  }
}
