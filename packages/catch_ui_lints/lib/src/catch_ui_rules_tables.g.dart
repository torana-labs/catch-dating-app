// GENERATED CODE - DO NOT MODIFY BY HAND.
//
// Regenerate with:
//   node tool/design/build_lint_enforcement_tables.mjs

// Source: design/components/catch.components.json

// This file is deliberately dependency-free so the analyzer plugin can load it
// in a fresh isolate without importing application code.

const catchRawControlConstructors = <String>{
  'ActionChip',
  'AppBar',
  'Badge',
  'Card',
  'Chip',
  'ChoiceChip',
  'CupertinoNavigationBar',
  'FilterChip',
  'InputChip',
  'RawChip',
  'SliverAppBar',
};

const catchRawControlReplacements = <String, String>{
  'ActionChip': 'CatchChip',
  'AppBar': 'CatchTopBar inside a CatchScreen',
  'Badge': 'CatchBadge',
  'Card': 'CatchSurface or CatchSectionCard',
  'Chip': 'CatchChip',
  'ChoiceChip': 'CatchChip',
  'CupertinoNavigationBar': 'CatchTopBar inside a CatchScreen',
  'FilterChip': 'CatchChip',
  'InputChip': 'CatchChip',
  'RawChip': 'CatchChip',
  'SliverAppBar': 'a registered media-hero sliver or a subject CatchTopBar',
};

const catchRawButtonControlConstructors = <String>{
  'CupertinoButton',
  'DropdownButton',
  'ElevatedButton',
  'FilledButton',
  'FloatingActionButton',
  'MenuAnchor',
  'OutlinedButton',
  'PopupMenuButton',
  'Radio',
  'RangeSlider',
  'SegmentedButton',
  'Slider',
  'Switch',
  'TextButton',
  'TextField',
  'TextFormField',
};
