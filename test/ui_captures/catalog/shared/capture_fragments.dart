// Shared by the fragment entries: a fragment cuts one widget out of its
// screen capture (docs/marketing_app_media_pipeline.md, Fragment captures).

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Screen ground kept beside a list row: the row's own height, and a margin
/// at each end so its avatar and trailing control do not touch the edge.
const fragmentRowPadding = EdgeInsets.symmetric(horizontal: 14);

/// Screen ground kept around a card or a block, inside the gap around it.
const fragmentCardPadding = EdgeInsets.all(12);

/// The nearest [type] around [of], such as the card that holds a title.
Finder nearestFragment(Finder of, Type type) =>
    find.ancestor(of: of, matching: find.byType(type)).first;
