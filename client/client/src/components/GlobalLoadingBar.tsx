
import { useLoading } from "../context/LoadingContext";
import "./GlobalLoadingBar.css";

export default function GlobalLoadingBar() {
  const { isLoading } = useLoading();

  return (
    <div
      className={`global-loading-track ${isLoading ? "visible" : ""}`}
      role="progressbar"
      aria-label="Loading"
      aria-valuetext={isLoading ? "Loading" : "Complete"}
    >
      <div className="global-loading-progress" />
    </div>
  );
}
