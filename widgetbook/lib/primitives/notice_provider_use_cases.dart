import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Empty and published notice queue',
  type: CatchNoticeControllerProvider,
  path: '[Core patterns]/Notice provider',
)
Widget noticeProviderStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Notice provider states',
  catalogId: 'catch.notice',
  children: [
    for (final published in [false, true]) ...[
      Text(
        published ? 'Published notice' : 'Empty queue',
        style: CatchTextStyles.bodyM(context),
      ),
      WidgetbookViewportFrame.device(
        size: const Size(360, 280),
        child: _NoticeProviderMount(published: published),
      ),
    ],
  ],
);

class _NoticeProviderMount extends StatefulWidget {
  const _NoticeProviderMount({required this.published});

  final bool published;

  @override
  State<_NoticeProviderMount> createState() => _NoticeProviderMountState();
}

class _NoticeProviderMountState extends State<_NoticeProviderMount> {
  final _container = ProviderContainer();
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    if (!widget.published) {
      _ready = true;
      return;
    }
    // Publish outside build, then mount the production consumer. Golden
    // TickerMode pauses existing Riverpod subscriptions, so the host must
    // receive the prepared state on its first read.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _container
          .read(catchNoticeControllerProvider.notifier)
          .show(
            const CatchNoticeData(
              id: 'provider-preview',
              title: 'Preferences saved',
              message: 'Your changes are ready.',
              tone: CatchNoticeTone.success,
              duration: null,
            ),
          );
      setState(() => _ready = true);
    });
  }

  @override
  void dispose() {
    _container.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: _container,
    child: !_ready
        ? const SizedBox.expand()
        : CatchNoticeOverlay(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Page content',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
  );
}
