import { SCHOOL_OPTIONS, SOEMR_SCHOOL } from "../constants/universityHierarchy";

export const SCHOOL_CONFIG = Object.fromEntries(
  SCHOOL_OPTIONS.map((school) => [
    school.value,
    { hasHod: school.value === SOEMR_SCHOOL.label },
  ])
);

