import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart'
    show CatchAspectRatio, CatchInsets, CatchLayout, CatchRadius, CatchStroke;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ProfileTabSkeletonSliverBody extends StatelessWidget {
  const ProfileTabSkeletonSliverBody({super.key});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: SizedBox(
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSectionList(
              emptyStateOmitted: true,
              gap: 0,
              children: [
                const ProfilePhotosSkeletonSection(),
                ProfileInfoSkeletonSection(
                  title: context.l10n.userProfileProfileTabSkeletonTitlePrompts,
                  rows: maxProfilePromptAnswers,
                ),
                ProfileInfoSkeletonSection(
                  title:
                      context.l10n.userProfileProfileTabSkeletonTitleAboutYou,
                  rows: 5,
                ),
                ProfileInfoSkeletonSection(
                  title:
                      context.l10n.userProfileProfileTabSkeletonTitleLifestyle,
                  rows: 4,
                ),
                ProfileInfoSkeletonSection(
                  title: context.l10n.profileActivityPreferencesTitle,
                  rows: 1,
                ),
              ],
            ),
            gapH32,
          ],
        ),
      ),
    );
  }
}

class ProfilePhotosSkeletonSection extends StatelessWidget {
  const ProfilePhotosSkeletonSection({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: context.l10n.userProfileProfileTabSkeletonTitlePhotos,
      count: context.l10n.userProfileProfileTabSkeletonVisiblecopyLoading,
      first: true,
      child: Padding(
        padding: CatchInsets.fieldSectionChildTop,
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: CatchSpacing.s2,
            crossAxisSpacing: CatchSpacing.s2,
            childAspectRatio: CatchAspectRatio.portrait3x4,
          ),
          itemCount: maximumProfilePhotoCount,
          itemBuilder: (context, index) => CatchSkeleton.box(
            width: double.infinity,
            height: double.infinity,
            radius: CatchRadius.lg,
          ),
        ),
      ),
    );
  }
}

class ProfileInfoSkeletonSection extends StatelessWidget {
  const ProfileInfoSkeletonSection({
    super.key,
    required this.title,
    required this.rows,
  });

  final String title;
  final int rows;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: title,
      children: [
        for (var index = 0; index < rows; index++)
          const ProfileInfoSkeletonTile(),
      ],
    );
  }
}

class ProfileInfoSkeletonTile extends StatelessWidget {
  const ProfileInfoSkeletonTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.profileInfoSkeletonRow,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: CatchStroke.hairline),
            child: CatchSkeleton.box(
              width: CatchFieldRow.leadingSlotIconSize,
              height: CatchFieldRow.leadingSlotIconSize,
              radius: CatchRadius.pill,
            ),
          ),
          const SizedBox(width: CatchFieldRow.leadingSlotGap),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
                gapH4,
                CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
              ],
            ),
          ),
          CatchSkeleton.box(
            width: CatchSpacing.s10,
            height: CatchSpacing.s10,
            radius: CatchRadius.pill,
          ),
        ],
      ),
    );
  }
}
