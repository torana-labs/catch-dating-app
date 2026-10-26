import 'dart:io';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/swipes/domain/swipe.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../ui_captures/fixtures/sales_demo_synthetic_fixtures.dart';
import 'support/golden_pump.dart';

/// Phase 2 flagship Profile — golden-iterated in isolation, rendered in the
/// Catches register (reactable) so the per-section like/comment controls and
/// every section type are part of the visual contract. The hero photo is a
/// committed fixture (FileImage, offline-deterministic) warmed via `precache`.
/// Profile identity/copy comes from the checked sales demo persona projection so
/// captures, seed data, and this flagship golden share the same persona source.
/// Regenerate: flutter test --update-goldens test/goldens/profile_view_test.dart
final _heroImage = FileImage(File('test/goldens/fixtures/portrait.jpg'));
final _persona = salesDemoSyntheticFixtures.publicProfile('nyc_maya_shah_001');

void main() {
  testWidgets('profile redesign (light + dark)', (tester) async {
    await matchCatchGolden(
      tester,
      'profile_redesign',
      size: const Size(440, 1820),
      precache: <ImageProvider<Object>>[_heroImage],
      builder: (context) => ProfileBody(
        data: _profileViewFromPersona(_persona),
        onReact: (target, comment) {},
      ),
    );
  }, tags: const ['golden']);

  testWidgets('profile redesign dense long content (light + dark)', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'profile_redesign_dense_long_content',
      size: const Size(440, 2440),
      textScale: 1.1,
      precache: <ImageProvider<Object>>[_heroImage],
      builder: (context) => ProfileBody(
        data: _denseLongProfileView(),
        onReact: (target, comment) {},
      ),
    );
  }, tags: const ['golden']);

  testWidgets(
    'profile redesign missing photos dynamic type (light + dark)',
    (tester) async {
      await matchCatchGolden(
        tester,
        'profile_redesign_missing_photos_dynamic_type',
        size: const Size(390, 1960),
        textScale: 1.3,
        builder: (context) => ProfileBody(data: _missingPhotoProfileView()),
      );
    },
    tags: const ['golden'],
  );
}

ProfileReactionTarget _target(
  String id,
  SwipeReactionTargetType type,
  String label,
) => ProfileReactionTarget(id: id, type: type, label: label, preview: label);

ProfileView _profileViewFromPersona(PublicProfile profile) {
  final photoCaption = profile.effectiveProfilePhotos
      .skip(1)
      .firstOrNull
      ?.prompt
      ?.displayPrompt;
  return ProfileView(
    name: profile.name,
    age: profile.age,
    heroPhoto: _heroImage,
    heroReaction: _target(
      'hero',
      SwipeReactionTargetType.heroPhoto,
      'Main photo',
    ),
    kicker: 'Was at · sales demo roster',
    kickerActivity: ActivityKind.socialRun,
    metaLine: [
      profile.occupation,
      profile.company,
      profile.city,
    ].nonNulls.join(' · '),
    sections: <ProfileSectionData>[
      ProfileCompatibilitySectionData(
        title: 'Why you might click',
        reasons: const <String>[
          'Shared event context from the sales demo roster',
          'Structured prompts and approved profile photos',
          'Projection-backed profile details',
        ],
        confidence: const <String>['Verified photos', 'Active this week'],
        reaction: _target(
          'compatibility',
          SwipeReactionTargetType.compatibility,
          'Why you might click',
        ),
      ),
      for (final prompt in profile.profilePrompts.take(2))
        ProfilePromptSectionData(
          question: prompt.displayPrompt,
          answer: prompt.answer,
          reaction: _target(
            'prompt-${prompt.promptId}',
            SwipeReactionTargetType.profilePrompt,
            prompt.displayPrompt,
          ),
        ),
      ProfileRunningSectionData(
        pace: '5:20-6:00 /km',
        distance: '5K, 10K',
        reasons: const <String>['Headspace miles'],
        times: const <String>['Dawn'],
        tags: const <String>[
          'Morning regular',
          'Social miles',
          'Long-run person',
        ],
        reaction: _target(
          'running',
          SwipeReactionTargetType.running,
          'Running rhythm',
        ),
      ),
      ProfilePhotoSectionData(
        image: _heroImage,
        caption: photoCaption,
        reaction: _target('photo-2', SwipeReactionTargetType.photo, 'Photo 2'),
      ),
      ProfileFactsSectionData(
        title: 'Details',
        facts: <ProfileFact>[
          if (profile.occupation case final occupation?)
            ProfileFact(icon: CatchIcons.work, text: occupation),
          if (profile.height case final height?)
            ProfileFact(icon: CatchIcons.measure, text: '$height cm'),
          if (profile.company case final company?)
            ProfileFact(icon: CatchIcons.business, text: company),
        ],
        reaction: _target(
          'details',
          SwipeReactionTargetType.details,
          'Details',
        ),
      ),
    ],
  );
}

