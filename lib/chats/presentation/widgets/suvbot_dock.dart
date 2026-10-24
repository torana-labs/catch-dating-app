import 'dart:async';

import 'package:catch_dating_app/chats/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef SuvbotActionCallback = Future<void> Function(SuvbotActionItem action);
typedef SuvbotTextActionCallback =
    Future<void> Function(SuvbotActionItem action, String text);

const EdgeInsets _demoActionSheetPadding = EdgeInsets.fromLTRB(
  CatchSpacing.s3,
  0,
  CatchSpacing.s3,
  CatchSpacing.s4,
);

class SuvbotDock extends StatelessWidget {
  const SuvbotDock({
    super.key,
    required this.actions,
    required this.pending,
    required this.onAction,
    required this.onTextAction,
    required this.onRetry,
  });

  final AsyncValue<List<SuvbotActionItem>> actions;
  final bool pending;
  final SuvbotActionCallback onAction;
  final SuvbotTextActionCallback onTextAction;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return CatchDock(
      child: actions.when(
        data: (items) {
          final t = CatchTokens.of(context);
          final colors = Theme.of(context).colorScheme;
          final byId = {for (final action in items) action.id: action};
          final warmActions = [
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyWarmsignupstate],
            byId[context
                .l10n
                .chatsSuvbotActionBarVisiblecopyWarmposteventstate],
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyWarmchatstate],
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyWarmpaymentstate],
          ].whereType<SuvbotActionItem>().toList(growable: false);
          final resetActions = [
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyResetchats],
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyResetbookings],
            byId[context
                .l10n
                .chatsSuvbotActionBarVisiblecopyResetnotifications],
            byId[context.l10n.chatsSuvbotActionBarVisiblecopyCleardemostate],
          ].whereType<SuvbotActionItem>().toList(growable: false);
          final checkAction =
              byId[context.l10n.chatsSuvbotActionBarVisiblecopyCheckdemostate];
          final refreshAction =
              byId[context
                  .l10n
                  .chatsSuvbotActionBarVisiblecopyRefreshdemostate];
          final helpAction =
              byId[context.l10n.chatsSuvbotActionBarVisiblecopyHelp];
          final matchAction =
              byId[context
                  .l10n
                  .chatsSuvbotActionBarVisiblecopyMatchtesterbyphone];

          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          context.l10n.chatsSuvbotActionBarTextSuvbotControls,
                          variant: CatchTextVariant.sectionTitle,
                          color: t.ink,
                        ),
                        gapH2,
                        CatchText(
                          context.l10n.chatsSuvbotActionBarTextNoTypingNeeded,
                          variant: CatchTextVariant.statusLabel,
                          color: t.ink2,
                        ),
                      ],
                    ),
                  ),
                  if (helpAction != null)
                    Semantics(
                      label: helpAction.label,
                      button: true,
                      child: Tooltip(
                        message: helpAction.label,
                        child: CatchIconAction(
                          size: CatchLayout.suvbotCircleActionExtent,
                          backgroundColor: t.surface,
                          status: (pending)
                              ? CatchIconActionStatus.disabled
                              : CatchIconActionStatus.enabled,
                          onPressed: pending
                              ? null
                              : () => unawaited(onAction(helpAction)),
                          child: Icon(
                            CatchIcons.helpOutlineRounded,
                            size: CatchIcon.md,
                            color: pending ? t.ink3 : t.ink2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: CatchSpacing.s2),
              Row(
                children: [
                  if (checkAction != null)
                    Expanded(
                      child: CatchButton(
                        label: checkAction.label,
                        onPressed: pending
                            ? null
                            : () => unawaited(onAction(checkAction)),
                        variant: CatchButtonVariant.secondary,
                        size: CatchButtonSize.sm,
                        fullWidth: true,
                        status: (pending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        leading: Icon(_iconFor(checkAction.icon)),
                        foregroundColor: t.accent,
                        backgroundColor: t.accent.withValues(
                          alpha: CatchOpacity.subtleFill,
                        ),
                        borderColor: t.line,
                      ),
                    ),
                  if (checkAction != null && refreshAction != null)
                    const SizedBox(width: CatchSpacing.s2),
                  if (refreshAction != null)
                    Expanded(
                      child: CatchButton(
                        label: context.l10n.chatsSuvbotActionBarLabelRefreshAll,
                        onPressed: pending
                            ? null
                            : () => unawaited(onAction(refreshAction)),
                        variant: CatchButtonVariant.danger,
                        size: CatchButtonSize.sm,
                        fullWidth: true,
                        status: (pending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        leading: Icon(_iconFor(refreshAction.icon)),
                        foregroundColor: colors.error,
                        backgroundColor: colors.errorContainer.withValues(
                          alpha: CatchOpacity.suvbotDestructiveFill,
                        ),
                        borderColor: t.line,
                      ),
                    ),
                ],
              ),
              if (warmActions.isNotEmpty) ...[
                const SizedBox(height: CatchSpacing.s3),
                Text(
                  context.l10n.chatsSuvbotActionBarTextCreateATestState,
                  style: CatchTextStyles.kicker(context),
                ),
                const SizedBox(height: CatchSpacing.s1),
                Row(
                  children: [
                    for (final (index, action) in warmActions.indexed) ...[
                      if (index > 0) const SizedBox(width: CatchSpacing.s1),
                      Expanded(
                        child: CatchButton(
                          label: _shortWarmLabel(action),
                          onPressed: pending
                              ? null
                              : () => unawaited(onAction(action)),
                          variant: CatchButtonVariant.secondary,
                          size: CatchButtonSize.sm,
                          fullWidth: true,
                          leading: Icon(_iconFor(action.icon)),
                          foregroundColor: t.ink,
                          backgroundColor: t.surface,
                          borderColor: t.line,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
              const SizedBox(height: CatchSpacing.s2),
              Row(
                children: [
                  if (matchAction != null)
                    Expanded(
                      child: CatchButton(
                        label: matchAction.label,
                        onPressed: pending
                            ? null
                            : () => _showMatchTesterSheet(
                                context,
                                action: matchAction,
                                pending: pending,
                                onTextAction: onTextAction,
                              ),
                        variant: CatchButtonVariant.secondary,
                        size: CatchButtonSize.sm,
                        fullWidth: true,
                        status: (pending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        leading: Icon(_iconFor(matchAction.icon)),
                        foregroundColor: t.ink,
                        backgroundColor: t.surface,
                        borderColor: t.line,
                      ),
                    ),
                  if (matchAction != null && resetActions.isNotEmpty)
                    const SizedBox(width: CatchSpacing.s2),
                  if (resetActions.isNotEmpty)
                    Expanded(
                      child: CatchButton(
                        label: context.l10n.chatsSuvbotActionBarLabelReset,
                        onPressed: pending
                            ? null
                            : () => _showResetSheet(
                                context,
                                actions: resetActions,
                                pending: pending,
                                onAction: onAction,
                              ),
                        variant: CatchButtonVariant.danger,
                        size: CatchButtonSize.sm,
                        fullWidth: true,
                        status: (pending)
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        leading: Icon(CatchIcons.cleaningServicesRounded),
                        foregroundColor: colors.error,
                        backgroundColor: colors.errorContainer.withValues(
                          alpha: CatchOpacity.suvbotDestructiveFill,
                        ),
                        borderColor: t.line,
                      ),
                    ),
                ],
              ),
            ],
          );
        },
        loading: () => const SizedBox(
          height: CatchLayout.suvbotLoadingControlsHeight,
          child: Center(child: CatchLoadingIndicator()),
        ),
        error: (_, _) {
          final t = CatchTokens.of(context);
          return CatchButton(
            label: context.l10n.chatsSuvbotActionBarLabelReloadControls,
            onPressed: onRetry,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
            fullWidth: true,
            leading: Icon(CatchIcons.syncRounded),
            foregroundColor: t.ink,
            backgroundColor: t.surface,
            borderColor: t.line,
          );
        },
      ),
    );
  }
}

Future<void> _showResetSheet(
  BuildContext context, {
  required List<SuvbotActionItem> actions,
  required bool pending,
  required SuvbotActionCallback onAction,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        child: CatchSheet(
          title: context.l10n.chatsSuvbotActionBarTitleResetDemoState,
          subtitle:
              context.l10n.chatsSuvbotActionBarSubtitleTheseActionsOnlyTouch,
          child: Builder(
            builder: (context) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final (index, action) in actions.indexed) ...[
                    SuvbotResetActionRow(
                      action: action,
                      pending: pending,
                      onTap: () {
                        Navigator.of(context).pop();
                        unawaited(onAction(action));
                      },
                    ),
                    if (index != actions.length - 1)
                      const CatchDivider.fieldRow(indent: 0),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    ),
  );
}

// Public for Widgetbook.
class SuvbotResetActionRow extends StatelessWidget {
  const SuvbotResetActionRow({
    super.key,
    required this.action,
    required this.pending,
    required this.onTap,
  });

  final SuvbotActionItem action;
  final bool pending;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final tone = action.destructive ? t.danger : t.ink;
    return AnimatedOpacity(
      opacity: pending ? CatchOpacity.disabledControl : 1,
      duration: CatchMotion.fast,
      curve: CatchMotion.standardCurve,
      child: CatchSurface(
        tone: CatchSurfaceTone.transparent,
        radius: 0,
        onTap: pending ? null : onTap,
        padding: CatchInsets.suvbotActionRow,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: CatchInsets.inlineIconTopTight,
              child: Icon(
                _iconFor(action.icon),
                color: tone,
                size: CatchIcon.row,
              ),
            ),
            gapW12,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    action.label,
                    style: CatchTextStyles.fieldRowTitle(context, color: tone),
                  ),
                  gapH4,
                  CatchText(
                    action.description,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                ],
              ),
            ),
            gapW12,
            Icon(
              CatchIcons.chevronRightRounded,
              color: action.destructive ? t.danger : t.ink3,
              size: CatchIcon.sm,
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _showMatchTesterSheet(
  BuildContext context, {
  required SuvbotActionItem action,
  required bool pending,
  required SuvbotTextActionCallback onTextAction,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => MatchTesterSheet(
      action: action,
      pending: pending,
      onTextAction: onTextAction,
    ),
  );
}

// Public for Widgetbook.
class MatchTesterSheet extends StatefulWidget {
  const MatchTesterSheet({
    super.key,
    required this.action,
    required this.pending,
    required this.onTextAction,
  });

  final SuvbotActionItem action;
  final bool pending;
  final SuvbotTextActionCallback onTextAction;

  @override
  State<MatchTesterSheet> createState() => _MatchTesterSheetState();
}

class _MatchTesterSheetState extends State<MatchTesterSheet> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: _demoActionSheetPadding.copyWith(
        bottom: MediaQuery.viewInsetsOf(context).bottom + CatchSpacing.s4,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            context.l10n.chatsSuvbotActionBarTextMatchTester,
            variant: CatchTextVariant.titleL,
          ),
          const SizedBox(height: CatchSpacing.s1),
          CatchText(
            context.l10n.chatsSuvbotActionBarTextEnterAnAllowlistedBeta,
            variant: CatchTextVariant.supporting,
          ),
          const SizedBox(height: CatchSpacing.s3),
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.chatsSuvbotActionBarTitlePhoneNumber,
              contract: CatchContractConstraints
                  .mobileFormStateSuvbotTesterPhoneNumber,
              controller: _controller,
              keyboardType: TextInputType.phone,
              autofocus: true,
              placeholder: '+919999999999',
            ),
          ),
          const SizedBox(height: CatchSpacing.s3),
          CatchButton(
            onPressed: widget.pending ? null : _submit,
            leading: Icon(CatchIcons.personAddAlt1Rounded),
            label: context.l10n.chatsSuvbotActionBarLabelCreateMatch,
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  void _submit() {
    final value = _controller.text.trim();
    if (value.isEmpty) return;
    Navigator.of(context).pop();
    unawaited(widget.onTextAction(widget.action, value));
  }
}

String _shortWarmLabel(SuvbotActionItem action) => switch (action.id) {
  'warmSignupState' => 'Signups',
  'warmPostEventState' => 'Post-event',
  'warmChatState' => 'Chats',
  'warmPaymentState' => 'Payments',
  _ => action.label,
};

IconData _iconFor(String icon) => switch (icon) {
  'refresh' => CatchIcons.refreshRounded,
  'clean' => CatchIcons.cleaningServicesRounded,
  'event' => CatchIcons.eventAvailableRounded,
  'flag' => CatchIcons.flagRounded,
  'chat' => CatchIcons.forumRounded,
  'payment' => CatchIcons.paymentsRounded,
  'chatReset' => CatchIcons.forumOutlined,
  'eventReset' => CatchIcons.eventBusyRounded,
  'notifications' => CatchIcons.notificationsOffRounded,
  'personAdd' => CatchIcons.personAddAlt1Rounded,
  'check' => CatchIcons.factCheckOutlined,
  'help' => CatchIcons.helpOutlineRounded,
  _ => CatchIcons.autoAwesomeRounded,
};
