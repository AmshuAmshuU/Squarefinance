import { useEffect, useRef } from "react";

// Lets a loan page ask its form "has the user changed anything?" and "save it
// now", without the form re-rendering the page on every keystroke.
//
// The forms fill in some fields themselves right after they load (EMI amount,
// end date, etc.), so "dirty" can't simply be formik.dirty - that would warn
// about changes the user never made. Instead we snapshot the values shortly
// after each (re)load, once those auto-filled fields have settled, and compare
// against that snapshot.
//
// stateRef.current.isDirty()  -> true if the user changed something since load
// stateRef.current.submit()   -> runs the form's normal "Commit Changes" flow
export const useFormDirty = (formik, stateRef) => {
  const baseline = useRef(null);
  const latestValues = useRef(formik.values);

  // Runs after every render so the refs always hold the current values.
  useEffect(() => {
    latestValues.current = formik.values;
    if (stateRef) {
      stateRef.current = {
        isDirty: () =>
          baseline.current !== null && JSON.stringify(latestValues.current) !== baseline.current,
        submit: () => formik.submitForm(),
      };
    }
  });

  useEffect(() => {
    baseline.current = null;
    const t = setTimeout(() => {
      baseline.current = JSON.stringify(latestValues.current);
    }, 600);
    return () => clearTimeout(t);
  }, [formik.initialValues]);

};
