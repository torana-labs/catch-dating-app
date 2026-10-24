import 'package:catch_dating_app/clubs/data/club_posts_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Opens the route-specific composer for an organizer update to followers.
///
/// Returns true only after the callable accepts the post. Durable Home and
/// Activity delivery remains server-owned; dismissing the sheet returns false.
Future<bool> showHostFollowerUpdateComposer({
  required BuildContext context,
  required Club club,
  required int remainingQuota,
  required String Function() requestIdFactory,
  required Future<void> Function({
    required String requestId,
    required String text,
  })
  onSubmitPost,
}) async {
  final result = await showCatchBottomSheet<bool>(
    context: context,
    builder: (_) => HostFollowerUpdateComposerSheet(
      club: club,
      remainingQuota: remainingQuota,
      requestIdFactory: requestIdFactory,
      onSubmitPost: onSubmitPost,
    ),
  );
  if (result == true && context.mounted) {
    showCatchNotice(
      context,
      context.l10n.hostsHostClubToolsCatchbuttonPostedToFollowers,
    );
  }
  return result == true;
}

class HostFollowerUpdateComposerSheet extends StatefulWidget {
  const HostFollowerUpdateComposerSheet({
    super.key,
    required this.club,
    required this.remainingQuota,
    required this.requestIdFactory,
    required this.onSubmitPost,
  });

  final Club club;
  final int remainingQuota;
  final String Function() requestIdFactory;
  final Future<void> Function({required String requestId, required String text})
  onSubmitPost;

  @override
  State<HostFollowerUpdateComposerSheet> createState() =>
      _HostFollowerUpdateComposerSheetState();
}

class _HostFollowerUpdateComposerSheetState
    extends State<HostFollowerUpdateComposerSheet> {
  final TextEditingController _controller = TextEditingController();
  Object? _error;
  bool _pending = false;
  late String _requestId;

  @override
  void initState() {
    super.initState();
    _requestId = widget.requestIdFactory();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _controller.text.trim();
    final canSubmit = !_pending && widget.remainingQuota > 0 && text.isNotEmpty;
    return CatchSheet.standard(
      title: context.l10n.hostsHostClubToolsTitlePostToFollowers,
      subtitle: context.l10n
          .hostsHostClubToolsSubtitleRemainingquotaOfWeeklyquotaPosts(
            remainingQuota: widget.remainingQuota,
            weeklyQuota: ClubPostsRepository.weeklyQuota,
          ),
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey('host-follower-update-submit'),
        label: _pending
            ? context.l10n.hostsHostClubToolsLabelPosting
            : context.l10n.hostsHostClubToolsLabelPostUpdate,
        onPressed: canSubmit ? () => _submit(text) : null,
        status: (_pending) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'host.follower-update.${widget.club.id}',
              title: context.l10n.hostSendsFollowerUpdateChannel,
              message: context.l10n.hostSendsFollowerUpdateDescription,
            ),
          ),
          gapH16,
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-follower-update-text'),
              title: context.l10n.hostsHostClubToolsTitleUpdate,
              contract: CatchContractConstraints
                  .createOrganizerPostCallablePayloadText,
              controller: _controller,
              placeholder:
                  context.l10n.hostsHostClubToolsPlaceholderShareARouteNote,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 5,
              minLines: 3,
              helperText: context.l10n
                  .hostsHostClubToolsHelpertextValue1CharactersLeft(
                    value1: 500 - _controller.text.length,
                  ),
              states: <WidgetState>{if (_pending) WidgetState.disabled},
              onChanged: (_) => setState(() {
                _requestId = widget.requestIdFactory();
              }),
            ),
          ),
          if (_error != null) ...[
            gapH10,
            CatchText(
              context.l10n.hostsHostClubToolsTextCouldNotPostThis,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).danger,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _submit(String text) async {
    if (_pending) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      await widget.onSubmitPost(requestId: _requestId, text: text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _pending = false;
        _error = error;
      });
    }
  }
}
