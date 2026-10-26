// Red circled "T": a Weekly or Daily loan that is still Active, whose planned tenure has
// finished, but which still has EMIs not paid in full. `show` comes from the backend
// (backend/utils/tenureOver.js). The solid fill (bg-white; each page's dark mode already
// maps it to the card colour) keeps the red circle crisp on the red-tinted Pending Payments rows.
const TenureOverMark = ({ show }) => {
  if (!show) return null;
  return (
    <span
      role="img"
      aria-label="Tenure over, EMIs still pending"
      className="inline-flex shrink-0 items-center justify-center w-[15px] h-[15px] rounded-full border-[1.5px] border-red-500 bg-white text-[9px] font-bold leading-none text-red-500"
    >
      T
    </span>
  );
};

export default TenureOverMark;
