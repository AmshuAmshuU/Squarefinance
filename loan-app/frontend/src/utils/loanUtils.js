/**
 * Utility function to handle legacy "flattened" loan data structure.
 * Currently acting as an identity function because the view/edit pages
 * handle the new structured backend format inline.
 *
 * @param {Object} loan - The structured loan object from the backend
 * @returns {Object} - Flattened or formatted loan object
 */
export const flattenLoan = (loan) => {
  if (!loan) return null;
  return loan;
};
