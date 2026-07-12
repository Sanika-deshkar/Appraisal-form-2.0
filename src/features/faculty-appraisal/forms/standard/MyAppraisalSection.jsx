import StandardMyAppraisal from "./StandardMyAppraisal";

export default function MyAppraisalSection({
  sectionTab,
  onSectionTabChange,
  defaultDesignation = "",
  defaultAcademicYear,
  titleNameFallback = "Faculty",
  subtitleSeparator = ".",
}) {
  return (
    <StandardMyAppraisal
      sectionTab={sectionTab}
      onSectionTabChange={onSectionTabChange}
      defaultDesignation={defaultDesignation}
      defaultAcademicYear={defaultAcademicYear}
      titleNameFallback={titleNameFallback}
      subtitleSeparator={subtitleSeparator}
    />
  );
}