ProfileView _denseLongProfileView() {
  return ProfileView(
    name: 'Ananya Rajagopalan-Merchant',
    age: 31,
    heroPhoto: _heroImage,
    heroReaction: _target(
      'hero-dense',
      SwipeReactionTargetType.heroPhoto,
      'Main photo',
    ),
    kicker: 'Was at · all-city social half shakeout',
    kickerActivity: ActivityKind.socialRun,
    metaLine:
        'Urban planner · Lower Parel · 4 mutual clubs · Usually dawn miles',
    sections: <ProfileSectionData>[
      ProfileCompatibilitySectionData(
        title: 'Why you might click',
        reasons: const <String>[
          'You both keep easy runs social and save harder efforts for planned workout days.',
          'Both profiles mention coffee, route planning, and low-pressure introductions after events.',
          'Recent attendance overlaps across community runs without exposing private location history.',
        ],
        confidence: const <String>[
          'Verified photos',
          'Active this week',
          'Shared event',
          'Mutual club',
          'Prompt-rich',
          'Runner since 2021',
        ],
        reaction: _target(
          'compatibility-dense',
          SwipeReactionTargetType.compatibility,
          'Why you might click',
        ),
      ),
      ProfilePromptSectionData(
        question: 'My perfect event looks like',
        answer:
            'A route with one quiet stretch, one place where the whole pack regroups, and enough time after for unhurried coffee.',
        reaction: _target(
          'prompt-perfect-event-dense',
          SwipeReactionTargetType.profilePrompt,
          'My perfect event looks like',
        ),
      ),
      ProfilePromptSectionData(
        question: 'After an event, I am usually',
        answer:
            'Trying to remember everyone I spoke to, sending the route to friends, and pretending I did not plan the bakery stop.',
        reaction: _target(
          'prompt-after-event-dense',
          SwipeReactionTargetType.profilePrompt,
          'After an event, I am usually',
        ),
      ),
      ProfilePromptSectionData(
        question: 'My green flag is',
        answer:
            'Someone who can keep a conversation alive at recovery pace and still notice when the group needs to slow down.',
        reaction: _target(
          'prompt-green-flag-dense',
          SwipeReactionTargetType.profilePrompt,
          'My green flag is',
        ),
      ),
      ProfileRunningSectionData(
        pace: '5:05-6:45 /km',
        distance: '5K, 10K, half',
        reasons: const <String>[
          'City exploration',
          'Low-stress consistency',
          'Long-run conversations',
        ],
        times: const <String>['Dawn', 'Late evening', 'Weekend long run'],
        tags: const <String>[
          'Easy miles',
          'Route nerd',
          'Coffee finish',
          'Park loops',
          'Travel runs',
          'Recovery pace',
        ],
        reaction: _target(
          'running-dense',
          SwipeReactionTargetType.running,
          'Running rhythm',
        ),
      ),
      ProfilePhotoSectionData(
        image: _heroImage,
        caption:
            'The one hill on the route that everyone complains about and secretly wants to repeat.',
        reaction: _target(
          'photo-hill-dense',
          SwipeReactionTargetType.photo,
          'Hill photo',
        ),
      ),
      ProfilePhotoSectionData(
        image: _heroImage,
        caption:
            'Post-run table evidence: medals, two extra coffees, and a route map covered in notes.',
        reaction: _target(
          'photo-coffee-dense',
          SwipeReactionTargetType.photo,
          'Coffee photo',
        ),
      ),
      ProfileFactsSectionData(
        title: 'Details',
        facts: <ProfileFact>[
          ProfileFact(
            icon: CatchIcons.work,
            text: 'Urban planner focused on walkable neighborhoods',
          ),
          ProfileFact(
            icon: CatchIcons.business,
            text: 'Designs safer street pilots with community groups',
          ),
          ProfileFact(icon: CatchIcons.measure, text: '168 cm'),
          ProfileFact(
            icon: CatchIcons.education,
            text: 'Masters in urban design',
          ),
        ],
        reaction: _target(
          'details-dense',
          SwipeReactionTargetType.details,
          'Details',
        ),
      ),
    ],
  );
}

ProfileView _missingPhotoProfileView() {
  return ProfileView(
    name: 'Maya Shah',
    age: 29,
    kicker: 'Was at · neighborhood 5K',
    kickerActivity: ActivityKind.openActivity,
    metaLine: 'Product lead · Bandra · Prefers morning runs',
    sections: <ProfileSectionData>[
      const ProfileCompatibilitySectionData(
        title: 'Why you might click',
        reasons: <String>[
          'Both of you use events for relaxed, in-person introductions.',
          'Profiles are compatible on pace, distance, and weekend timing.',
        ],
        confidence: <String>['Shared event', 'Current run preferences'],
      ),
      const ProfilePromptSectionData(
        question: 'My perfect event looks like',
        answer:
            'A friendly 5K where people wait at turns and nobody treats the first kilometer like a race.',
      ),
      const ProfileRunningSectionData(
        pace: '5:30-7:00 /km',
        distance: '5K, 10K',
        reasons: <String>['Headspace miles', 'Meet people naturally'],
        times: <String>['Morning', 'Weekend'],
        tags: <String>['Conversational pace', 'Park loops', 'Cafe finish'],
      ),
      const ProfilePhotoSectionData(
        image: null,
        caption:
            'Photo caption remains readable when the image fallback shows.',
      ),
      ProfileFactsSectionData(
        title: 'Details',
        facts: <ProfileFact>[
          ProfileFact(icon: CatchIcons.work, text: 'Product lead'),
          ProfileFact(icon: CatchIcons.measure, text: '162 cm'),
        ],
      ),
    ],
  );
}
