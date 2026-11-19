/// Numeric text-lane geometry exposed by direct field rows to their section.
///
/// A row without this contract retains the section's existing adapter fallback.
/// Implementations report only the leading inset; the section owns its outer
/// gutter, separator role, and placement.
abstract interface class CatchFieldDividerGeometry {
  double get fieldDividerLeadingInset;

  /// True when the row draws its own boundary, such as an outlined text box.
  /// Sections then leave out the separators on either side of it.
  bool get suppressesFieldDividers;
}
