
// - School HOD flag -
// Returns true  to school has an HOD layer (Faculty to HOD to Director to ...)
// Returns false to no HOD layer (Faculty to Director to ...)
// The flag is written to sessionStorage by Login.jsx at sign-in time.
export const schoolHasHOD = () => sessionStorage.getItem("hasHOD") !== "false";

// - Field / score editing permissions -
export const canEditFacultyFields = (role) => role === "faculty";

export const canEditFacultyScore  = (role) => role === "faculty";
export const canEditHodScore      = (role) => role === "hod" && schoolHasHOD();
export const canEditDeanScore     = (role) => role === "director";
