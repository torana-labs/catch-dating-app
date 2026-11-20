import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_row.dart';
import 'package:catch_dating_app/hosts/forms/forms_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The three People views; Forms is this tab.
enum HostPeopleView { people, messages, forms }

/// The Forms tab in board order: the People views, then Your forms.
class HostFormsBody extends StatelessWidget {
  const HostFormsBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onOpenForm,
    required this.onCreate,
    required this.onLoadMore,
  });

  final HostFormsState state;
  final ValueChanged<HostPeopleView> onView;
  final ValueChanged<HostFormSummary> onOpenForm;
  final VoidCallback onCreate;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final views = CatchPageTabBar<HostPeopleView>.segmented(
      selected: HostPeopleView.forms,
      label: l10n.hostFormsPeopleViews,
      options: [
        CatchOption(
          value: HostPeopleView.people,
          label: l10n.hostFormsViewPeople,
        ),
        CatchOption(
          value: HostPeopleView.messages,
          label: l10n.hostFormsViewMessages,
        ),
        CatchOption(
          value: HostPeopleView.forms,
          label: l10n.hostFormsViewForms,
        ),
      ],
      onChanged: (view) {
        if (view != HostPeopleView.forms) onView(view);
      },
    );
    final Widget forms;
    if (state.status == HostFormsStatus.loading) {
      final row = CatchIndexRow(
        title: l10n.hostFormsYourForms,
        subtitle: l10n.hostFormsKindApplication,
        meta: l10n.hostFormsStatusTakingAnswers,
        onTap: null,
        density: CatchIndexRowSize.regular,
      );
      forms = CatchSkeleton.content(
        child: CatchSection(
          title: l10n.hostFormsYourForms,
          children: [row, row, row],
        ),
      );
    } else if (state.forms.isEmpty) {
      forms = CatchEmptyState(
        icon: CatchIcons.document,
        title: l10n.hostFormsEmptyTitle,
        message: l10n.hostFormsEmptyBody,
        actions: [
          CatchButton(
            label: l10n.hostFormsNewForm,
            leading: CatchIcon(CatchIcons.add),
            size: CatchButtonSize.md,
            onPressed: onCreate,
          ),
        ],
      );
    } else {
      final newTotal = state.newResponseTotal;
      final takingAnswers = state.forms
          .where((form) => form.status == HostFormLifecycleStatus.published)
          .length;
      forms = CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                key: const ValueKey<String>('host-forms-stat-new'),
                label: l10n.hostFormsStatNewResponses,
                value: newTotal == null ? '—' : '$newTotal',
                note: newTotal == null || newTotal == 0
                    ? null
                    : l10n.hostFormsStatAcrossForms(
                        count: state.formsWithNewResponses,
                      ),
                noteTone: CatchMetricTileTone.success,
              ),
              CatchMetricTile.stat(
                key: const ValueKey<String>('host-forms-stat-taking'),
                label: l10n.hostFormsStatusTakingAnswers,
                value: '$takingAnswers',
                note: l10n.hostFormsStatOfForms(count: state.forms.length),
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormsYourForms,
            children: [
              for (final form in state.forms)
                HostFormRow(
                  key: ValueKey<String>('host-forms-row-${form.formId}'),
                  form: form,
                  newCount: state.newResponseCounts[form.formId] ?? 0,
                  onTap: () => onOpenForm(form),
                ),
            ],
          ),
        ],
      );
    }
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        views,
        forms,
        if (state.canLoadMore || state.loadingMore)
          CatchButton(
            label: l10n.hostFormsLoadMore,
            variant: CatchButtonVariant.secondary,
            status: state.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            fullWidth: true,
            onPressed: state.loadingMore ? null : onLoadMore,
          ),
        if (state.loadMoreError != null)
          CatchNotice.inline(
            body: l10n.hostFormsLoadMoreFailed,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.hostFormsTryAgain,
              onPressed: onLoadMore,
            ),
          ),
      ],
    );
  }
}
