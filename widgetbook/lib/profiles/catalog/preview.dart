import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';

class WidgetbookProfileProfileCatalog extends StatelessWidget {
  const WidgetbookProfileProfileCatalog({
    super.key,
    required this.title,
    required this.contractId,
    required this.children,
  });

  final String title;
  final String contractId;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.pageBody,
          children: [
            Text(title, style: CatchTextStyles.titleL(context, color: t.ink)),
            gapH4,
            Text(
              contractId,
              style: CatchTextStyles.monoLabel(context, color: t.ink2),
            ),
            gapH16,
            Wrap(
              spacing: CatchSpacing.s4,
              runSpacing: CatchSpacing.s4,
              children: children,
            ),
          ],
        ),
      ),
    );
  }
}

class WidgetbookProfileStateCard extends StatelessWidget {
  const WidgetbookProfileStateCard({
    super.key,
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.profileWidePreviewExtent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(label, variant: CatchTextVariant.titleS, color: t.ink),
          gapH8,
          child,
        ],
      ),
    );
  }
}

class WidgetbookProfileDeviceFrame extends StatelessWidget {
  const WidgetbookProfileDeviceFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.line,
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: Padding(
        padding: const EdgeInsets.all(CatchSpacing.micro6),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.md),
          child: SizedBox(
            width: WidgetbookPreviewLayout.phoneChromeWidth,
            height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
            child: child,
          ),
        ),
      ),
    );
  }
}

class WidgetbookProfileSectionFrame extends StatelessWidget {
  const WidgetbookProfileSectionFrame({
    super.key,
    required this.child,
    required this.height,
  });

  final Widget child;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: WidgetbookPreviewLayout.phoneChromeWidth,
      height: height,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(
            AsyncData<String?>(widgetbookProfileViewer.uid),
          ),
          userProfileRepositoryProvider.overrideWithValue(
            ProfileFixtureUserProfileRepository(
              profile: widgetbookProfileViewer,
            ),
          ),
          userAnalyticsRepositoryProvider.overrideWithValue(
            ProfileFixtureUserAnalyticsRepository(
              report: ProfileSurfaceFixtures.analyticsReport,
            ),
          ),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          home: Scaffold(body: SafeArea(child: child)),
        ),
      ),
    );
  }
}
